"""
Unit tests for OpenAIService
"""
import pytest
from unittest.mock import Mock, patch, mock_open
from decimal import Decimal
from datetime import date
import json
import base64

from app.services.openai_service import OpenAIService
from app.schemas.expense import ReceiptProcessingResult


class TestOpenAIService:
    
    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client for testing"""
        with patch('app.services.openai_service.OpenAI') as mock_openai:
            mock_client = Mock()
            mock_openai.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def openai_service(self, mock_openai_client):
        """Create OpenAI service with mocked client"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.openai_api_key = "test_api_key"
            service = OpenAIService()
            service.client = mock_openai_client
            return service
    
    def test_init_with_api_key(self):
        """Test OpenAI service initialization with API key"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.openai_api_key = "test_api_key"
            with patch('app.services.openai_service.OpenAI') as mock_openai:
                service = OpenAIService()
                mock_openai.assert_called_once_with(api_key="test_api_key")
    
    def test_init_without_api_key(self):
        """Test OpenAI service initialization without API key raises error"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.openai_api_key = None
            with pytest.raises(ValueError) as exc_info:
                OpenAIService()
            assert "OpenAI API key not configured" in str(exc_info.value)
    
    @patch('builtins.open', new_callable=mock_open, read_data=b'fake_image_data')
    def test_encode_image_basic(self, mock_file, openai_service):
        """Test basic image encoding"""
        with patch('app.services.openai_service.Image') as mock_image:
            # Mock PIL Image processing
            mock_img = Mock()
            mock_img.mode = 'RGB'
            mock_img.size = (800, 600)
            mock_img_bytes = Mock()
            mock_img_bytes.getvalue.return_value = b'processed_image_data'
            
            mock_image.open.return_value.__enter__.return_value = mock_img
            mock_img.save = Mock()
            
            with patch('io.BytesIO', return_value=mock_img_bytes):
                result = openai_service.encode_image("test_image.jpg")
            
            expected = base64.b64encode(b'processed_image_data').decode('utf-8')
            assert result == expected
    
    @patch('builtins.open', new_callable=mock_open, read_data=b'fake_image_data')
    def test_encode_image_fallback(self, mock_file, openai_service):
        """Test image encoding fallback when PIL fails"""
        with patch('app.services.openai_service.Image') as mock_image:
            # Make PIL processing fail
            mock_image.open.side_effect = Exception("PIL failed")
            
            result = openai_service.encode_image("test_image.jpg")
            
            expected = base64.b64encode(b'fake_image_data').decode('utf-8')
            assert result == expected
    
    def test_extract_receipt_data_image(self, openai_service):
        """Test receipt data extraction for image files"""
        with patch.object(openai_service, '_process_image_receipt') as mock_process:
            expected_result = ReceiptProcessingResult(
                raw_text="Test receipt",
                extracted_amount=Decimal("25.50"),
                suggested_category="Restaurants",
                confidence_score=0.95
            )
            mock_process.return_value = expected_result
            
            result = openai_service.extract_receipt_data("test.jpg", "image/jpeg")
            
            assert result == expected_result
            mock_process.assert_called_once_with("test.jpg")
    
    def test_extract_receipt_data_pdf(self, openai_service):
        """Test receipt data extraction for PDF files"""
        result = openai_service.extract_receipt_data("test.pdf", "application/pdf")
        
        assert result.raw_text == "PDF processing not yet implemented"
        assert result.suggested_category == "Other"
        assert result.confidence_score == 0.0
    
    def test_extract_receipt_data_unsupported(self, openai_service):
        """Test receipt data extraction for unsupported file types"""
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            openai_service.extract_receipt_data("test.txt", "text/plain")
        
        assert exc_info.value.status_code == 400
        assert "Unsupported file type" in str(exc_info.value.detail)
    
    def test_process_image_receipt_success(self, openai_service):
        """Test successful image receipt processing"""
        # Mock the OpenAI API response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''
        {
            "raw_text": "RESTAURANT ABC\\nTotal: $25.50\\nDate: 2024-01-15",
            "amount": "25.50",
            "date": "2024-01-15",
            "merchant": "Restaurant ABC",
            "category": "Restaurants",
            "confidence": "0.95"
        }
        '''
        
        openai_service.client.chat.completions.create.return_value = mock_response
        
        with patch.object(openai_service, 'encode_image', return_value="fake_base64"):
            result = openai_service._process_image_receipt("test.jpg")
        
        assert result.extracted_amount == Decimal("25.50")
        assert result.extracted_date == date(2024, 1, 15)
        assert result.extracted_merchant == "Restaurant ABC"
        assert result.suggested_category == "Restaurants"
        assert result.confidence_score == 0.95
    
    def test_process_image_receipt_no_client(self, openai_service):
        """Test image receipt processing when client is not available"""
        openai_service.client = None
        
        result = openai_service._process_image_receipt("test.jpg")
        
        assert result.raw_text == "OpenAI client not available"
        assert result.suggested_category == "Other"
        assert result.confidence_score == 0.0
    
    def test_process_image_receipt_api_error(self, openai_service):
        """Test image receipt processing when API call fails"""
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        with patch.object(openai_service, 'encode_image', return_value="fake_base64"):
            result = openai_service._process_image_receipt("test.jpg")
        
        assert "OpenAI processing failed" in result.raw_text
        assert result.suggested_category == "Other"
        assert result.confidence_score == 0.0
    
    def test_parse_openai_response_valid_json(self, openai_service):
        """Test parsing valid JSON response from OpenAI"""
        content = '''
        {
            "raw_text": "Test receipt text",
            "amount": "25.50",
            "date": "2024-01-15",
            "merchant": "Test Store",
            "category": "Grocery",
            "confidence": "0.9"
        }
        '''
        
        result = openai_service._parse_openai_response(content)
        
        assert result.raw_text == "Test receipt text"
        assert result.extracted_amount == Decimal("25.50")
        assert result.extracted_date == date(2024, 1, 15)
        assert result.extracted_merchant == "Test Store"
        assert result.suggested_category == "Grocery"
        assert result.confidence_score == 0.9
    
    def test_parse_openai_response_invalid_category(self, openai_service):
        """Test parsing response with invalid category defaults to Other"""
        content = '''
        {
            "raw_text": "Test receipt text",
            "amount": "25.50",
            "category": "InvalidCategory",
            "confidence": "0.9"
        }
        '''
        
        result = openai_service._parse_openai_response(content)
        
        assert result.suggested_category == "Other"
    
    def test_parse_openai_response_invalid_amount(self, openai_service):
        """Test parsing response with invalid amount"""
        content = '''
        {
            "raw_text": "Test receipt text",
            "amount": "invalid_amount",
            "category": "Grocery",
            "confidence": "0.9"
        }
        '''
        
        result = openai_service._parse_openai_response(content)
        
        assert result.extracted_amount is None
    
    def test_parse_openai_response_invalid_date(self, openai_service):
        """Test parsing response with invalid date"""
        content = '''
        {
            "raw_text": "Test receipt text",
            "date": "invalid_date",
            "category": "Grocery",
            "confidence": "0.9"
        }
        '''
        
        result = openai_service._parse_openai_response(content)
        
        assert result.extracted_date is None
    
    def test_parse_openai_response_no_json(self, openai_service):
        """Test parsing response without JSON"""
        content = "This is just plain text without JSON"
        
        result = openai_service._parse_openai_response(content)
        
        assert result.raw_text == content
        assert result.suggested_category == "Other"
        assert result.confidence_score == 0.0
    
    def test_categorize_expense_success(self, openai_service):
        """Test successful expense categorization"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Restaurants"
        
        openai_service.client.chat.completions.create.return_value = mock_response
        
        result = openai_service.categorize_expense("Pizza dinner", Decimal("25.50"))
        
        assert result == "Restaurants"
        openai_service.client.chat.completions.create.assert_called_once()
    
    def test_categorize_expense_no_client(self, openai_service):
        """Test expense categorization when client is not available"""
        openai_service.client = None
        
        result = openai_service.categorize_expense("Pizza dinner")
        
        assert result == "Other"
    
    def test_categorize_expense_api_error(self, openai_service):
        """Test expense categorization when API call fails"""
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        result = openai_service.categorize_expense("Pizza dinner")
        
        assert result == "Other"
    
    def test_categorize_expense_invalid_category_response(self, openai_service):
        """Test expense categorization with invalid category response"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "InvalidCategory"
        
        openai_service.client.chat.completions.create.return_value = mock_response
        
        result = openai_service.categorize_expense("Unknown expense")
        
        assert result == "Other"
    
    def test_categorize_expense_case_insensitive_match(self, openai_service):
        """Test expense categorization with case-insensitive category matching"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "restaurants"  # lowercase
        
        openai_service.client.chat.completions.create.return_value = mock_response
        
        result = openai_service.categorize_expense("Pizza dinner")
        
        assert result == "Restaurants"  # Should match the proper case
    
    def test_categorize_expense_with_quotes(self, openai_service):
        """Test expense categorization response with quotes"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '"Restaurants"'  # With quotes
        
        openai_service.client.chat.completions.create.return_value = mock_response
        
        result = openai_service.categorize_expense("Pizza dinner")
        
        assert result == "Restaurants"
    
    def test_default_categories_list(self, openai_service):
        """Test that default categories are properly defined"""
        expected_categories = [
            "Restaurants", "Housing", "Grocery", "Leisure", "Transportation",
            "Healthcare", "Shopping", "Utilities", "Entertainment", "Other"
        ]
        
        assert openai_service.default_categories == expected_categories
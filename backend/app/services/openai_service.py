import base64
import openai
from typing import Optional, Dict, Any
from pathlib import Path
from decimal import Decimal
from datetime import datetime, date
import re
import json
from fastapi import HTTPException
from ..core.config import settings
from ..schemas.expense import ReceiptProcessingResult


class OpenAIService:
    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        
        # Default categories for expense classification
        self.default_categories = [
            "Restaurants", "Housing", "Grocery", "Leisure", "Transportation",
            "Healthcare", "Shopping", "Utilities", "Entertainment", "Other"
        ]
    
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 for OpenAI Vision API"""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to encode image: {str(e)}")
    
    def extract_receipt_data(self, file_path: str, content_type: str) -> ReceiptProcessingResult:
        """
        Extract expense data from receipt using OpenAI Vision API
        """
        try:
            if content_type.startswith('image/'):
                return self._process_image_receipt(file_path)
            elif content_type == 'application/pdf':
                # For PDF processing, we'd need additional libraries like pdf2image
                # For now, return a basic result
                return ReceiptProcessingResult(
                    raw_text="PDF processing not yet implemented",
                    suggested_category="Other",
                    confidence_score=0.0
                )
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type for processing")
                
        except Exception as e:
            # Return fallback result if OpenAI processing fails
            return ReceiptProcessingResult(
                raw_text=f"Processing failed: {str(e)}",
                suggested_category="Other",
                confidence_score=0.0
            )
    
    def _process_image_receipt(self, image_path: str) -> ReceiptProcessingResult:
        """Process image receipt using OpenAI Vision API"""
        base64_image = self.encode_image(image_path)
        
        prompt = f"""
        Analyze this receipt image and extract the following information:
        1. Total amount spent
        2. Date of purchase (if visible)
        3. Merchant/store name
        4. What category this expense belongs to from: {', '.join(self.default_categories)}
        5. All visible text on the receipt
        
        Return the response as a JSON object with these exact keys:
        {{
            "raw_text": "all visible text from receipt",
            "amount": "total amount as number only (no currency symbols)",
            "date": "date in YYYY-MM-DD format if found, null otherwise",
            "merchant": "merchant name if found, null otherwise",
            "category": "best matching category from the provided list",
            "confidence": "confidence score from 0.0 to 1.0"
        }}
        
        If you cannot clearly read certain information, set those fields to null.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1
            )
            
            # Parse the response
            content = response.choices[0].message.content
            return self._parse_openai_response(content)
            
        except Exception as e:
            # Fallback if OpenAI API fails
            return ReceiptProcessingResult(
                raw_text=f"OpenAI processing failed: {str(e)}",
                suggested_category="Other",
                confidence_score=0.0
            )
    
    def _parse_openai_response(self, content: str) -> ReceiptProcessingResult:
        """Parse OpenAI response and create ReceiptProcessingResult"""
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                # Fallback parsing if no JSON found
                data = {}
            
            # Extract and validate data
            raw_text = data.get('raw_text', content)
            
            # Parse amount
            amount = None
            if data.get('amount'):
                try:
                    amount = Decimal(str(data['amount']).replace('$', '').replace(',', ''))
                except (ValueError, TypeError):
                    amount = None
            
            # Parse date
            expense_date = None
            if data.get('date'):
                try:
                    expense_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    expense_date = None
            
            # Get category (ensure it's in our allowed list)
            suggested_category = data.get('category', 'Other')
            if suggested_category not in self.default_categories:
                suggested_category = 'Other'
            
            # Get confidence score
            confidence = float(data.get('confidence', 0.5))
            confidence = max(0.0, min(1.0, confidence))  # Clamp between 0 and 1
            
            return ReceiptProcessingResult(
                raw_text=raw_text,
                extracted_amount=amount,
                extracted_date=expense_date,
                extracted_merchant=data.get('merchant'),
                suggested_category=suggested_category,
                confidence_score=confidence
            )
            
        except Exception as e:
            # Return basic result if parsing fails
            return ReceiptProcessingResult(
                raw_text=content,
                suggested_category="Other",
                confidence_score=0.0
            )
    
    def categorize_expense(self, description: str, amount: Optional[Decimal] = None) -> str:
        """
        Categorize an expense based on description and amount
        """
        try:
            prompt = f"""
            Categorize this expense into one of these categories: {', '.join(self.default_categories)}
            
            Expense description: {description}
            Amount: ${amount if amount else 'unknown'}
            
            Return only the category name that best matches this expense.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.1
            )
            
            category = response.choices[0].message.content.strip()
            
            # Ensure the category is in our allowed list
            if category in self.default_categories:
                return category
            else:
                return "Other"
                
        except Exception:
            return "Other"
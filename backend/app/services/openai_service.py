import base64
from openai import OpenAI
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
        
        try:
            self.client = OpenAI(api_key=settings.openai_api_key)
        except Exception as e:
            # If there's an issue with client initialization, log it but don't fail
            print(f"Warning: OpenAI client initialization failed: {e}")
            self.client = None
        
        # Default categories for expense classification
        self.default_categories = [
            "Restaurants", "Housing", "Grocery", "Leisure", "Transportation",
            "Healthcare", "Shopping", "Utilities", "Entertainment", "Other"
        ]
    
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 for OpenAI Vision API"""
        try:
            from PIL import Image
            import io
            
            # Open and potentially resize the image to avoid size limits
            with Image.open(image_path) as img:
                # Convert to RGB if necessary (handles RGBA, etc.)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize if too large (OpenAI has size limits)
                max_size = (2048, 2048)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save to bytes
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='JPEG', quality=85)
                img_byte_arr = img_byte_arr.getvalue()
                
                return base64.b64encode(img_byte_arr).decode('utf-8')
                
        except Exception as e:
            # Fallback to original method if PIL processing fails
            try:
                with open(image_path, "rb") as image_file:
                    return base64.b64encode(image_file.read()).decode('utf-8')
            except Exception as fallback_error:
                raise HTTPException(status_code=500, detail=f"Failed to encode image: {str(fallback_error)}")
    
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
        if not self.client:
            return ReceiptProcessingResult(
                raw_text="OpenAI client not available",
                suggested_category="Other",
                confidence_score=0.0
            )
            
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
            # Try with models that support vision/multimodal input
            models_to_try = [
                {"name": "gpt-4o", "max_tokens_param": "max_tokens"},
                {"name": "gpt-4o-mini", "max_tokens_param": "max_tokens"},
                {"name": "gpt-5", "max_tokens_param": "max_completion_tokens"}
            ]
            
            for model_config in models_to_try:
                try:
                    # Prepare the request parameters
                    request_params = {
                        "model": model_config["name"],
                        "messages": [
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
                        model_config["max_tokens_param"]: 1000,
                        "temperature": 0.1
                    }
                    
                    response = self.client.chat.completions.create(**request_params)
                    # If successful, break out of the loop
                    break
                except Exception as model_error:
                    print(f"Model {model_config['name']} failed: {model_error}")
                    if model_config == models_to_try[-1]:  # Last model in the list
                        raise model_error
                    continue
            
            # Parse the response
            content = response.choices[0].message.content
            return self._parse_openai_response(content)
            
        except Exception as e:
            # Log the full error for debugging
            print(f"OpenAI API Error Details: {type(e).__name__}: {str(e)}")
            if hasattr(e, 'response'):
                print(f"Response status: {e.response.status_code if hasattr(e.response, 'status_code') else 'unknown'}")
                print(f"Response text: {e.response.text if hasattr(e.response, 'text') else 'unknown'}")
            
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
        if not self.client:
            return "Other"
            
        try:
            # Enhanced prompt with examples for better categorization
            prompt = f"""
            Categorize this expense into one of these categories: {', '.join(self.default_categories)}
            
            Expense description: {description}
            Amount: ${amount if amount else 'unknown'}
            
            Category guidelines:
            - Restaurants: dining out, takeout, food delivery, cafes, bars
            - Housing: rent, mortgage, utilities, home repairs, furniture
            - Grocery: supermarket, food shopping, household supplies
            - Leisure: entertainment, hobbies, sports, movies, games
            - Transportation: gas, public transit, car maintenance, parking, rideshare
            - Healthcare: medical bills, pharmacy, insurance, dental, vision
            - Shopping: clothing, electronics, personal items, gifts
            - Utilities: electricity, water, internet, phone, streaming services
            - Entertainment: movies, concerts, subscriptions, books
            - Other: anything that doesn't fit the above categories
            
            Return only the category name that best matches this expense. Be precise and choose the most specific category.
            """
            
            # Try with available text models
            models_to_try = [
                {"name": "gpt-4o", "max_tokens_param": "max_tokens"},
                {"name": "gpt-4o-mini", "max_tokens_param": "max_tokens"},
                {"name": "gpt-5", "max_tokens_param": "max_completion_tokens"},
                {"name": "gpt-4-turbo", "max_tokens_param": "max_tokens"}
            ]
            
            for model_config in models_to_try:
                try:
                    request_params = {
                        "model": model_config["name"],
                        "messages": [{"role": "user", "content": prompt}],
                        model_config["max_tokens_param"]: 50,
                        "temperature": 0.1
                    }
                    
                    response = self.client.chat.completions.create(**request_params)
                    break
                except Exception as model_error:
                    print(f"Model {model_config['name']} failed: {model_error}")
                    if model_config == models_to_try[-1]:
                        raise model_error
                    continue
            
            category = response.choices[0].message.content.strip()
            
            # Clean up the response and ensure it's in our allowed list
            category = category.replace('"', '').replace("'", '').strip()
            
            # Try exact match first
            if category in self.default_categories:
                return category
            
            # Try case-insensitive match
            for allowed_category in self.default_categories:
                if category.lower() == allowed_category.lower():
                    return allowed_category
            
            # If no match found, return "Other"
            return "Other"
                
        except Exception as e:
            print(f"OpenAI categorization error: {e}")
            return "Other"
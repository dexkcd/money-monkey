#!/usr/bin/env python3
"""
Test script to check available OpenAI models and test vision functionality
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_models():
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Test models for text completion
    text_models = ["gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
    
    print("Testing text models:")
    for model in text_models:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Hello, just testing if this model works."}],
                max_tokens=10
            )
            print(f"✓ {model}: Working")
        except Exception as e:
            print(f"✗ {model}: {str(e)}")
    
    print("\nTesting vision models:")
    # Test models for vision
    vision_models = ["gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-vision-preview"]
    
    # Simple test image (1x1 red pixel as base64)
    test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    for model in vision_models:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "What color is this image?"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{test_image_b64}",
                                    "detail": "low"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=10
            )
            print(f"✓ {model}: Vision working")
        except Exception as e:
            print(f"✗ {model}: {str(e)}")

if __name__ == "__main__":
    test_models()
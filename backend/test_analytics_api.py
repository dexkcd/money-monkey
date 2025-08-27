#!/usr/bin/env python3
"""
Test script to verify analytics API endpoints
"""
import requests
import json
from datetime import date

# Base URL for the API
BASE_URL = "http://localhost:8000/api/v1"

def test_analytics_endpoints():
    """Test the analytics API endpoints"""
    
    # First, we need to authenticate to get a token
    # Let's try to register/login a test user
    auth_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    print("=== Testing Analytics API Endpoints ===")
    
    # Try to login first
    try:
        login_response = requests.post(f"{BASE_URL}/auth/login", json=auth_data)
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data["access_token"]
            print("✅ Successfully logged in")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print("Response:", login_response.text)
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Set up headers with authentication
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test analytics endpoints
    endpoints_to_test = [
        ("/analytics/spending", "Comprehensive Spending Analytics"),
        ("/analytics/categories", "Spending by Category"),
        ("/analytics/trends", "Monthly Spending Trends"),
        ("/analytics/categories/chart", "Category Chart Data"),
        ("/analytics/budget-comparison", "Budget vs Spending Comparison"),
        ("/analytics/summary?period=month", "Monthly Spending Summary"),
        ("/analytics/recommendations", "AI Recommendations")
    ]
    
    for endpoint, description in endpoints_to_test:
        try:
            print(f"\n--- Testing {description} ---")
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {description}: Success")
                
                # Print some key information from the response
                if endpoint == "/analytics/spending":
                    print(f"   Total expenses: ${data.get('total_expenses', 0)}")
                    print(f"   Expense count: {data.get('expense_count', 0)}")
                    print(f"   Categories: {len(data.get('categories', []))}")
                
                elif endpoint == "/analytics/categories":
                    print(f"   Categories found: {len(data)}")
                    for cat in data[:3]:  # Show first 3
                        print(f"   - {cat['category_name']}: ${cat['total_amount']}")
                
                elif endpoint == "/analytics/trends":
                    print(f"   Trend data points: {len(data.get('labels', []))}")
                    print(f"   Datasets: {len(data.get('datasets', []))}")
                
                elif endpoint == "/analytics/recommendations":
                    recommendations = data.get('recommendations', [])
                    print(f"   Recommendations: {len(recommendations)}")
                    for i, rec in enumerate(recommendations[:2], 1):  # Show first 2
                        print(f"   {i}. {rec['title']} (Priority: {rec['priority']})")
                
                elif "summary" in endpoint:
                    print(f"   Period: {data.get('period')}")
                    print(f"   Total spending: ${data.get('total_spending', 0)}")
                    print(f"   Transaction count: {data.get('transaction_count', 0)}")
                
            else:
                print(f"❌ {description}: Failed with status {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"❌ {description}: Error - {e}")
    
    print("\n=== Analytics API Test Complete ===")

if __name__ == "__main__":
    test_analytics_endpoints()
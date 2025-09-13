#!/usr/bin/env python3
"""
Test to find the correct API structure for Conga
"""

import requests
import json

def get_token():
    """Get access token without scope parameter"""
    token_url = "https://login-preview.congacloud.eu/api/v1/auth/connect/token"
    client_id = "6ebb98c7-dd82-4780-b1ac-c0dc3f7ed43e"
    client_secret = "RK5h@?8gM_-6PEF@4-hzd73W"
    
    token_data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    response = requests.post(token_url, data=token_data, headers=headers, timeout=30)
    
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        return None

def test_swagger_endpoint(token):
    """Test the working swagger endpoint to understand API structure"""
    url = "https://rls-preview.congacloud.eu/api/data/swagger/v1/swagger.json"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    print(f"🔍 Testing swagger endpoint: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Swagger endpoint accessible")
            
            try:
                swagger_data = response.json()
                print(f"   API Title: {swagger_data.get('info', {}).get('title', 'N/A')}")
                print(f"   API Version: {swagger_data.get('info', {}).get('version', 'N/A')}")
                print(f"   Base Path: {swagger_data.get('basePath', 'N/A')}")
                print(f"   Host: {swagger_data.get('host', 'N/A')}")
                
                # Check available paths
                paths = swagger_data.get('paths', {})
                print(f"   Available paths ({len(paths)}):")
                for path in list(paths.keys())[:10]:  # Show first 10 paths
                    methods = list(paths[path].keys())
                    print(f"     {path} [{', '.join(methods)}]")
                
                if len(paths) > 10:
                    print(f"     ... and {len(paths) - 10} more paths")
                
                return swagger_data
                
            except json.JSONDecodeError:
                print("❌ Swagger response is not valid JSON")
                return None
        else:
            print(f"❌ Swagger endpoint failed: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error accessing swagger: {e}")
        return None

def test_api_paths_from_swagger(token, swagger_data):
    """Test actual API paths found in swagger"""
    if not swagger_data or 'paths' not in swagger_data:
        return
    
    base_url = "https://rls-preview.congacloud.eu/api/data"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    paths = swagger_data.get('paths', {})
    
    print(f"\n🌐 Testing actual API paths from swagger documentation:")
    print("=" * 80)
    
    working_endpoints = []
    
    # Test a few key paths
    test_paths = [
        ("/objects", "GET"),
        ("/metadata", "GET"), 
        ("/health", "GET"),
        ("/status", "GET"),
        ("/version", "GET"),
    ]
    
    for path, method in test_paths:
        if path in paths and method.lower() in paths[path]:
            url = f"{base_url}{path}"
            try:
                print(f"Testing: {method} {url}")
                
                response = requests.get(url, headers=headers, timeout=10)
                status = response.status_code
                
                if status < 400:
                    print(f"✅ {status} - {path}")
                    working_endpoints.append((url, status))
                elif status == 401:
                    print(f"🔐 {status} - {path} (Auth required)")
                elif status == 403:
                    print(f"🚫 {status} - {path} (Forbidden)")
                elif status == 404:
                    print(f"❌ {status} - {path} (Not found)")
                else:
                    print(f"⚠️  {status} - {path}")
                    
            except requests.exceptions.RequestException as e:
                print(f"💥 ERROR - {url} ({str(e)[:50]})")
    
    return working_endpoints

def main():
    print("🔍 Analyzing Conga API Structure")
    print("=" * 60)
    
    # Get token
    token = get_token()
    if not token:
        print("❌ Failed to get access token")
        return 1
    
    print("✅ Authentication successful")
    
    # Test swagger endpoint to understand API structure
    swagger_data = test_swagger_endpoint(token)
    
    if swagger_data:
        # Test actual API paths
        working_endpoints = test_api_paths_from_swagger(token, swagger_data)
        
        print(f"\n📊 Summary:")
        print(f"   Authentication: ✅ Working (without scope)")
        print(f"   Swagger endpoint: ✅ Working")
        print(f"   API base URL: https://rls-preview.congacloud.eu/api/data")
        print(f"   Working endpoints: {len(working_endpoints) if working_endpoints else 0}")
        
        # Check if the current background.js configuration is correct
        current_config = "https://rls-preview.congacloud.eu/api/data/v1"
        correct_config = "https://rls-preview.congacloud.eu/api/data"
        
        if current_config != correct_config:
            print(f"\n⚠️  Configuration Issue:")
            print(f"   Current API_BASE_URL: {current_config}")
            print(f"   Correct API_BASE_URL: {correct_config}")
            print(f"   Recommendation: Remove '/v1' from API_BASE_URL")
        
        return 0
    else:
        print("❌ Could not analyze API structure")
        return 1

if __name__ == "__main__":
    exit(main())
#!/usr/bin/env python3
"""
Test the specific v1 API endpoints that the extension is configured to use
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
        # No scope parameter - this was the fix
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    print("🔐 Testing authentication without scope parameter...")
    response = requests.post(token_url, data=token_data, headers=headers, timeout=30)
    
    if response.status_code == 200:
        print("✅ Authentication successful!")
        token_data = response.json()
        print(f"   Token type: {token_data.get('token_type')}")
        print(f"   Expires in: {token_data.get('expires_in')} seconds")
        return token_data.get('access_token')
    else:
        print(f"❌ Authentication failed: {response.status_code} - {response.text}")
        return None

def test_v1_endpoints(token):
    """Test the v1 API endpoints"""
    base_url = "https://rls-preview.congacloud.eu/api/data/v1"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    # Test endpoints that should work with v1 API
    test_endpoints = [
        ("", "GET", "Root v1 endpoint"),
        ("/", "GET", "Root v1 endpoint with slash"),
        ("/swagger", "GET", "Swagger documentation"),
        ("/swagger/v1/swagger.json", "GET", "OpenAPI spec"),
        ("/objects", "GET", "List objects"),
        ("/metadata", "GET", "Metadata endpoint"),
        ("/health", "GET", "Health check"),
        ("/status", "GET", "Status endpoint"),
    ]
    
    print(f"\n🌐 Testing v1 API endpoints at: {base_url}")
    print("=" * 80)
    
    working_endpoints = []
    
    for endpoint, method, description in test_endpoints:
        url = f"{base_url}{endpoint}"
        try:
            print(f"Testing: {method} {url}")
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            else:
                response = requests.request(method, url, headers=headers, timeout=10)
            
            status = response.status_code
            
            if status < 400:
                print(f"✅ {status} - {description}")
                working_endpoints.append((url, status, response.text[:200]))
            elif status == 401:
                print(f"🔐 {status} - {description} (Auth required)")
            elif status == 403:
                print(f"🚫 {status} - {description} (Forbidden)")
            elif status == 404:
                print(f"❌ {status} - {description} (Not found)")
            else:
                print(f"⚠️  {status} - {description}")
                
        except requests.exceptions.RequestException as e:
            print(f"💥 ERROR - {url} ({str(e)[:50]})")
    
    print("\n" + "=" * 80)
    print("WORKING V1 ENDPOINTS:")
    print("=" * 80)
    
    if working_endpoints:
        for url, status, content in working_endpoints:
            print(f"\n✅ {status} - {url}")
            if content.strip():
                try:
                    # Try to parse as JSON
                    data = json.loads(content)
                    print(f"   JSON Response: {json.dumps(data, indent=2)[:300]}...")
                except:
                    print(f"   Response: {content[:200]}...")
    else:
        print("❌ No working v1 endpoints found!")
    
    return len(working_endpoints) > 0

def main():
    print("🔍 Testing Conga Inspector v1 API Endpoints")
    print("=" * 60)
    
    # Test authentication without scope
    token = get_token()
    if not token:
        print("❌ Failed to get access token")
        return 1
    
    print(f"✅ Got access token: {token[:50]}...")
    
    # Test v1 endpoints
    success = test_v1_endpoints(token)
    
    if success:
        print("\n🎉 V1 API endpoints are accessible!")
        return 0
    else:
        print("\n❌ V1 API endpoints are not accessible")
        return 1

if __name__ == "__main__":
    exit(main())
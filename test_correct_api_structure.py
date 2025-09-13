#!/usr/bin/env python3
"""
Test the correct API structure based on swagger documentation
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

def test_correct_api_endpoints(token):
    """Test API endpoints with correct structure"""
    base_url = "https://rls-preview.congacloud.eu/api/data"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    # Test endpoints based on swagger documentation
    test_endpoints = [
        ("/v1/currencies", "GET", "Get currencies"),
        ("/v1/objects/Account", "GET", "Get Account objects"),
        ("/v1/objects/Contact", "GET", "Get Contact objects"),
        ("/v1/objects/Opportunity", "GET", "Get Opportunity objects"),
        ("/v1/objects/Lead", "GET", "Get Lead objects"),
        ("/v1/objects/Case", "GET", "Get Case objects"),
        ("/swagger", "GET", "Swagger UI"),
        ("/swagger/v1/swagger.json", "GET", "OpenAPI spec"),
    ]
    
    print(f"🌐 Testing correct API structure:")
    print(f"Base URL: {base_url}")
    print("=" * 80)
    
    working_endpoints = []
    
    for endpoint, method, description in test_endpoints:
        url = f"{base_url}{endpoint}"
        try:
            print(f"Testing: {method} {url}")
            
            response = requests.get(url, headers=headers, timeout=10)
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
    print("WORKING ENDPOINTS:")
    print("=" * 80)
    
    if working_endpoints:
        for url, status, content in working_endpoints:
            print(f"\n✅ {status} - {url}")
            if content.strip():
                try:
                    # Try to parse as JSON
                    data = json.loads(content)
                    if isinstance(data, list):
                        print(f"   JSON Array with {len(data)} items")
                        if len(data) > 0:
                            print(f"   First item keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'N/A'}")
                    else:
                        print(f"   JSON Response: {json.dumps(data, indent=2)[:300]}...")
                except:
                    print(f"   Response: {content[:200]}...")
    else:
        print("❌ No working endpoints found!")
    
    return len(working_endpoints) > 0

def main():
    print("🔍 Testing Correct Conga API Structure")
    print("=" * 60)
    
    # Test authentication
    token = get_token()
    if not token:
        print("❌ Failed to get access token")
        return 1
    
    print("✅ Authentication successful (without scope parameter)")
    
    # Test correct API structure
    success = test_correct_api_endpoints(token)
    
    print(f"\n📊 Final Assessment:")
    print(f"   ✅ Authentication fix: Working (scope parameter removed)")
    print(f"   {'✅' if success else '❌'} API endpoints: {'Working' if success else 'Not working'}")
    
    if success:
        print(f"   ✅ Correct API base URL: https://rls-preview.congacloud.eu/api/data")
        print(f"   ⚠️  Current extension config has '/v1' which should be removed")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
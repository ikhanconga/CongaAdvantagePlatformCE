#!/usr/bin/env python3
"""
Test various Conga API endpoints to find working ones
"""

import requests
import json

# Get token first
def get_token():
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
        print(f"Token request failed: {response.status_code} - {response.text}")
        return None

def test_endpoints(token):
    """Test various API endpoints"""
    base_urls = [
        "https://rls-preview.congacloud.eu",
        "https://rls-preview.congacloud.eu/api",
        "https://rls-preview.congacloud.eu/api/data",
        "https://rls-preview.congacloud.eu/api/v1",
    ]
    
    endpoints = [
        "",
        "/",
        "/health",
        "/status", 
        "/ping",
        "/objects",
        "/metadata",
        "/data",
        "/records",
        "/entities",
        "/schema",
        "/info",
        "/version",
        "/api-docs",
        "/swagger",
        "/openapi.json"
    ]
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Test/1.0'
    }
    
    print("Testing API endpoints...")
    print("=" * 80)
    
    working_endpoints = []
    
    for base_url in base_urls:
        print(f"\nTesting base URL: {base_url}")
        print("-" * 50)
        
        for endpoint in endpoints:
            url = f"{base_url}{endpoint}"
            try:
                response = requests.get(url, headers=headers, timeout=10)
                status = response.status_code
                
                if status < 400:
                    print(f"✅ {status} - {url}")
                    working_endpoints.append((url, status, response.text[:200]))
                elif status == 401:
                    print(f"🔐 {status} - {url} (Auth required)")
                elif status == 403:
                    print(f"🚫 {status} - {url} (Forbidden)")
                elif status == 404:
                    print(f"❌ {status} - {url} (Not found)")
                else:
                    print(f"⚠️  {status} - {url}")
                    
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
                    print(f"   JSON Response: {json.dumps(data, indent=2)[:300]}...")
                except:
                    print(f"   Response: {content[:200]}...")
    else:
        print("No working endpoints found!")

def main():
    print("🔍 Testing Conga API Endpoints")
    print("=" * 50)
    
    # Get access token
    token = get_token()
    if not token:
        print("❌ Failed to get access token")
        return 1
    
    print(f"✅ Got access token: {token[:50]}...")
    
    # Test endpoints
    test_endpoints(token)
    
    return 0

if __name__ == "__main__":
    main()
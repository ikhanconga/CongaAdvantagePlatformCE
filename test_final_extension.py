#!/usr/bin/env python3
"""
Final test of the Conga Inspector extension with corrected configuration
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
        # No scope parameter (Fix #1)
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

def simulate_extension_api_calls(token):
    """Simulate the API calls that the extension would make"""
    # This is the corrected base URL (Fix #2)
    base_url = "https://rls-preview.congacloud.eu/api/data"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Conga-Inspector-Extension/1.0'
    }
    
    # Simulate typical extension API calls
    test_scenarios = [
        {
            'name': 'Get API Configuration',
            'endpoint': '/swagger/v1/swagger.json',
            'method': 'GET',
            'description': 'Extension loads API configuration'
        },
        {
            'name': 'List Available Objects',
            'endpoint': '/v1/currencies',
            'method': 'GET', 
            'description': 'Extension discovers available objects'
        },
        {
            'name': 'Query Account Data',
            'endpoint': '/v1/objects/Account?limit=5',
            'method': 'GET',
            'description': 'User queries Account data'
        },
        {
            'name': 'Query Contact Data',
            'endpoint': '/v1/objects/Contact?limit=5',
            'method': 'GET',
            'description': 'User queries Contact data'
        },
        {
            'name': 'Get Account Summary',
            'endpoint': '/v1/objects/Account/summary',
            'method': 'GET',
            'description': 'User views Account metadata'
        }
    ]
    
    print(f"🔧 Simulating Extension API Calls")
    print(f"Base URL: {base_url}")
    print("=" * 80)
    
    results = []
    
    for scenario in test_scenarios:
        url = f"{base_url}{scenario['endpoint']}"
        
        try:
            print(f"\n📋 {scenario['name']}")
            print(f"   URL: {url}")
            print(f"   Description: {scenario['description']}")
            
            response = requests.get(url, headers=headers, timeout=10)
            status = response.status_code
            
            if status < 400:
                print(f"   ✅ Success ({status})")
                
                try:
                    data = response.json()
                    if 'Data' in data:
                        record_count = len(data['Data']) if isinstance(data['Data'], list) else 1
                        print(f"   📊 Records: {record_count}")
                    elif 'RecordCount' in data:
                        print(f"   📊 Records: {data['RecordCount']}")
                except:
                    print(f"   📄 Response: HTML/Text content")
                
                results.append({'scenario': scenario['name'], 'status': 'success', 'code': status})
            else:
                print(f"   ❌ Failed ({status})")
                results.append({'scenario': scenario['name'], 'status': 'failed', 'code': status})
                
        except requests.exceptions.RequestException as e:
            print(f"   💥 Error: {str(e)[:50]}")
            results.append({'scenario': scenario['name'], 'status': 'error', 'error': str(e)})
    
    return results

def main():
    print("🚀 Final Conga Inspector Extension Test")
    print("=" * 60)
    
    print("🔍 Testing Applied Fixes:")
    print("   Fix #1: Removed scope parameter from authentication")
    print("   Fix #2: Corrected API_BASE_URL to remove /v1 suffix")
    print()
    
    # Test authentication
    print("🔐 Testing Authentication...")
    token = get_token()
    if not token:
        print("❌ Authentication failed")
        return 1
    
    print("✅ Authentication successful")
    
    # Simulate extension usage
    results = simulate_extension_api_calls(token)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    
    successful = [r for r in results if r['status'] == 'success']
    failed = [r for r in results if r['status'] == 'failed']
    errors = [r for r in results if r['status'] == 'error']
    
    print(f"Total scenarios tested: {len(results)}")
    print(f"✅ Successful: {len(successful)}")
    print(f"❌ Failed: {len(failed)}")
    print(f"💥 Errors: {len(errors)}")
    
    if failed:
        print(f"\nFailed scenarios:")
        for result in failed:
            print(f"  - {result['scenario']} (HTTP {result['code']})")
    
    if errors:
        print(f"\nError scenarios:")
        for result in errors:
            print(f"  - {result['scenario']} ({result.get('error', 'Unknown error')})")
    
    success_rate = len(successful) / len(results) * 100
    
    print(f"\n🎯 Overall Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Extension fixes are working well!")
        print("\n✅ VERIFICATION COMPLETE:")
        print("   ✅ Authentication works without scope parameter")
        print("   ✅ API endpoints are accessible with corrected base URL")
        print("   ✅ Extension should function properly")
        return 0
    else:
        print("⚠️  Some issues remain")
        return 1

if __name__ == "__main__":
    exit(main())
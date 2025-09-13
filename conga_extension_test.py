#!/usr/bin/env python3
"""
Conga Inspector Chrome Extension Test Suite

This script tests the Conga Inspector Chrome Extension for:
1. Structure validation
2. Authentication flow
3. API connectivity
4. Code quality checks
"""

import json
import os
import sys
import requests
from pathlib import Path
import re
from datetime import datetime

class CongaExtensionTester:
    def __init__(self, extension_path="/app/conga-inspector"):
        self.extension_path = Path(extension_path)
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []
        self.warnings = []
        
        # Conga API Configuration
        self.client_id = "6ebb98c7-dd82-4780-b1ac-c0dc3f7ed43e"
        self.client_secret = "RK5h@?8gM_-6PEF@4-hzd73W"
        self.token_url = "https://login-preview.congacloud.eu/api/v1/auth/connect/token"
        self.api_base_url = "https://rls-preview.congacloud.eu/api/data"
        
        self.access_token = None

    def log_test(self, name, success, message=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if message:
            print(f"    {message}")
        
        if success:
            self.tests_passed += 1
        else:
            self.errors.append(f"{name}: {message}")

    def log_warning(self, message):
        """Log warning"""
        print(f"⚠️  WARNING - {message}")
        self.warnings.append(message)

    def test_file_structure(self):
        """Test 1: Validate extension file structure"""
        print("\n🔍 Testing Extension File Structure...")
        
        required_files = [
            "manifest.json",
            "background.js", 
            "popup.html",
            "popup.js",
            "sidepanel.html",
            "sidepanel.js",
            "content.js",
            "inject.js",
            "options.html",
            "options.js"
        ]
        
        required_dirs = [
            "icons",
            "styles"
        ]
        
        # Check required files
        for file_name in required_files:
            file_path = self.extension_path / file_name
            exists = file_path.exists()
            self.log_test(
                f"File exists: {file_name}",
                exists,
                f"Path: {file_path}" if exists else f"Missing: {file_path}"
            )
        
        # Check required directories
        for dir_name in required_dirs:
            dir_path = self.extension_path / dir_name
            exists = dir_path.exists() and dir_path.is_dir()
            self.log_test(
                f"Directory exists: {dir_name}",
                exists,
                f"Path: {dir_path}" if exists else f"Missing: {dir_path}"
            )
        
        # Check icon files
        icon_sizes = ["16", "32", "48", "128"]
        for size in icon_sizes:
            icon_path = self.extension_path / "icons" / f"icon{size}.png"
            exists = icon_path.exists()
            self.log_test(
                f"Icon exists: icon{size}.png",
                exists,
                f"Path: {icon_path}" if exists else f"Missing: {icon_path}"
            )

    def test_manifest_validation(self):
        """Test 2: Validate manifest.json"""
        print("\n📋 Testing Manifest Validation...")
        
        manifest_path = self.extension_path / "manifest.json"
        
        if not manifest_path.exists():
            self.log_test("Manifest file exists", False, "manifest.json not found")
            return
        
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            self.log_test("Manifest JSON valid", True, "Successfully parsed JSON")
            
            # Check required fields
            required_fields = {
                "manifest_version": (int, 3),
                "name": (str, None),
                "version": (str, None),
                "description": (str, None),
                "permissions": (list, None),
                "host_permissions": (list, None),
                "background": (dict, None),
                "content_scripts": (list, None),
                "action": (dict, None)
            }
            
            for field, (expected_type, expected_value) in required_fields.items():
                if field in manifest:
                    if expected_value is not None:
                        valid = isinstance(manifest[field], expected_type) and manifest[field] == expected_value
                    else:
                        valid = isinstance(manifest[field], expected_type)
                    
                    self.log_test(
                        f"Manifest field '{field}' valid",
                        valid,
                        f"Type: {type(manifest[field])}, Value: {manifest[field]}"
                    )
                else:
                    self.log_test(f"Manifest field '{field}' exists", False, f"Missing required field")
            
            # Check permissions
            required_permissions = ["storage", "activeTab", "scripting", "background", "sidePanel"]
            actual_permissions = manifest.get("permissions", [])
            
            for perm in required_permissions:
                has_perm = perm in actual_permissions
                self.log_test(
                    f"Permission '{perm}' granted",
                    has_perm,
                    f"Required for extension functionality"
                )
            
            # Check host permissions for Conga domains
            host_permissions = manifest.get("host_permissions", [])
            required_hosts = ["https://*.congacloud.eu/*"]
            
            for host in required_hosts:
                has_host = any(host in hp for hp in host_permissions)
                self.log_test(
                    f"Host permission for Conga domains",
                    has_host,
                    f"Required: {host}"
                )
                
        except json.JSONDecodeError as e:
            self.log_test("Manifest JSON valid", False, f"JSON parse error: {e}")
        except Exception as e:
            self.log_test("Manifest validation", False, f"Error: {e}")

    def test_authentication_flow(self):
        """Test 3: Test OAuth2 authentication with Conga"""
        print("\n🔐 Testing Authentication Flow...")
        
        try:
            # Test token endpoint accessibility
            response = requests.get(self.token_url.replace('/token', ''), timeout=10)
            self.log_test(
                "Token endpoint accessible",
                response.status_code < 500,
                f"Status: {response.status_code}"
            )
        except requests.exceptions.RequestException as e:
            self.log_test("Token endpoint accessible", False, f"Connection error: {e}")
            return
        
        # Test OAuth2 token request with different scopes
        scopes_to_test = [
            'data:read data:write',
            'read write',
            'api',
            'full_access',
            ''  # No scope
        ]
        
        for scope in scopes_to_test:
            try:
                token_data = {
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                }
                
                if scope:
                    token_data['scope'] = scope
                
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Conga-Inspector-Test/1.0'
                }
                
                print(f"    Testing scope: '{scope}' from: {self.token_url}")
                
                response = requests.post(
                    self.token_url,
                    data=token_data,
                    headers=headers,
                    timeout=30
                )
                
                scope_label = scope if scope else 'no-scope'
                success = response.status_code == 200
                
                self.log_test(
                    f"OAuth2 token request (scope: {scope_label})",
                    success,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
                if success:
                    try:
                        token_response = response.json()
                        self.access_token = token_response.get('access_token')
                        
                        required_fields = ['access_token', 'token_type', 'expires_in']
                        for field in required_fields:
                            has_field = field in token_response
                            self.log_test(
                                f"Token response has '{field}' (scope: {scope_label})",
                                has_field,
                                f"Value: {token_response.get(field, 'N/A')}"
                            )
                        
                        # Validate token format (should be JWT or similar)
                        if self.access_token:
                            token_valid = len(self.access_token) > 50  # Basic length check
                            self.log_test(
                                f"Access token format valid (scope: {scope_label})",
                                token_valid,
                                f"Token length: {len(self.access_token)}"
                            )
                            break  # Stop testing other scopes if we got a valid token
                            
                    except json.JSONDecodeError:
                        self.log_test(f"Token response JSON valid (scope: {scope_label})", False, "Invalid JSON response")
                
            except requests.exceptions.Timeout:
                self.log_test(f"OAuth2 token request (scope: {scope_label})", False, "Request timeout (30s)")
            except requests.exceptions.RequestException as e:
                self.log_test(f"OAuth2 token request (scope: {scope_label})", False, f"Request error: {e}")

    def test_api_connectivity(self):
        """Test 4: Test API connectivity with authenticated requests"""
        print("\n🌐 Testing API Connectivity...")
        
        if not self.access_token:
            self.log_test("API connectivity test", False, "No access token available")
            return
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'Conga-Inspector-Test/1.0'
        }
        
        # Test endpoints
        test_endpoints = [
            ('/objects', 'GET', 'List objects'),
            ('/objects/metadata', 'GET', 'Get metadata'),
        ]
        
        for endpoint, method, description in test_endpoints:
            try:
                url = f"{self.api_base_url}{endpoint}"
                print(f"    Testing: {method} {url}")
                
                if method == 'GET':
                    response = requests.get(url, headers=headers, timeout=30)
                else:
                    response = requests.request(method, url, headers=headers, timeout=30)
                
                success = response.status_code in [200, 201, 202, 204]
                self.log_test(
                    f"API {method} {endpoint}",
                    success,
                    f"Status: {response.status_code}, Description: {description}"
                )
                
                if success and response.content:
                    try:
                        data = response.json()
                        self.log_test(
                            f"API response JSON valid ({endpoint})",
                            True,
                            f"Response type: {type(data)}"
                        )
                    except json.JSONDecodeError:
                        self.log_warning(f"API response not JSON for {endpoint}")
                        
            except requests.exceptions.Timeout:
                self.log_test(f"API {method} {endpoint}", False, "Request timeout (30s)")
            except requests.exceptions.RequestException as e:
                self.log_test(f"API {method} {endpoint}", False, f"Request error: {e}")

    def test_code_quality(self):
        """Test 5: Check code quality and syntax"""
        print("\n🔧 Testing Code Quality...")
        
        # Test JavaScript files for basic syntax issues
        js_files = [
            "background.js",
            "popup.js", 
            "sidepanel.js",
            "content.js",
            "inject.js",
            "options.js"
        ]
        
        for js_file in js_files:
            file_path = self.extension_path / js_file
            if not file_path.exists():
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic syntax checks
                has_syntax_errors = False
                error_patterns = [
                    r'console\.error\s*\(',  # Check for error handling
                    r'try\s*{',  # Check for try-catch blocks
                    r'catch\s*\(',  # Check for error handling
                ]
                
                has_error_handling = any(re.search(pattern, content) for pattern in error_patterns)
                self.log_test(
                    f"Error handling in {js_file}",
                    has_error_handling,
                    "Has try-catch or console.error statements"
                )
                
                # Check for hardcoded credentials (should be in background.js only)
                if js_file != "background.js":
                    has_hardcoded_creds = any(cred in content for cred in [self.client_id, self.client_secret])
                    self.log_test(
                        f"No hardcoded credentials in {js_file}",
                        not has_hardcoded_creds,
                        "Credentials should only be in background.js"
                    )
                
                # Check for Chrome extension API usage
                chrome_apis = ['chrome.runtime', 'chrome.storage', 'chrome.tabs']
                uses_chrome_apis = any(api in content for api in chrome_apis)
                
                if js_file in ['background.js', 'popup.js', 'sidepanel.js', 'content.js']:
                    self.log_test(
                        f"Uses Chrome APIs in {js_file}",
                        uses_chrome_apis,
                        "Extension should use Chrome APIs"
                    )
                
                # Check file size (warn if too large)
                file_size = len(content)
                if file_size > 100000:  # 100KB
                    self.log_warning(f"{js_file} is large ({file_size} bytes)")
                
            except Exception as e:
                self.log_test(f"Code quality check for {js_file}", False, f"Error reading file: {e}")
        
        # Test HTML files
        html_files = ["popup.html", "sidepanel.html", "options.html"]
        
        for html_file in html_files:
            file_path = self.extension_path / html_file
            if not file_path.exists():
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic HTML validation
                has_doctype = content.strip().startswith('<!DOCTYPE html>')
                self.log_test(
                    f"HTML5 doctype in {html_file}",
                    has_doctype,
                    "Should start with <!DOCTYPE html>"
                )
                
                # Check for required meta tags
                has_charset = 'charset="UTF-8"' in content
                self.log_test(
                    f"UTF-8 charset in {html_file}",
                    has_charset,
                    "Should specify UTF-8 encoding"
                )
                
                # Check for corresponding JS file reference
                js_ref = html_file.replace('.html', '.js')
                has_js_ref = js_ref in content
                self.log_test(
                    f"JavaScript reference in {html_file}",
                    has_js_ref,
                    f"Should reference {js_ref}"
                )
                
            except Exception as e:
                self.log_test(f"HTML validation for {html_file}", False, f"Error reading file: {e}")

    def test_css_files(self):
        """Test 6: Check CSS files exist and are valid"""
        print("\n🎨 Testing CSS Files...")
        
        css_files = ["popup.css", "sidepanel.css", "options.css"]
        styles_dir = self.extension_path / "styles"
        
        for css_file in css_files:
            file_path = styles_dir / css_file
            exists = file_path.exists()
            
            self.log_test(
                f"CSS file exists: {css_file}",
                exists,
                f"Path: {file_path}"
            )
            
            if exists:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Basic CSS validation
                    has_content = len(content.strip()) > 0
                    self.log_test(
                        f"CSS file has content: {css_file}",
                        has_content,
                        f"Size: {len(content)} bytes"
                    )
                    
                    # Check for basic CSS structure
                    has_selectors = '{' in content and '}' in content
                    self.log_test(
                        f"CSS syntax valid: {css_file}",
                        has_selectors,
                        "Contains CSS selectors"
                    )
                    
                except Exception as e:
                    self.log_test(f"CSS validation for {css_file}", False, f"Error reading file: {e}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Conga Inspector Extension Tests")
        print("=" * 60)
        
        start_time = datetime.now()
        
        # Run all test suites
        self.test_file_structure()
        self.test_manifest_validation()
        self.test_authentication_flow()
        self.test_api_connectivity()
        self.test_code_quality()
        self.test_css_files()
        
        # Print summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if self.warnings:
            print(f"\n⚠️  Warnings ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        if self.errors:
            print(f"\n❌ Errors ({len(self.errors)}):")
            for error in self.errors:
                print(f"  - {error}")
        
        # Overall result
        success_rate = (self.tests_passed / self.tests_run) * 100
        if success_rate >= 90:
            print(f"\n🎉 OVERALL RESULT: EXCELLENT ({success_rate:.1f}%)")
            return 0
        elif success_rate >= 75:
            print(f"\n✅ OVERALL RESULT: GOOD ({success_rate:.1f}%)")
            return 0
        elif success_rate >= 50:
            print(f"\n⚠️  OVERALL RESULT: NEEDS IMPROVEMENT ({success_rate:.1f}%)")
            return 1
        else:
            print(f"\n❌ OVERALL RESULT: POOR ({success_rate:.1f}%)")
            return 1

def main():
    """Main function"""
    tester = CongaExtensionTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
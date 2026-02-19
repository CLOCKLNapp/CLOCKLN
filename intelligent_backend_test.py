#!/usr/bin/env python3
"""
CLOCKLN Intelligent Edition Backend Test
Tests the intelligent features specifically with the correct credentials
"""

import requests
import json
import time
from datetime import datetime

class IntelligentTester:
    def __init__(self, base_url="https://clockln-plans.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
    
    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
                if len(str(response_data)) > 300:
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                else:
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
            except:
                response_data = {"raw_response": response.text[:200]}
                print(f"   Response Text: {response.text[:200]}...")

            details = f"Status: {response.status_code} (expected {expected_status})"
            self.log_result(name, success, details)
            
            return success, response_data

        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"   ❌ Error: {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {}

    def login_intelligent(self):
        """Login with intelligent plan credentials"""
        success, response = self.run_test(
            "Login Intelligent Plan User",
            "POST", 
            "/api/auth/login",
            200,
            data={"email": "hr@intelligenttest.com", "password": "Test123456"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token acquired for intelligent user")
            return True, response
        return False, response

    def test_intelligent_dashboard(self):
        """Test intelligent dashboard access"""
        return self.run_test("Intelligent Dashboard", "GET", "/api/intelligent/dashboard", 200)

    def test_ai_command(self):
        """Test AI command processing"""
        return self.run_test(
            "AI Command Processing", 
            "POST", 
            "/api/ai/command",
            200,
            data={
                "command": "Add 2 vacation days for employee hr@intelligenttest.com",
                "target_employee_email": "hr@intelligenttest.com"
            }
        )

    def test_compliance_check(self):
        """Test compliance check"""
        return self.run_test("Compliance Check", "GET", "/api/compliance/check", 200)

    def test_subscription_status(self):
        """Test subscription status"""
        return self.run_test("Subscription Status", "GET", "/api/subscription/current", 200)

def main():
    print("🤖 CLOCKLN Intelligent Edition Test Suite")
    print("=" * 50)
    
    tester = IntelligentTester()
    
    # Login with intelligent plan credentials
    print("\n🔐 Testing Intelligent Plan Authentication...")
    login_success, login_response = tester.login_intelligent()
    
    if not login_success:
        print("\n❌ Could not login with intelligent plan credentials")
        return 1
    
    # Test subscription status
    print("\n💰 Testing Subscription Status...")
    sub_success, sub_response = tester.test_subscription_status()
    if sub_success and 'plan' in sub_response:
        plan = sub_response['plan']
        print(f"   📊 Current plan: {plan}")
        if plan == 'intelligent':
            print(f"   ✅ Intelligent plan confirmed!")
        else:
            print(f"   ⚠️ Expected intelligent plan, got: {plan}")
    
    # Test intelligent features
    print("\n🤖 Testing Intelligent Features...")
    tester.test_intelligent_dashboard()
    
    print("\n🧠 Testing AI Command...")
    ai_success, ai_response = tester.test_ai_command()
    if ai_success:
        print("   🎯 AI Command processed successfully")
        if 'command_id' in ai_response:
            print(f"   🆔 Command ID: {ai_response['command_id']}")
    
    print("\n🛡️ Testing Compliance Check...")
    comp_success, comp_response = tester.test_compliance_check()
    if comp_success:
        print("   ✅ Compliance check completed")
        if 'checked_employees' in comp_response:
            print(f"   👥 Checked {comp_response['checked_employees']} employees")
    
    # Results
    print("\n" + "=" * 50)
    print(f"📊 INTELLIGENT TESTS: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All intelligent features working!")
        return 0
    else:
        print("❌ Some intelligent features failed")
        return 1

if __name__ == "__main__":
    exit(main())
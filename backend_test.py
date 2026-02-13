#!/usr/bin/env python3
"""
CLOCKLN Backend API Test Suite
Tests all API endpoints for the corporate time tracking system
"""

import requests
import sys
import json
from datetime import datetime
import time

class CLOCKLNAPITester:
    def __init__(self, base_url="https://clockln-timeclock.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
    
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
            except:
                response_data = {"raw_response": response.text[:200]}
                print(f"   Response Text: {response.text[:200]}...")

            details = f"Status: {response.status_code} (expected {expected_status})"
            self.log_result(name, success, details, response_data)
            
            return success, response_data

        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"   ❌ Error: {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "/api/health", 200)

    def test_login(self, email="admin@techcorp.com", password="admin123"):
        """Test login and store token"""
        success, response = self.run_test(
            "User Login",
            "POST", 
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token acquired: {self.token[:20]}...")
            return True, response
        return False, response

    def test_get_me(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "/api/auth/me", 200)

    def test_qr_generate(self):
        """Test QR code generation (HR only)"""
        return self.run_test("Generate QR Code", "POST", "/api/qr/generate", 200)

    def test_qr_current(self):
        """Test getting current QR code"""
        return self.run_test("Get Current QR Code", "GET", "/api/qr/current", 200)

    def test_clock_status(self):
        """Test getting clock status"""
        return self.run_test("Get Clock Status", "GET", "/api/clock/status", 200)

    def test_clock_scan(self, qr_code):
        """Test clock in/out via QR code"""
        return self.run_test(
            "Clock Scan", 
            "POST", 
            "/api/clock/scan", 
            200,
            data={"qr_code": qr_code}
        )

    def test_employee_dashboard(self):
        """Test employee dashboard data"""
        return self.run_test("Employee Dashboard", "GET", "/api/dashboard/employee", 200)

    def test_hr_dashboard(self):
        """Test HR dashboard data"""
        return self.run_test("HR Dashboard", "GET", "/api/dashboard/hr", 200)

    def test_get_company(self):
        """Test getting company info"""
        return self.run_test("Get Company Info", "GET", "/api/company", 200)

    def test_list_users(self):
        """Test listing users (HR only)"""
        return self.run_test("List Users", "GET", "/api/users", 200)

    def test_clock_history(self):
        """Test getting clock history"""
        return self.run_test("Clock History", "GET", "/api/clock/history", 200)

    def test_update_language(self, language="pt"):
        """Test updating user language"""
        return self.run_test(
            "Update Language", 
            "PATCH", 
            f"/api/settings/language?language={language}", 
            200
        )

    def test_my_absences(self):
        """Test getting user's absences and vacation info"""
        return self.run_test("Get My Absences", "GET", "/api/absences/my", 200)

    def test_vacation_requests_list(self):
        """Test getting vacation requests (HR only)"""
        return self.run_test("List Vacation Requests", "GET", "/api/vacation/requests", 200)

    def test_totem_recent_events(self):
        """Test getting recent totem events"""
        return self.run_test("Get Totem Recent Events", "GET", "/api/totem/recent-events", 200)

    def test_request_vacation(self):
        """Test requesting vacation"""
        from datetime import datetime, timedelta
        start_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")
        
        return self.run_test(
            "Request Vacation",
            "POST", 
            "/api/vacation/request",
            200,
            data={
                "start_date": start_date,
                "end_date": end_date,
                "reason": "Testing vacation request"
            }
        )

    def test_export_csv(self):
        """Test CSV export functionality"""
        from datetime import datetime
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            "Export CSV Report",
            "GET", 
            f"/api/reports/export/csv?start_date={start_date}&end_date={end_date}",
            200
        )
        return success, response

def main():
    print("=" * 60)
    print("🕐 CLOCKLN Backend API Test Suite")
    print("=" * 60)
    
    tester = CLOCKLNAPITester()
    
    # Test 1: Health Check
    print("\n📋 Testing Basic Connectivity...")
    tester.test_health_check()
    
    # Test 2: Authentication
    print("\n🔐 Testing Authentication...")
    login_success, login_response = tester.test_login()
    
    if not login_success:
        print("\n❌ Login failed - cannot continue with authenticated tests")
        tester.log_result("Overall Test Suite", False, "Login failed - stopping tests")
        print(f"\n📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        return 1
    
    # Test 3: User Info
    tester.test_get_me()
    tester.test_get_company()
    
    # Test 4: QR Code System
    print("\n📱 Testing QR Code System...")
    qr_success, qr_response = tester.test_qr_generate()
    tester.test_qr_current()
    
    # Test 5: Clock System
    print("\n⏰ Testing Clock System...")
    tester.test_clock_status()
    
    # Test clock scan if we have a QR code
    if qr_success and 'code' in qr_response:
        print(f"   📱 Testing clock scan with QR: {qr_response['code'][:10]}...")
        tester.test_clock_scan(qr_response['code'])
    
    tester.test_clock_history()
    
    # Test 6: Dashboard Data
    print("\n📊 Testing Dashboard APIs...")
    tester.test_employee_dashboard()
    tester.test_hr_dashboard()
    
    # Test 7: User Management
    print("\n👥 Testing User Management...")
    tester.test_list_users()
    
    # Test 8: Settings
    print("\n⚙️ Testing Settings...")
    tester.test_update_language()
    
    # Results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"📈 Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Save detailed results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"/tmp/clockln_test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": f"{(tester.tests_passed/tester.tests_run)*100:.1f}%",
                "timestamp": timestamp
            },
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"📄 Detailed results saved to: {results_file}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_tests = [r for r in tester.test_results if not r['success']]
        print(f"\n❌ {len(failed_tests)} tests failed:")
        for test in failed_tests:
            print(f"   - {test['test']}: {test['details']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
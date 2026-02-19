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
    def __init__(self, base_url="https://clockln-plans.preview.emergentagent.com"):
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

    def test_get_my_notifications(self):
        """Test getting user notifications"""
        return self.run_test("Get My Notifications", "GET", "/api/notifications/my", 200)

    def test_create_notification(self):
        """Test creating notification (HR only)"""
        return self.run_test(
            "Create Notification",
            "POST",
            "/api/notifications",
            200,
            data={
                "title": "Test Notification",
                "message": "This is a test notification from API tests",
                "type": "info"
            }
        )

    def test_get_my_documents(self):
        """Test getting user documents"""
        return self.run_test("Get My Documents", "GET", "/api/documents/my", 200)

    def test_get_pending_documents(self):
        """Test getting pending documents for HR review"""
        return self.run_test("Get Pending Documents", "GET", "/api/documents/pending", 200)

    def test_upload_document(self):
        """Test document upload functionality"""
        # Create a simple test file content
        test_content = "This is a test medical certificate document"
        import base64
        
        # Simulate file upload by creating multipart form data
        # Note: This is a simplified test - real multipart upload testing would require more complex setup
        print("   📄 Document upload test requires multipart/form-data - testing endpoint accessibility...")
        
        # Test if the endpoint is accessible (will return validation error but proves endpoint exists)
        success, response = self.run_test(
            "Document Upload Endpoint Test",
            "POST",
            "/api/documents/upload",
            422,  # Expect validation error due to missing file
            data={"doc_type": "medical_certificate", "description": "Test document"}
        )
        
        # If we get 422, it means endpoint exists and is validating input
        if not success and response.get('status_code') == 422:
            print("   ✅ Document upload endpoint accessible (validation working)")
            self.log_result("Document Upload Endpoint", True, "Endpoint accessible, validation working")
            return True, response
        
        return success, response

    # ========== GEOLOCATION FEATURE TESTS ==========

    def test_geolocation_clock_onsite_worker(self, lat=-23.5505, lng=-46.6333):
        """Test geolocation clock-in for onsite worker (should fail)"""
        print("   🚫 Testing onsite worker geolocation block...")
        return self.run_test(
            "Geolocation Clock - Onsite Worker Block", 
            "POST", 
            "/api/clock/geolocation", 
            403,  # Should be forbidden for onsite workers
            data={"latitude": lat, "longitude": lng}
        )

    def test_geolocation_clock_remote_worker_valid_location(self, lat=-23.5505, lng=-46.6333):
        """Test geolocation clock-in for remote worker within radius"""
        print("   ✅ Testing remote worker valid location...")
        return self.run_test(
            "Geolocation Clock - Remote Worker Valid", 
            "POST", 
            "/api/clock/geolocation", 
            200,  # Should work for remote workers within radius
            data={"latitude": lat, "longitude": lng}
        )

    def test_geolocation_clock_remote_worker_invalid_location(self, lat=-22.9068, lng=-43.1729):
        """Test geolocation clock-in for remote worker outside radius (Rio coordinates vs São Paulo)"""
        print("   🚫 Testing remote worker invalid location...")
        return self.run_test(
            "Geolocation Clock - Remote Worker Invalid", 
            "POST", 
            "/api/clock/geolocation", 
            400,  # Should fail - outside allowed radius
            data={"latitude": lat, "longitude": lng}
        )

    def test_geolocation_clock_no_home_location(self):
        """Test geolocation clock-in for worker without home location configured"""
        print("   🚫 Testing worker without home location...")
        return self.run_test(
            "Geolocation Clock - No Home Location", 
            "POST", 
            "/api/clock/geolocation", 
            400,  # Should fail - no home location configured
            data={"latitude": -23.5505, "longitude": -46.6333}
        )

    def test_create_remote_employee(self, work_mode="remote"):
        """Test creating employee with remote/hybrid work mode"""
        employee_data = {
            "name": f"Test Remote Worker {int(time.time())}",
            "email": f"remote{int(time.time())}@techcorp.com", 
            "password": "test123",
            "role": "employee",
            "work_mode": work_mode,
            "home_location": {"lat": -23.5505, "lng": -46.6333},
            "location_radius_meters": 200,
            "company_id": "test-company-id"  # This will be updated with actual company_id
        }
        
        return self.run_test(
            f"Create {work_mode.title()} Employee",
            "POST",
            "/api/users",
            200,
            data=employee_data
        )

    def test_create_hybrid_employee(self):
        """Test creating hybrid employee"""
        return self.test_create_remote_employee("hybrid")

    def login_as_user(self, email, password):
        """Helper to login as a specific user"""
        current_token = self.token  # Save current token
        success, response = self.test_login(email, password)
        if not success:
            self.token = current_token  # Restore if failed
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
    
    # Test 9: Phase 2 Features - Vacation & Absences
    print("\n🏖️ Testing Phase 2 Features - Vacation & Absences...")
    tester.test_my_absences()
    tester.test_vacation_requests_list()
    tester.test_request_vacation()
    
    # Test 10: Totem Events
    print("\n📱 Testing Totem Events...")
    tester.test_totem_recent_events()
    
    # Test 11: Phase 3 Features - Documents & Notifications  
    print("\n📄 Testing Phase 3 Features - Documents & Notifications...")
    tester.test_get_my_notifications()
    tester.test_create_notification()
    tester.test_get_my_documents()
    tester.test_get_pending_documents()
    tester.test_upload_document()
    
    # Test 12: CSV Export
    print("\n📊 Testing CSV Export...")
    tester.test_export_csv()
    
    # Test 13: GEOLOCATION FEATURES
    print("\n🗺️ Testing Geolocation Features...")
    print("   Testing with different user types and scenarios...")
    
    # Store original token
    hr_token = tester.token
    
    # Test 13a: Login as onsite worker and test geolocation block
    print("\n   👤 Testing onsite worker geolocation restrictions...")
    onsite_login = tester.login_as_user("joao@techcorp.com", "joao123")
    if onsite_login[0]:
        tester.test_geolocation_clock_onsite_worker()
    else:
        print("   ⚠️ Could not login as onsite worker, skipping onsite tests")
    
    # Test 13b: Login as remote worker and test geolocation functionality
    print("\n   🏠 Testing remote worker geolocation functionality...")
    remote_login = tester.login_as_user("carlos@techcorp.com", "carlos123") 
    if remote_login[0]:
        # Test valid location (should work)
        tester.test_geolocation_clock_remote_worker_valid_location()
        
        # Test invalid location (should fail - using Rio coordinates)
        tester.test_geolocation_clock_remote_worker_invalid_location()
        
        # Clock out if needed for next test
        print("   ⏰ Getting clock status to determine if clock-out is needed...")
        clock_status = tester.test_clock_status()
    else:
        print("   ⚠️ Could not login as remote worker, skipping remote tests")
    
    # Restore HR token for remaining tests
    tester.token = hr_token
    
    # Test 13c: Test HR functionality - creating remote/hybrid employees
    print("\n   👥 Testing HR employee creation with work modes...")
    if hr_token:
        # Get company info for employee creation
        company_success, company_data = tester.test_get_company()
        if company_success and 'id' in company_data:
            # Test creating remote employee
            remote_emp_data = {
                "name": f"Test Remote Worker {int(time.time())}",
                "email": f"remote{int(time.time())}@techcorp.com", 
                "password": "test123",
                "role": "employee",
                "work_mode": "remote",
                "home_location": {"lat": -23.5505, "lng": -46.6333},
                "location_radius_meters": 200,
                "company_id": company_data['id']
            }
            
            tester.run_test(
                "Create Remote Employee with Home Location",
                "POST",
                "/api/users",
                200,
                data=remote_emp_data
            )
            
            # Test creating hybrid employee
            hybrid_emp_data = {
                "name": f"Test Hybrid Worker {int(time.time())}",
                "email": f"hybrid{int(time.time())}@techcorp.com", 
                "password": "test123",
                "role": "employee",
                "work_mode": "hybrid",
                "home_location": {"lat": -23.5505, "lng": -46.6333},
                "location_radius_meters": 300,
                "company_id": company_data['id']
            }
            
            tester.run_test(
                "Create Hybrid Employee with Home Location",
                "POST",
                "/api/users",
                200,
                data=hybrid_emp_data
            )
        else:
            print("   ⚠️ Could not get company info, skipping employee creation tests")
    
    print("\n🗺️ Geolocation feature testing completed")
    
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
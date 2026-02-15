"""
Test cases for CLOCKLN subscription and reports features:
1. GET /api/plans - returns list of available subscription plans
2. GET /api/subscription/current - returns current company subscription
3. POST /api/subscription/checkout - creates Stripe checkout session
4. GET /api/subscription/status/{session_id} - checks payment status
5. GET /api/reports/attendance/pdf - generates attendance PDF report
6. GET /api/reports/attendance/excel - generates attendance Excel report
7. GET /api/reports/employees/pdf - generates employee roster PDF
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSubscriptionPlans:
    """Test subscription plan endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.hr_credentials = {"email": "hr@acme.com", "password": "password123"}
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_hr_token(self):
        """Get HR user auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=self.hr_credentials)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("HR authentication failed")
        
    def test_get_plans_public(self):
        """GET /api/plans - should return plans without auth"""
        response = self.session.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, "Response should have 'plans' key"
        assert isinstance(data["plans"], list), "Plans should be a list"
        assert len(data["plans"]) >= 3, "Should have at least 3 plans (free, pro, business)"
        
        # Verify plan structure
        plan_ids = [p["id"] for p in data["plans"]]
        assert "free" in plan_ids, "Should have free plan"
        assert "pro" in plan_ids, "Should have pro plan"
        assert "business" in plan_ids, "Should have business plan"
        
        # Verify plan details
        for plan in data["plans"]:
            assert "id" in plan, f"Plan {plan} should have 'id'"
            assert "name" in plan, f"Plan {plan} should have 'name'"
            assert "price" in plan, f"Plan {plan} should have 'price'"
            assert "features" in plan, f"Plan {plan} should have 'features'"
            assert "max_employees" in plan, f"Plan {plan} should have 'max_employees'"
            assert isinstance(plan["features"], list), f"Plan features should be a list"
        print(f"✓ GET /api/plans - returned {len(data['plans'])} plans correctly")
        
    def test_get_current_subscription(self):
        """GET /api/subscription/current - should return current company subscription"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/subscription/current", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan" in data, "Should have 'plan' field"
        assert "plan_name" in data, "Should have 'plan_name' field"
        assert "price" in data, "Should have 'price' field"
        assert "features" in data, "Should have 'features' field"
        assert "max_employees" in data, "Should have 'max_employees' field"
        assert "current_employees" in data, "Should have 'current_employees' field"
        assert "status" in data, "Should have 'status' field"
        
        # Company should be on free plan
        assert data["plan"] in ["free", "pro", "business"], f"Invalid plan: {data['plan']}"
        assert isinstance(data["current_employees"], int), "current_employees should be int"
        assert data["status"] == "active", f"Subscription status should be active, got {data['status']}"
        
        print(f"✓ GET /api/subscription/current - plan: {data['plan']}, employees: {data['current_employees']}/{data['max_employees']}")
        
    def test_get_subscription_requires_hr(self):
        """GET /api/subscription/current - should require HR role"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/subscription/current")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ GET /api/subscription/current requires authentication")
        
    def test_checkout_free_plan_blocked(self):
        """POST /api/subscription/checkout - should not allow free plan checkout"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/subscription/checkout",
            json={"plan": "free", "origin_url": "https://test.com"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for free plan checkout, got {response.status_code}"
        print("✓ POST /api/subscription/checkout - correctly blocks free plan checkout")
        
    def test_checkout_invalid_plan(self):
        """POST /api/subscription/checkout - should reject invalid plan"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/subscription/checkout",
            json={"plan": "invalid_plan", "origin_url": "https://test.com"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("✓ POST /api/subscription/checkout - correctly rejects invalid plan")
        
    def test_checkout_pro_plan(self):
        """POST /api/subscription/checkout - should create checkout session for pro plan"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/subscription/checkout",
            json={"plan": "pro", "origin_url": "https://hr-platform-staging.preview.emergentagent.com"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "Response should have 'checkout_url'"
        assert "session_id" in data, "Response should have 'session_id'"
        assert data["checkout_url"].startswith("https://"), "checkout_url should be HTTPS"
        assert len(data["session_id"]) > 0, "session_id should not be empty"
        
        print(f"✓ POST /api/subscription/checkout - created session: {data['session_id'][:20]}...")
        return data["session_id"]  # For status check test
        
    def test_checkout_business_plan(self):
        """POST /api/subscription/checkout - should create checkout session for business plan"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/subscription/checkout",
            json={"plan": "business", "origin_url": "https://hr-platform-staging.preview.emergentagent.com"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "Response should have 'checkout_url'"
        assert "session_id" in data, "Response should have 'session_id'"
        
        print(f"✓ POST /api/subscription/checkout - business plan session created")
        
    def test_check_payment_status_invalid_session(self):
        """GET /api/subscription/status/{session_id} - should handle invalid session"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/subscription/status/invalid_session_12345",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
        print("✓ GET /api/subscription/status - correctly returns 404 for invalid session")


class TestReportsPDF:
    """Test PDF/Excel report generation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.hr_credentials = {"email": "hr@acme.com", "password": "password123"}
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_hr_token(self):
        """Get HR user auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=self.hr_credentials)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("HR authentication failed")
        
    def test_attendance_pdf_report(self):
        """GET /api/reports/attendance/pdf - should generate PDF report"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Use date range for current month
        import datetime
        today = datetime.date.today()
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()
        
        response = self.session.get(
            f"{BASE_URL}/api/reports/attendance/pdf?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content-type, got {content_type}"
        
        # Check content disposition (filename)
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp, "Should have attachment disposition"
        assert '.pdf' in content_disp, "Should have .pdf filename"
        
        # Check response has content
        assert len(response.content) > 0, "PDF content should not be empty"
        
        # Check PDF magic bytes (%PDF-)
        assert response.content[:4] == b'%PDF', f"Content should be PDF, got {response.content[:20]}"
        
        print(f"✓ GET /api/reports/attendance/pdf - generated {len(response.content)} bytes PDF")
        
    def test_attendance_excel_report(self):
        """GET /api/reports/attendance/excel - should generate Excel report"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        import datetime
        today = datetime.date.today()
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()
        
        response = self.session.get(
            f"{BASE_URL}/api/reports/attendance/excel?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'openxmlformats' in content_type, f"Expected Excel content-type, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp, "Should have attachment disposition"
        assert '.xlsx' in content_disp, "Should have .xlsx filename"
        
        # Check response has content
        assert len(response.content) > 0, "Excel content should not be empty"
        
        # Check XLSX magic bytes (PK zip archive)
        assert response.content[:2] == b'PK', f"Content should be XLSX (ZIP), got {response.content[:20]}"
        
        print(f"✓ GET /api/reports/attendance/excel - generated {len(response.content)} bytes Excel")
        
    def test_employees_pdf_report(self):
        """GET /api/reports/employees/pdf - should generate employees roster PDF"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/reports/employees/pdf",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content-type, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp, "Should have attachment disposition"
        assert '.pdf' in content_disp or 'funcionarios' in content_disp.lower(), "Should have appropriate filename"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Content should be PDF"
        
        print(f"✓ GET /api/reports/employees/pdf - generated {len(response.content)} bytes PDF")
        
    def test_reports_require_hr_role(self):
        """Reports endpoints should require HR role"""
        # Without auth - should fail
        import datetime
        today = datetime.date.today()
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()
        
        response = self.session.get(f"{BASE_URL}/api/reports/attendance/pdf?start_date={start_date}&end_date={end_date}")
        assert response.status_code in [401, 403], f"PDF should require auth, got {response.status_code}"
        
        response = self.session.get(f"{BASE_URL}/api/reports/attendance/excel?start_date={start_date}&end_date={end_date}")
        assert response.status_code in [401, 403], f"Excel should require auth, got {response.status_code}"
        
        response = self.session.get(f"{BASE_URL}/api/reports/employees/pdf")
        assert response.status_code in [401, 403], f"Employees PDF should require auth, got {response.status_code}"
        
        print("✓ All report endpoints require HR authentication")
        
    def test_attendance_reports_missing_dates(self):
        """Attendance reports should require date parameters"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Missing start_date
        response = self.session.get(
            f"{BASE_URL}/api/reports/attendance/pdf?end_date=2025-01-31",
            headers=headers
        )
        assert response.status_code == 422, f"Expected 422 for missing start_date, got {response.status_code}"
        
        # Missing end_date
        response = self.session.get(
            f"{BASE_URL}/api/reports/attendance/excel?start_date=2025-01-01",
            headers=headers
        )
        assert response.status_code == 422, f"Expected 422 for missing end_date, got {response.status_code}"
        
        print("✓ Attendance reports correctly require date parameters")


class TestSubscriptionHistory:
    """Test subscription history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.hr_credentials = {"email": "hr@acme.com", "password": "password123"}
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_hr_token(self):
        """Get HR user auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=self.hr_credentials)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("HR authentication failed")
        
    def test_get_payment_history(self):
        """GET /api/subscription/history - should return transaction history"""
        token = self.get_hr_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/subscription/history", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "History should be a list"
        
        # If there are transactions, verify structure
        if len(data) > 0:
            tx = data[0]
            assert "company_id" in tx, "Transaction should have company_id"
            assert "plan" in tx, "Transaction should have plan"
            assert "amount" in tx, "Transaction should have amount"
            assert "payment_status" in tx, "Transaction should have payment_status"
            assert "session_id" in tx, "Transaction should have session_id"
        
        print(f"✓ GET /api/subscription/history - returned {len(data)} transactions")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

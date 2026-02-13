"""
Test suite for Remote Map Endpoints - /api/reports/remote-workers and /api/reports/remote-clocks
Tests the HR functionality for viewing remote worker locations and geolocation clock records
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
HR_CREDENTIALS = {"email": "hr@acme.com", "password": "password123"}
REMOTE_EMPLOYEE_CREDENTIALS = {"email": "carlos.remoto@acme.com", "password": "password123"}


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")


class TestRemoteWorkers:
    """Test /api/reports/remote-workers endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_remote_workers_success(self):
        """HR can get list of remote/hybrid workers with their locations"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-workers",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /reports/remote-workers returned {len(data)} workers")
        
        # Check for Carlos Remoto (test data)
        remote_workers = [w for w in data if w.get("work_mode") in ["remote", "hybrid"]]
        assert len(remote_workers) > 0, "Should have at least one remote worker"
        print(f"✅ Found {len(remote_workers)} remote/hybrid workers")
    
    def test_remote_worker_has_required_fields(self):
        """Remote worker data should contain all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-workers",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            worker = data[0]
            required_fields = ["id", "name", "email", "work_mode", "home_location", "clocked_today"]
            for field in required_fields:
                assert field in worker, f"Missing required field: {field}"
            print(f"✅ Worker data contains all required fields: {required_fields}")
    
    def test_remote_worker_home_location_structure(self):
        """Remote worker home_location should have lat/lng coordinates"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-workers",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        workers_with_location = [w for w in data if w.get("home_location")]
        if len(workers_with_location) > 0:
            location = workers_with_location[0]["home_location"]
            assert "lat" in location, "home_location should have 'lat'"
            assert "lng" in location, "home_location should have 'lng'"
            assert isinstance(location["lat"], (int, float)), "lat should be numeric"
            assert isinstance(location["lng"], (int, float)), "lng should be numeric"
            print(f"✅ home_location structure is correct: lat={location['lat']}, lng={location['lng']}")
    
    def test_remote_workers_unauthorized(self):
        """Non-HR users should not access remote workers"""
        # Login as regular employee
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/reports/remote-workers",
                headers=emp_headers
            )
            
            # Should be forbidden for non-HR users
            assert response.status_code == 403, "Non-HR should get 403 Forbidden"
            print("✅ Non-HR users correctly blocked from remote-workers endpoint")
        else:
            pytest.skip("Could not login as employee to test authorization")


class TestRemoteClocks:
    """Test /api/reports/remote-clocks endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_remote_clocks_default(self):
        """HR can get remote clock records with default 7 days filter"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-clocks",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /reports/remote-clocks returned {len(data)} records (default 7 days)")
    
    def test_get_remote_clocks_with_days_param(self):
        """HR can get remote clock records with custom days filter"""
        for days in [1, 7, 30]:
            response = requests.get(
                f"{BASE_URL}/api/reports/remote-clocks?days={days}",
                headers=self.headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ GET /reports/remote-clocks?days={days} returned {len(data)} records")
    
    def test_remote_clock_record_structure(self):
        """Remote clock records should have required fields including location data"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-clocks?days=7",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            record = data[0]
            required_fields = [
                "id", "user_id", "clock_in", "date", 
                "clock_method", "location", "user_name"
            ]
            for field in required_fields:
                assert field in record, f"Missing required field: {field}"
            
            assert record["clock_method"] == "geolocation", "clock_method should be 'geolocation'"
            print(f"✅ Remote clock record has all required fields")
    
    def test_remote_clock_location_structure(self):
        """Remote clock location should have lat/lng coordinates"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-clocks?days=7",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        records_with_location = [r for r in data if r.get("location")]
        if len(records_with_location) > 0:
            location = records_with_location[0]["location"]
            assert "lat" in location, "location should have 'lat'"
            assert "lng" in location, "location should have 'lng'"
            print(f"✅ Clock record location structure is correct: lat={location['lat']}, lng={location['lng']}")
    
    def test_remote_clock_distance_calculation(self):
        """Remote clock records should include distance_from_home calculation"""
        response = requests.get(
            f"{BASE_URL}/api/reports/remote-clocks?days=7",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            record = data[0]
            # Check if distance_from_home is present and is a number
            if "distance_from_home" in record:
                assert isinstance(record["distance_from_home"], (int, float)), "distance_from_home should be numeric"
                print(f"✅ distance_from_home calculated: {record['distance_from_home']}m")
            
            # Check if home_location is enriched
            if "home_location" in record:
                assert "lat" in record["home_location"]
                assert "lng" in record["home_location"]
                print("✅ home_location enriched in clock record")
    
    def test_remote_clocks_unauthorized(self):
        """Non-HR users should not access remote clocks"""
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/reports/remote-clocks",
                headers=emp_headers
            )
            
            assert response.status_code == 403, "Non-HR should get 403 Forbidden"
            print("✅ Non-HR users correctly blocked from remote-clocks endpoint")
        else:
            pytest.skip("Could not login as employee to test authorization")


class TestHRDashboardIntegration:
    """Test that HR Dashboard has access to remote map functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_hr_dashboard_accessible(self):
        """HR can access the dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/hr",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        print(f"✅ HR Dashboard accessible - {data['total_employees']} employees")
    
    def test_users_list_shows_work_mode(self):
        """Users list should include work_mode field for identifying remote workers"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            # Check if work_mode is available
            user_with_work_mode = [u for u in data if "work_mode" in u]
            assert len(user_with_work_mode) > 0, "Users should have work_mode field"
            print(f"✅ Users list includes work_mode field")
            
            # Count remote/hybrid workers
            remote_hybrid = [u for u in data if u.get("work_mode") in ["remote", "hybrid"]]
            print(f"✅ Found {len(remote_hybrid)} remote/hybrid workers in users list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

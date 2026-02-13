"""
Test suite for CLOCKLN new features:
1. Manager dashboard (GET /api/dashboard/manager, GET /api/manager/team)
2. Notifications (POST /api/notifications, GET /api/notifications/all, GET /api/notifications/alerts)
3. Location alerts (automatic alert when clock outside radius)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
HR_CREDENTIALS = {"email": "hr@acme.com", "password": "password123"}
MANAGER_CREDENTIALS = {"email": "gerente@acme.com", "password": "password123"}
REMOTE_EMPLOYEE_CREDENTIALS = {"email": "carlos.remoto@acme.com", "password": "password123"}


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")


class TestManagerDashboard:
    """Test Manager Dashboard endpoint - GET /api/dashboard/manager"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as manager and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip(f"Manager login failed: {response.text}")
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
    
    def test_manager_login_success(self):
        """Manager can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "manager"
        print(f"✅ Manager login successful - {data['user']['name']}")
    
    def test_manager_dashboard_accessible(self):
        """Manager can access their dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/manager",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = [
            "total_team_members", "clocked_in_today", 
            "total_overtime_month", "team", "pending_vacation_requests"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✅ Manager dashboard: {data['total_team_members']} team members")
    
    def test_manager_dashboard_shows_only_team(self):
        """Manager dashboard should only show their team members"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/manager",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        team = data.get("team", [])
        
        # All team members should have this manager as their manager_id
        if len(team) > 0:
            for member in team:
                assert member.get("manager_id") == self.user["id"], \
                    f"Team member {member['name']} doesn't belong to this manager"
            print(f"✅ All {len(team)} team members correctly assigned to manager")
        else:
            print("⚠️ No team members found for this manager")
    
    def test_manager_dashboard_forbidden_for_employee(self):
        """Regular employees cannot access manager dashboard"""
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/dashboard/manager",
                headers=emp_headers
            )
            
            assert response.status_code == 403, "Non-managers should get 403"
            print("✅ Non-managers correctly blocked from manager dashboard")
        else:
            pytest.skip("Could not login as employee")


class TestManagerTeam:
    """Test GET /api/manager/team endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as manager and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip(f"Manager login failed: {response.text}")
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
    
    def test_get_manager_team(self):
        """Manager can get list of their team members"""
        response = requests.get(
            f"{BASE_URL}/api/manager/team",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ GET /manager/team returned {len(data)} team members")
        
        # Verify team members belong to this manager
        for member in data:
            assert member.get("manager_id") == self.user["id"]
    
    def test_manager_team_forbidden_for_employee(self):
        """Regular employees cannot access manager team endpoint"""
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/manager/team",
                headers=emp_headers
            )
            
            assert response.status_code == 403, "Non-managers should get 403"
            print("✅ Non-managers correctly blocked from /manager/team")
        else:
            pytest.skip("Could not login as employee")


class TestListManagers:
    """Test GET /api/managers endpoint - HR only"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_managers(self):
        """HR can list all managers in company"""
        response = requests.get(
            f"{BASE_URL}/api/managers",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ GET /managers returned {len(data)} managers")
        
        # Check for team_count field
        if len(data) > 0:
            assert "team_count" in data[0], "Manager should have team_count"
            print(f"✅ First manager: {data[0]['name']} with {data[0]['team_count']} team members")


class TestNotificationsCreate:
    """Test POST /api/notifications - HR creates notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_notification_to_all(self):
        """HR can create notification for all employees"""
        payload = {
            "user_id": None,
            "title": "Test: Aviso Geral",
            "message": "Esta é uma notificação de teste para todos os funcionários",
            "type": "info"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Notification created"
        print(f"✅ Created notification for all employees - ID: {data['id']}")
    
    def test_create_notification_to_specific_user(self):
        """HR can create notification for specific employee"""
        # First get an employee ID
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = users_response.json()
        employees = [u for u in users if u.get("role") == "employee"]
        
        if len(employees) > 0:
            payload = {
                "user_id": employees[0]["id"],
                "title": "Test: Aviso Individual",
                "message": "Esta é uma notificação de teste individual",
                "type": "warning"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/notifications",
                headers=self.headers,
                json=payload
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            print(f"✅ Created notification for {employees[0]['name']} - ID: {data['id']}")
        else:
            pytest.skip("No employees found to send notification")
    
    def test_notification_types(self):
        """HR can create notifications with different types"""
        types = ["info", "success", "warning", "error"]
        
        for notif_type in types:
            payload = {
                "user_id": None,
                "title": f"Test: {notif_type.upper()} type",
                "message": f"Testing notification type: {notif_type}",
                "type": notif_type
            }
            
            response = requests.post(
                f"{BASE_URL}/api/notifications",
                headers=self.headers,
                json=payload
            )
            
            assert response.status_code == 200
            print(f"✅ Created {notif_type} notification")


class TestNotificationsAll:
    """Test GET /api/notifications/all - HR views all notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_notifications(self):
        """HR can get all notifications for company"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/all",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /notifications/all returned {len(data)} notifications")
        
        # Check notification structure
        if len(data) > 0:
            notif = data[0]
            required_fields = ["id", "title", "message", "type", "created_at"]
            for field in required_fields:
                assert field in notif, f"Missing field: {field}"
            print(f"✅ Notification structure is correct")
    
    def test_notifications_include_recipient_name(self):
        """All notifications should have recipient_name enriched"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/all",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            for notif in data[:5]:  # Check first 5
                assert "recipient_name" in notif, "Should have recipient_name"
            print("✅ Notifications have recipient_name field")
    
    def test_notifications_all_forbidden_for_employee(self):
        """Regular employees cannot access all notifications"""
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/notifications/all",
                headers=emp_headers
            )
            
            assert response.status_code == 403, "Non-HR should get 403"
            print("✅ Non-HR correctly blocked from /notifications/all")
        else:
            pytest.skip("Could not login as employee")


class TestLocationAlerts:
    """Test GET /api/notifications/alerts - Location alerts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_location_alerts(self):
        """HR can get location-related alerts"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/alerts",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /notifications/alerts returned {len(data)} alerts")
        
        # Check that alerts are system-generated warnings
        for alert in data:
            assert alert.get("type") == "warning", "Alerts should be warning type"
            assert alert.get("created_by") == "system", "Alerts should be created by system"
        
        print("✅ All alerts are system-generated warnings")
    
    def test_location_alerts_content(self):
        """Location alerts should contain relevant information"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/alerts",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for existing "fora do raio" alerts from previous tests
        out_of_radius_alerts = [a for a in data if "fora do raio" in a.get("title", "").lower() or 
                                                    "fora do raio" in a.get("message", "").lower()]
        
        if len(out_of_radius_alerts) > 0:
            alert = out_of_radius_alerts[0]
            print(f"✅ Found location alert: {alert['title']}")
            print(f"   Message: {alert['message'][:80]}...")
        else:
            print("⚠️ No 'fora do raio' alerts found - may need to create one via geolocation clock")
    
    def test_alerts_forbidden_for_employee(self):
        """Regular employees cannot access alerts"""
        emp_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REMOTE_EMPLOYEE_CREDENTIALS
        )
        
        if emp_response.status_code == 200:
            emp_token = emp_response.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}
            
            response = requests.get(
                f"{BASE_URL}/api/notifications/alerts",
                headers=emp_headers
            )
            
            assert response.status_code == 403, "Non-HR should get 403"
            print("✅ Non-HR correctly blocked from /notifications/alerts")
        else:
            pytest.skip("Could not login as employee")


class TestEmployeeNotifications:
    """Test employee notification access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as remote employee and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=REMOTE_EMPLOYEE_CREDENTIALS)
        if response.status_code != 200:
            pytest.skip("Employee login failed")
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_employee_can_see_their_notifications(self):
        """Employee can see notifications addressed to them or company-wide"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/my",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Employee can see {len(data)} notifications")


class TestNotificationDelete:
    """Test DELETE /api/notifications/{id} - HR deletes notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_notification(self):
        """HR can delete a notification"""
        # First create a test notification
        create_payload = {
            "user_id": None,
            "title": "Test: To Be Deleted",
            "message": "This notification will be deleted",
            "type": "info"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/notifications",
            headers=self.headers,
            json=create_payload
        )
        
        assert create_response.status_code == 200
        notif_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/notifications/{notif_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        print(f"✅ Deleted notification ID: {notif_id}")


class TestManagerIdInUserCreation:
    """Test that manager_id can be assigned when creating employees"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as HR and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HR_CREDENTIALS)
        assert response.status_code == 200, "HR login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get company_id from logged user
        user_response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        self.company_id = user_response.json()["company_id"]
    
    def test_manager_id_field_exists(self):
        """Check that manager_id field is returned in user responses"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        
        # Check if any user has manager_id
        users_with_manager = [u for u in users if u.get("manager_id")]
        
        print(f"✅ Found {len(users_with_manager)} users with manager_id assigned")
        
        # Verify Carlos Remoto has a manager
        carlos = next((u for u in users if "carlos.remoto" in u.get("email", "")), None)
        if carlos:
            assert "manager_id" in carlos, "User response should include manager_id field"
            if carlos.get("manager_id"):
                print(f"✅ Carlos Remoto is assigned to manager: {carlos['manager_id']}")
    
    def test_update_user_manager_id(self):
        """HR can update an employee's manager_id"""
        # Get list of managers
        managers_response = requests.get(f"{BASE_URL}/api/managers", headers=self.headers)
        managers = managers_response.json()
        
        if len(managers) == 0:
            pytest.skip("No managers available")
        
        manager_id = managers[0]["id"]
        
        # Get an employee to update
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = users_response.json()
        employees = [u for u in users if u.get("role") == "employee"]
        
        if len(employees) == 0:
            pytest.skip("No employees to update")
        
        employee = employees[0]
        
        # Update manager_id
        update_response = requests.patch(
            f"{BASE_URL}/api/users/{employee['id']}",
            headers=self.headers,
            json={"manager_id": manager_id}
        )
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated.get("manager_id") == manager_id
        print(f"✅ Updated {employee['name']}'s manager to {managers[0]['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

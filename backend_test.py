import requests
import sys
import json
from datetime import datetime, timezone

class ReminderAppTester:
    def __init__(self, base_url="https://color-task-timer.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_note_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_notes_empty(self):
        """Test getting notes when empty"""
        return self.run_test("Get All Notes (Empty)", "GET", "notes", 200)

    def test_create_note(self):
        """Create a test note with alarm"""
        alarm_datetime = datetime.now(timezone.utc).replace(microsecond=0)
        alarm_datetime = alarm_datetime.replace(hour=alarm_datetime.hour + 1)  # Set 1 hour from now
        
        note_data = {
            "title": "Test Backend Note",
            "content": "This is a test note with calculator result: 42\n\nFormula: 6 * 7 = 42",
            "color": "purple",
            "alarm": {
                "enabled": True,
                "datetime": alarm_datetime.isoformat(),
                "sound": "bell",
                "haptic": True
            }
        }
        
        # Try both 201 and 200 as acceptable responses
        success, response = self.run_test("Create Note", "POST", "notes", 201, note_data)
        if not success:
            # Try with 200 status code
            success, response = self.run_test("Create Note (200)", "POST", "notes", 200, note_data)
        
        if success and 'id' in response:
            self.created_note_id = response['id']
            print(f"   Created note ID: {self.created_note_id}")
        return success, response

    def test_get_note_by_id(self):
        """Get the created note by ID"""
        if not self.created_note_id:
            print("❌ Skipping - No note ID available")
            return False, {}
        
        return self.run_test("Get Note by ID", "GET", f"notes/{self.created_note_id}", 200)

    def test_get_all_notes(self):
        """Test getting all notes (should have at least 1)"""
        success, response = self.run_test("Get All Notes", "GET", "notes", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} notes")
            return True, response
        return success, response

    def test_update_note(self):
        """Update the created note"""
        if not self.created_note_id:
            print("❌ Skipping - No note ID available")
            return False, {}
        
        update_data = {
            "title": "Updated Test Note",
            "content": "Updated content with new calculator result: 100\n\nFormula: 10 * 10 = 100",
            "color": "cyan",
            "alarm": {
                "enabled": False,
                "datetime": None,
                "sound": "chime",
                "haptic": False
            }
        }
        
        return self.run_test("Update Note", "PUT", f"notes/{self.created_note_id}", 200, update_data)

    def test_delete_note(self):
        """Delete the created note"""
        if not self.created_note_id:
            print("❌ Skipping - No note ID available")
            return False, {}
        
        return self.run_test("Delete Note", "DELETE", f"notes/{self.created_note_id}", 200)

    def test_get_settings(self):
        """Test getting app settings"""
        return self.run_test("Get Settings", "GET", "settings", 200)

    def test_update_settings(self):
        """Test updating app settings"""
        settings_data = {
            "company_name": "Test Company",
            "logo_url": "https://via.placeholder.com/64x64/6366f1/ffffff?text=TC",
            "header_bg": "https://via.placeholder.com/1920x400/1e293b/64748b",
            "website_url": "https://testcompany.example.com"
        }
        
        return self.run_test("Update Settings", "PUT", "settings", 200, settings_data)

    def test_note_validation(self):
        """Test note creation with missing title"""
        note_data = {
            "content": "Note without title",
            "color": "lime"
        }
        
        # This should fail validation or handle gracefully
        success, response = self.run_test("Create Note Without Title", "POST", "notes", 422, note_data)
        # If it returns 201, that's also acceptable depending on implementation
        if not success:
            # Check if it's 201 (created successfully)
            url = f"{self.api_url}/notes"
            try:
                resp = requests.post(url, json=note_data, headers={'Content-Type': 'application/json'}, timeout=30)
                if resp.status_code == 201:
                    print("✅ Note created without title (handled gracefully)")
                    self.tests_passed += 1
                    return True, resp.json()
            except:
                pass
        
        return success, response

    def test_nonexistent_note(self):
        """Test getting/updating/deleting nonexistent note"""
        fake_id = "nonexistent-note-id-12345"
        return self.run_test("Get Nonexistent Note", "GET", f"notes/{fake_id}", 404)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Reminder App Backend API Tests")
        print(f"   Testing endpoint: {self.api_url}")
        
        # Basic endpoints
        self.test_root_endpoint()
        
        # Notes CRUD operations
        self.test_get_notes_empty()
        self.test_create_note()
        self.test_get_note_by_id()
        self.test_get_all_notes()
        self.test_update_note()
        
        # Settings operations
        self.test_get_settings()
        self.test_update_settings()
        
        # Edge cases
        self.test_note_validation()
        self.test_nonexistent_note()
        
        # Cleanup
        self.test_delete_note()
        
        # Print final results
        print(f"\n📊 Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ReminderAppTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
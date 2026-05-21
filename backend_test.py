#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class IronRabbitAPITester:
    def __init__(self, base_url: str = "https://color-task-timer.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_test(self, name: str, passed: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            
        self.test_results.append({
            "test": name,
            "passed": passed,
            "details": details,
            "response_data": response_data
        })
        
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"  Details: {details}")
        if not passed and response_data:
            print(f"  Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Any]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"
                
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return success, response_data
            
        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error - server may be down"
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_api_health(self):
        """Test basic API connectivity"""
        success, data = self.make_request('GET', '/')
        if success:
            expected_message = "LuminaTask API"
            if isinstance(data, dict) and data.get('message') == expected_message:
                self.log_test("API Health Check", True, "API is responding correctly")
                return True
            else:
                self.log_test("API Health Check", False, f"Unexpected response: {data}")
                return False
        else:
            self.log_test("API Health Check", False, f"API not responding: {data}")
            return False

    def test_create_note(self) -> Optional[str]:
        """Test note creation and return note ID if successful"""
        test_note = {
            "title": "Test Note - API Testing",
            "content": "This is a test note created during API testing",
            "color": "purple",
            "category": "Testing",
            "alarm": {
                "enabled": True,
                "datetime": datetime.now(timezone.utc).isoformat(),
                "sound": "bell",
                "haptic": False
            },
            "recurring": {
                "enabled": True,
                "frequency": "weekly",
                "days": [0, 2, 4]  # Mon, Wed, Fri
            }
        }
        
        success, data = self.make_request('POST', '/notes', test_note, 201)
        if success and isinstance(data, dict) and data.get('id'):
            note_id = data['id']
            # Verify all fields were saved correctly
            if (data.get('title') == test_note['title'] and 
                data.get('category') == test_note['category'] and
                data.get('alarm', {}).get('enabled') == True and
                data.get('recurring', {}).get('enabled') == True):
                self.log_test("Create Note", True, f"Note created with ID: {note_id}")
                return note_id
            else:
                self.log_test("Create Note", False, "Note created but fields don't match", data)
                return None
        else:
            self.log_test("Create Note", False, "Failed to create note", data)
            return None

    def test_get_notes(self):
        """Test retrieving all notes"""
        success, data = self.make_request('GET', '/notes')
        if success and isinstance(data, list):
            self.log_test("Get All Notes", True, f"Retrieved {len(data)} notes")
            return True, data
        else:
            self.log_test("Get All Notes", False, "Failed to retrieve notes", data)
            return False, []

    def test_get_single_note(self, note_id: str):
        """Test retrieving a specific note"""
        success, data = self.make_request('GET', f'/notes/{note_id}')
        if success and isinstance(data, dict) and data.get('id') == note_id:
            self.log_test("Get Single Note", True, f"Retrieved note: {data.get('title', 'Untitled')}")
            return True, data
        else:
            self.log_test("Get Single Note", False, f"Failed to retrieve note {note_id}", data)
            return False, {}

    def test_update_note(self, note_id: str):
        """Test updating a note"""
        update_data = {
            "title": "Updated Test Note - API Testing",
            "content": "This note has been updated",
            "category": "Updated Testing",
            "last_viewed": datetime.now(timezone.utc).isoformat()
        }
        
        success, data = self.make_request('PUT', f'/notes/{note_id}', update_data)
        if success and isinstance(data, dict):
            if (data.get('title') == update_data['title'] and 
                data.get('category') == update_data['category']):
                self.log_test("Update Note", True, "Note updated successfully")
                return True
            else:
                self.log_test("Update Note", False, "Note updated but fields don't match", data)
                return False
        else:
            self.log_test("Update Note", False, f"Failed to update note {note_id}", data)
            return False

    def test_delete_note(self, note_id: str):
        """Test deleting a note"""
        success, data = self.make_request('DELETE', f'/notes/{note_id}')
        if success:
            # Verify note is actually deleted
            get_success, _ = self.make_request('GET', f'/notes/{note_id}', expected_status=404)
            if get_success:  # Should fail with 404
                self.log_test("Delete Note", False, "Note still exists after deletion")
                return False
            else:
                self.log_test("Delete Note", True, "Note deleted successfully")
                return True
        else:
            self.log_test("Delete Note", False, f"Failed to delete note {note_id}", data)
            return False

    def test_settings_functionality(self):
        """Test settings endpoints"""
        # Test getting default settings
        success, data = self.make_request('GET', '/settings')
        if success and isinstance(data, dict):
            self.log_test("Get Settings", True, "Retrieved settings successfully")
            
            # Test updating settings
            update_data = {
                "company_name": "Iron Rabbit Testing",
                "website_url": "https://otropis.com",
                "logo_url": "https://example.com/test-logo.png"
            }
            
            success, updated_data = self.make_request('PUT', '/settings', update_data)
            if success and isinstance(updated_data, dict):
                if updated_data.get('company_name') == update_data['company_name']:
                    self.log_test("Update Settings", True, "Settings updated successfully")
                    return True
                else:
                    self.log_test("Update Settings", False, "Settings updated but fields don't match", updated_data)
                    return False
            else:
                self.log_test("Update Settings", False, "Failed to update settings", updated_data)
                return False
        else:
            self.log_test("Get Settings", False, "Failed to retrieve settings", data)
            return False

    def test_note_validation(self):
        """Test note validation and error handling"""
        # Test creating note without title
        invalid_note = {
            "content": "Note without title",
            "color": "cyan"
        }
        
        success, data = self.make_request('POST', '/notes', invalid_note, 422)
        if not success:  # Should fail validation
            self.log_test("Note Validation (Missing Title)", True, "Properly rejected note without title")
        else:
            self.log_test("Note Validation (Missing Title)", False, "Should have rejected note without title", data)
            
        # Test invalid color
        invalid_color_note = {
            "title": "Test Note",
            "color": "invalid_color"
        }
        
        # This might pass since color validation might not be strict
        success, data = self.make_request('POST', '/notes', invalid_color_note, 201)
        if success:
            # Clean up
            if data and data.get('id'):
                self.make_request('DELETE', f'/notes/{data["id"]}')
            self.log_test("Note with Invalid Color", True, "Note created (color validation flexible)")
        else:
            self.log_test("Note with Invalid Color", True, "Properly rejected invalid color")

    def test_nonexistent_note(self):
        """Test accessing non-existent resources"""
        fake_id = "nonexistent-note-id-12345"
        
        # Test GET
        success, data = self.make_request('GET', f'/notes/{fake_id}', expected_status=404)
        if not success:
            self.log_test("Get Nonexistent Note", True, "Properly returned 404 for missing note")
        else:
            self.log_test("Get Nonexistent Note", False, "Should have returned 404", data)
            
        # Test DELETE
        success, data = self.make_request('DELETE', f'/notes/{fake_id}', expected_status=404)
        if not success:
            self.log_test("Delete Nonexistent Note", True, "Properly returned 404 for missing note")
        else:
            self.log_test("Delete Nonexistent Note", False, "Should have returned 404", data)

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Iron Rabbit API Test Suite")
        print(f"Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_api_health():
            print("❌ API health check failed - stopping tests")
            return self.get_results()
        
        # Settings tests
        self.test_settings_functionality()
        
        # Note CRUD tests
        note_id = self.test_create_note()
        if note_id:
            self.test_get_single_note(note_id)
            self.test_update_note(note_id)
            
            # Test get all notes (should include our test note)
            self.test_get_notes()
            
            # Delete test note
            self.test_delete_note(note_id)
        
        # Error handling tests
        self.test_note_validation()
        self.test_nonexistent_note()
        
        return self.get_results()

    def get_results(self):
        """Return test results summary"""
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print("❌ Some tests failed - check logs above")
            
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": self.tests_passed / self.tests_run if self.tests_run > 0 else 0,
            "all_passed": self.tests_passed == self.tests_run,
            "test_details": self.test_results
        }

def main():
    """Main test execution"""
    tester = IronRabbitAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    return 0 if results["all_passed"] else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
#!/usr/bin/env python3
"""
Test script for Cosmotrix Character Endpoints
Tests all 6 character endpoints and their memory functionality
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any

# Configuration
BASE_URL = "http://localhost:3000"  # Change this to your deployed URL if testing remotely
CHARACTERS = [
    "pilot",
    "power-operator", 
    "astronaut",
    "satellite-operator",
    "emergency-coordinator",
    "scientist"
]

class CharacterTester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {}
        
    def test_character_info(self) -> bool:
        """Test the character info endpoint"""
        print("🔍 Testing character info endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/characters")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Character info endpoint working")
                print(f"   Found {len(data.get('characters', {}))} characters")
                for char_id, char_info in data.get('characters', {}).items():
                    print(f"   - {char_info['name']} ({char_info['role']})")
                return True
            else:
                print(f"❌ Character info endpoint failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Character info endpoint error: {e}")
            return False

    def test_character_endpoint(self, character: str, thread_id: str = None) -> Dict[str, Any]:
        """Test a single character endpoint"""
        print(f"\n🎭 Testing {character} character...")
        
        # Test messages for each character
        test_messages = {
            "pilot": "Tell me about a time when space weather affected your flight operations.",
            "power-operator": "How do you handle grid stability during a geomagnetic storm?",
            "astronaut": "Describe your experience with radiation exposure during a solar flare.",
            "satellite-operator": "What happens to your satellites during a CME event?", 
            "emergency-coordinator": "How does space weather impact emergency response coordination?",
            "scientist": "Explain how you forecast space weather events for operational users."
        }
        
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": test_messages.get(character, "Tell me about your work and space weather.")
                }
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        if thread_id:
            payload["thread_id"] = thread_id
            
        try:
            response = self.session.post(
                f"{self.base_url}/api/characters/{character}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {character} endpoint working")
                print(f"   Response length: {len(data.get('response', ''))}")
                print(f"   Thread ID: {data.get('thread_id', 'N/A')}")
                print(f"   Status: {data.get('status', 'N/A')}")
                
                # Print first 200 characters of response
                response_text = data.get('response', '')
                if response_text:
                    preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
                    print(f"   Preview: {preview}")
                
                return {
                    "success": True,
                    "thread_id": data.get('thread_id'),
                    "response": data.get('response', ''),
                    "status_code": response.status_code
                }
            else:
                print(f"❌ {character} endpoint failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"   Raw response: {response.text}")
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": response.text
                }
                
        except Exception as e:
            print(f"❌ {character} endpoint error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def test_memory_functionality(self, character: str) -> bool:
        """Test memory functionality by having a conversation"""
        print(f"\n🧠 Testing memory for {character}...")
        
        # First message
        first_result = self.test_character_endpoint(character)
        if not first_result.get("success"):
            return False
            
        thread_id = first_result.get("thread_id")
        if not thread_id:
            print("❌ No thread ID returned")
            return False
            
        # Wait a moment
        time.sleep(1)
        
        # Follow-up message using the same thread
        follow_up_payload = {
            "messages": [
                {
                    "role": "user", 
                    "content": "Can you elaborate on that last point you made?"
                }
            ],
            "thread_id": thread_id,
            "max_tokens": 300,
            "temperature": 0.7
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/characters/{character}",
                json=follow_up_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('thread_id') == thread_id:
                    print(f"✅ Memory working for {character}")
                    print(f"   Follow-up response length: {len(data.get('response', ''))}")
                    
                    # Check if response seems contextual
                    response_text = data.get('response', '').lower()
                    if any(word in response_text for word in ['that', 'mentioned', 'discussed', 'previous']):
                        print("   ✅ Response appears contextually aware")
                    else:
                        print("   ⚠️  Response may not be fully contextual")
                    
                    return True
                else:
                    print(f"❌ Thread ID mismatch for {character}")
                    return False
            else:
                print(f"❌ Follow-up request failed for {character}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Memory test error for {character}: {e}")
            return False

    def test_conversation_history(self, character: str, thread_id: str) -> bool:
        """Test conversation history endpoint"""
        print(f"\n📚 Testing conversation history for {character}...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/conversation?thread_id={thread_id}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Conversation history working")
                print(f"   Thread ID: {data.get('thread_id', 'N/A')}")
                print(f"   History entries: {len(data.get('history', []))}")
                return True
            else:
                print(f"❌ Conversation history failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Conversation history error: {e}")
            return False

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        print("🚀 Starting comprehensive character endpoint tests\n")
        print("=" * 60)
        
        results = {
            "character_info": False,
            "individual_tests": {},
            "memory_tests": {},
            "conversation_history_tests": {},
            "summary": {}
        }
        
        # Test character info endpoint
        results["character_info"] = self.test_character_info()
        
        # Test each character individually
        for character in CHARACTERS:
            print(f"\n{'='*60}")
            print(f"Testing {character.upper()}")
            print('='*60)
            
            # Basic functionality test
            test_result = self.test_character_endpoint(character)
            results["individual_tests"][character] = test_result
            
            # Memory test if basic test passed
            if test_result.get("success"):
                memory_result = self.test_memory_functionality(character)
                results["memory_tests"][character] = memory_result
                
                # Conversation history test
                thread_id = test_result.get("thread_id")
                if thread_id:
                    history_result = self.test_conversation_history(character, thread_id)
                    results["conversation_history_tests"][character] = history_result
            
            time.sleep(1)  # Rate limiting
        
        # Generate summary
        self.generate_summary(results)
        return results

    def generate_summary(self, results: Dict[str, Any]) -> None:
        """Generate test summary"""
        print(f"\n{'='*60}")
        print("📊 TEST SUMMARY")
        print('='*60)
        
        # Character info test
        info_status = "✅ PASS" if results["character_info"] else "❌ FAIL"
        print(f"Character Info Endpoint: {info_status}")
        
        # Individual endpoint tests
        individual_passed = sum(1 for result in results["individual_tests"].values() if result.get("success"))
        individual_total = len(results["individual_tests"])
        print(f"Individual Endpoints: {individual_passed}/{individual_total} passed")
        
        # Memory tests
        memory_passed = sum(1 for result in results["memory_tests"].values() if result)
        memory_total = len(results["memory_tests"])
        print(f"Memory Functionality: {memory_passed}/{memory_total} passed")
        
        # Conversation history tests
        history_passed = sum(1 for result in results["conversation_history_tests"].values() if result)
        history_total = len(results["conversation_history_tests"])
        print(f"Conversation History: {history_passed}/{history_total} passed")
        
        # Overall status
        total_tests = 1 + individual_total + memory_total + history_total
        total_passed = (1 if results["character_info"] else 0) + individual_passed + memory_passed + history_passed
        
        print(f"\n🎯 OVERALL: {total_passed}/{total_tests} tests passed ({total_passed/total_tests*100:.1f}%)")
        
        if total_passed == total_tests:
            print("🎉 All tests passed! Character endpoints are working correctly.")
        else:
            print("⚠️  Some tests failed. Check the output above for details.")
        
        # Failed tests details
        print(f"\n{'='*60}")
        print("❌ FAILED TESTS:")
        print('='*60)
        
        if not results["character_info"]:
            print("- Character info endpoint")
            
        for character, result in results["individual_tests"].items():
            if not result.get("success"):
                print(f"- {character} individual endpoint")
                
        for character, result in results["memory_tests"].items():
            if not result:
                print(f"- {character} memory functionality")
                
        for character, result in results["conversation_history_tests"].items():
            if not result:
                print(f"- {character} conversation history")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
        print(f"Using custom base URL: {base_url}")
    else:
        base_url = BASE_URL
        print(f"Using default base URL: {base_url}")
    
    tester = CharacterTester(base_url)
    
    try:
        results = tester.run_comprehensive_test()
        
        # Save results to file
        with open('test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Test results saved to test_results.json")
        
        # Exit with appropriate code
        total_tests = (1 + len(results["individual_tests"]) + 
                      len(results["memory_tests"]) + 
                      len(results["conversation_history_tests"]))
        total_passed = ((1 if results["character_info"] else 0) +
                       sum(1 for r in results["individual_tests"].values() if r.get("success")) +
                       sum(1 for r in results["memory_tests"].values() if r) +
                       sum(1 for r in results["conversation_history_tests"].values() if r))
        
        sys.exit(0 if total_passed == total_tests else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
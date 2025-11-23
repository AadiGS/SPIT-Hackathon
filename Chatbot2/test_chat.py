"""
Test script for the memory-enabled chatbot API
Run this after starting the backend with: uvicorn app:app --reload
"""
import requests
import time

BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test the health check endpoint"""
    print("=" * 60)
    print("Testing Health Check...")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print()


def test_chat_conversation():
    """Test a multi-turn conversation with memory"""
    print("=" * 60)
    print("Testing Multi-Turn Conversation with Memory...")
    print("=" * 60)
    
    user_id = "test_user_001"
    
    # First message
    print("\n--- Turn 1 ---")
    response1 = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": user_id,
            "question": "What is the revenue for Q1?",
            "context": {"revenue": {"Q1": 50000, "Q2": 60000, "Q3": 75000}}
        }
    )
    print(f"Status Code: {response1.status_code}")
    result1 = response1.json()
    print(f"Answer: {result1['answer']}")
    print(f"Memory Used: {result1['memory_used']}")
    print(f"Messages in Memory: {result1['messages_in_memory']}")
    
    time.sleep(1)
    
    # Second message - should have memory of first message
    print("\n--- Turn 2 ---")
    response2 = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": user_id,
            "question": "And what about Q2?",
            "context": {"revenue": {"Q1": 50000, "Q2": 60000, "Q3": 75000}}
        }
    )
    print(f"Status Code: {response2.status_code}")
    result2 = response2.json()
    print(f"Answer: {result2['answer']}")
    print(f"Memory Used: {result2['memory_used']}")
    print(f"Messages in Memory: {result2['messages_in_memory']}")
    
    time.sleep(1)
    
    # Third message - referring to previous context
    print("\n--- Turn 3 ---")
    response3 = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": user_id,
            "question": "Compare the quarters I asked about earlier.",
            "context": {}
        }
    )
    print(f"Status Code: {response3.status_code}")
    result3 = response3.json()
    print(f"Answer: {result3['answer']}")
    print(f"Memory Used: {result3['memory_used']}")
    print(f"Messages in Memory: {result3['messages_in_memory']}")
    print()


def test_get_memory():
    """Test retrieving user memory"""
    print("=" * 60)
    print("Testing Memory Retrieval...")
    print("=" * 60)
    
    user_id = "test_user_001"
    response = requests.get(f"{BASE_URL}/memory/{user_id}")
    print(f"Status Code: {response.status_code}")
    result = response.json()
    print(f"User ID: {result['user_id']}")
    print(f"Message Count: {result['message_count']}")
    print("\nMessages:")
    for i, msg in enumerate(result['messages'], 1):
        print(f"{i}. [{msg['role'].upper()}]: {msg['content'][:100]}...")
    print()


def test_different_users():
    """Test that different users have separate memories"""
    print("=" * 60)
    print("Testing Separate User Memories...")
    print("=" * 60)
    
    # User A
    print("\n--- User A ---")
    response_a = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": "user_a",
            "question": "My favorite product is Product A.",
            "context": {}
        }
    )
    print(f"User A Response: {response_a.json()['answer'][:100]}...")
    
    time.sleep(1)
    
    # User B
    print("\n--- User B ---")
    response_b = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": "user_b",
            "question": "My favorite product is Product B.",
            "context": {}
        }
    )
    print(f"User B Response: {response_b.json()['answer'][:100]}...")
    
    time.sleep(1)
    
    # User A asks about their preference (should remember Product A)
    print("\n--- User A Follow-up ---")
    response_a2 = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": "user_a",
            "question": "What did I say my favorite product was?",
            "context": {}
        }
    )
    print(f"User A Follow-up: {response_a2.json()['answer'][:100]}...")
    print(f"Memory Count: {response_a2.json()['messages_in_memory']}")
    print()


def test_clear_memory():
    """Test clearing user memory"""
    print("=" * 60)
    print("Testing Memory Clearing...")
    print("=" * 60)
    
    user_id = "test_user_001"
    
    # Check memory before clearing
    before = requests.get(f"{BASE_URL}/memory/{user_id}")
    print(f"Messages before clearing: {before.json()['message_count']}")
    
    # Clear memory
    clear_response = requests.delete(f"{BASE_URL}/memory/{user_id}")
    print(f"Clear response: {clear_response.json()}")
    
    # Check memory after clearing
    after = requests.get(f"{BASE_URL}/memory/{user_id}")
    print(f"Messages after clearing: {after.json()['message_count']}")
    print()


if __name__ == "__main__":
    try:
        print("\n🚀 Starting API Tests...\n")
        
        test_health_check()
        test_chat_conversation()
        test_get_memory()
        test_different_users()
        test_clear_memory()
        
        print("=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to the API.")
        print("Make sure the backend is running:")
        print("  uvicorn app:app --reload")
        print("\nAlso ensure LM Studio is running on http://127.0.0.1:1234")
    except Exception as e:
        print(f"\n❌ Error: {e}")


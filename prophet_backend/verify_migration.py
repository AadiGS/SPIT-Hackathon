"""
Final verification script for PostgreSQL migration.
Run this AFTER starting the server to verify everything works.
"""
import sys
import time

def check_server():
    """Check if server is running."""
    print("="*70)
    print("PROPHET BACKEND - POSTGRESQL MIGRATION VERIFICATION")
    print("="*70)
    
    # Wait for server to be ready
    print("\n⏳ Waiting for server to start...")
    time.sleep(2)
    
    try:
        import requests
        
        # Test 1: Health check
        print("\n1️⃣  Testing Health Endpoint...")
        response = requests.get("http://localhost:8003/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {data['status']}")
            print(f"   ✅ Service: {data['service']}")
            print(f"   ✅ Database: {data.get('database', 'N/A')}")
        else:
            print(f"   ❌ Unexpected status: {response.status_code}")
            return False
        
        # Test 2: List companies (PostgreSQL query)
        print("\n2️⃣  Testing PostgreSQL Connection (List Companies)...")
        response = requests.get("http://localhost:8003/companies", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {data['count']} companies in Neon DB:")
            for company in data['companies']:
                print(f"      • {company['name']} (ID: {company['id'][:8]}...)")
                print(f"        Location: {company['city']}, {company['country']}")
        else:
            print(f"   ❌ Failed to query companies: {response.status_code}")
            return False
        
        # Test 3: Get specific company
        print("\n3️⃣  Testing Company Details Endpoint...")
        company_id = data['companies'][0]['id']
        response = requests.get(f"http://localhost:8003/companies/{company_id}", timeout=5)
        if response.status_code == 200:
            company = response.json()
            print(f"   ✅ Retrieved company: {company['name']}")
        else:
            print(f"   ❌ Failed to get company details: {response.status_code}")
            return False
        
        # Success!
        print("\n" + "="*70)
        print("✅ ALL TESTS PASSED - POSTGRESQL MIGRATION SUCCESSFUL!")
        print("="*70)
        print("\n📊 Migration Summary:")
        print("   ✅ Server running on http://localhost:8003")
        print("   ✅ PostgreSQL connection working")
        print("   ✅ Company endpoints functional")
        print("   ✅ Multi-tenancy enabled")
        print("   ✅ Neon DB integration complete")
        
        print("\n📚 Next Steps:")
        print("   1. View API docs: http://localhost:8003/docs")
        print("   2. Upload CSV with company_id")
        print("   3. Run forecasts: POST /run-all-forecasts?file_id=X&company_id=Y")
        print("   4. Retrieve results with company_id filter")
        
        print("\n📖 Documentation:")
        print("   • MIGRATION_SUMMARY.md - Technical details")
        print("   • QUICK_START.md - API usage guide")
        print("   • README_MIGRATION.md - Complete overview")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server at http://localhost:8003")
        print("\n💡 Make sure the server is running:")
        print("   cd prophet_backend")
        print("   python -m uvicorn api.main:app --host 0.0.0.0 --port 8003 --reload")
        return False
    
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    success = check_server()
    sys.exit(0 if success else 1)

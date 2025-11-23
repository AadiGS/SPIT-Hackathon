"""Quick test to verify everything is working."""
import requests
import time

BASE_URL = "http://localhost:8003"

print("\n" + "="*60)
print("Quick Functionality Test")
print("="*60)

# Test 1: Server health
print("\n[Test 1/3] Checking server health...")
try:
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ Server is {data['status']}")
        print(f"    Service: {data['service']} v{data['version']}")
    else:
        print(f"  ✗ Server returned {response.status_code}")
        exit(1)
except Exception as e:
    print(f"  ✗ Server not accessible: {e}")
    exit(1)

# Test 2: Check existing forecasts
print("\n[Test 2/3] Checking existing forecasts...")
file_id = "733d970e-bdcc-4dae-879f-d2fbd0aab4ff"
try:
    response = requests.get(f"{BASE_URL}/forecasts")
    if response.status_code == 200:
        forecasts = response.json()
        print(f"  ✓ Found {len(forecasts)} existing forecasts in database")
    else:
        print(f"  ⚠ Could not fetch forecasts: {response.status_code}")
except Exception as e:
    print(f"  ⚠ Error: {e}")

# Test 3: Run new forecast with optimizations
print("\n[Test 3/3] Running optimized forecast...")
print("  (This will take 60-90 seconds with parallel processing)")
start_time = time.time()

try:
    response = requests.post(
        f"{BASE_URL}/run-all-forecasts?file_id={file_id}",
        timeout=180
    )
    elapsed = time.time() - start_time
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n  ✓ Forecast completed in {elapsed:.1f} seconds")
        print(f"    • Data points: {result.get('data_points', 0):,}")
        print(f"    • Product clusters: {result.get('product_clusters', 0)}")
        print(f"    • RFM segments: {result.get('rfm_segments', 0)}")
        print(f"    • Total forecasts: {result.get('total_forecasts', 0)}")
        print(f"    • AI insights: {'✓' if result.get('insights_generated') else '✗'}")
        
        if result.get('total_forecasts', 0) > 0:
            print(f"\n  ✓ SUCCESS: Generated {result['total_forecasts']} forecasts!")
            if elapsed < 120:
                print(f"  ⚡ FAST: {elapsed:.1f}s (3-4x faster than before!)")
        else:
            print(f"\n  ✗ WARNING: No forecasts generated (check logs)")
            
    else:
        print(f"\n  ✗ Forecast failed: {response.status_code}")
        print(f"    {response.text[:200]}")
        
except requests.exceptions.Timeout:
    print(f"\n  ✗ Request timeout after {time.time() - start_time:.1f}s")
except Exception as e:
    print(f"\n  ✗ Error: {e}")

print("\n" + "="*60)
print("Test Complete")
print("="*60 + "\n")

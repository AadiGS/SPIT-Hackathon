"""
Quick test script for blockchain integration.
Tests the complete flow: compile → deploy → log forecast → retrieve
"""

import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from blockchain.blockchain_logger import BlockchainLogger

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Run complete blockchain integration test."""
    
    print("\n" + "="*60)
    print("BLOCKCHAIN INTEGRATION TEST")
    print("="*60 + "\n")
    
    try:
        # Step 1: Initialize
        print("Step 1: Connecting to Ganache...")
        bc_logger = BlockchainLogger()
        print("✓ Connected to Ganache\n")
        
        # Step 2: Deploy contract
        print("Step 2: Compiling and deploying smart contract...")
        contract_address = bc_logger.compile_and_deploy()
        print(f"✓ Contract deployed at: {contract_address}\n")
        
        # Step 3: Log multiple forecasts (simulating ML pipeline)
        test_forecasts = [
            12500.75,
            15000.00,
            18250.50
        ]
        
        print("Step 3: Logging forecasts to blockchain...")
        for i, forecast in enumerate(test_forecasts, 1):
            print(f"\n  Forecast #{i}: ${forecast:,.2f}")
            result = bc_logger.log_forecast(forecast)
            print(f"    → Transaction: {result['transaction_hash'][:20]}...")
            print(f"    → Block: {result['block_number']}")
            print(f"    → Gas Used: {result['gas_used']}")
        
        # Step 4: Retrieve latest
        print("\nStep 4: Retrieving latest forecast from blockchain...")
        latest = bc_logger.get_latest_forecast()
        print(f"✓ Latest stored forecast: ${latest['forecast_value']:,.2f}")
        print(f"  Timestamp: {latest['timestamp']}")
        
        # Summary
        print("\n" + "="*60)
        print("✓ ALL TESTS PASSED!")
        print("="*60)
        print("\nBlockchain Integration Summary:")
        print(f"  • Contract Address: {contract_address}")
        print(f"  • Total Forecasts Logged: {len(test_forecasts)}")
        print(f"  • Latest Value: ${latest['forecast_value']:,.2f}")
        print("\n✓ Ready for production use!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        logger.error("Test failed", exc_info=True)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

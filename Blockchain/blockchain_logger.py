"""
Blockchain logging module for ML forecasts.
Integrates with Ganache local blockchain to store forecast values.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Optional
from web3 import Web3
from solcx import compile_standard, install_solc
import sys

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import GANACHE_URL, BLOCKCHAIN_TIMEOUT

logger = logging.getLogger(__name__)

CONTRACT_PATH = Path(__file__).parent / "ForecastLogger.sol"


class BlockchainLogger:
    """Handle blockchain logging of forecast values."""
    
    def __init__(self, ganache_url: str = GANACHE_URL):
        """
        Initialize blockchain connection.
        
        Args:
            ganache_url: Ganache RPC URL
        """
        self.w3 = Web3(Web3.HTTPProvider(ganache_url))
        self.contract = None
        self.contract_address = None
        self.account = None
        
        # Check connection
        if not self.w3.is_connected():
            raise ConnectionError(f"Cannot connect to Ganache at {ganache_url}")
        
        logger.info(f"✓ Connected to Ganache at {ganache_url}")
        
        # Get default account (first account from Ganache)
        self.account = self.w3.eth.accounts[0]
        logger.info(f"✓ Using account: {self.account}")
    
    def compile_and_deploy(self) -> str:
        """
        Compile Solidity contract and deploy to Ganache.
        
        Returns:
            Contract address
        """
        logger.info("Compiling smart contract...")
        
        # Install Solidity compiler if needed
        try:
            install_solc('0.8.0')
        except:
            pass  # Already installed
        
        # Read contract source
        with open(CONTRACT_PATH, 'r') as f:
            contract_source = f.read()
        
        # Compile contract
        compiled_sol = compile_standard(
            {
                "language": "Solidity",
                "sources": {"ForecastLogger.sol": {"content": contract_source}},
                "settings": {
                    "outputSelection": {
                        "*": {
                            "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                        }
                    }
                },
            },
            solc_version="0.8.0",
        )
        
        # Extract bytecode and ABI
        contract_data = compiled_sol["contracts"]["ForecastLogger.sol"]["ForecastLogger"]
        bytecode = contract_data["evm"]["bytecode"]["object"]
        abi = contract_data["abi"]
        
        logger.info("✓ Contract compiled successfully")
        
        # Deploy contract
        logger.info("Deploying contract to Ganache...")
        
        ForecastLogger = self.w3.eth.contract(abi=abi, bytecode=bytecode)
        
        # Build transaction
        tx_hash = ForecastLogger.constructor().transact({'from': self.account})
        
        # Wait for transaction receipt
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        self.contract_address = tx_receipt.contractAddress
        
        # Create contract instance
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=abi
        )
        
        logger.info(f"✓ Contract deployed at: {self.contract_address}")
        logger.info(f"✓ Deployment tx: {tx_hash.hex()}")
        logger.info(f"✓ Block number: {tx_receipt.blockNumber}")
        
        return self.contract_address
    
    def log_forecast(self, forecast_value: float) -> Dict:
        """
        Store forecast value on blockchain.
        
        Args:
            forecast_value: Forecast amount in dollars (e.g., 1500.50)
            
        Returns:
            Dictionary with transaction details
        """
        if not self.contract:
            raise RuntimeError("Contract not deployed. Call compile_and_deploy() first.")
        
        # Convert dollars to cents (uint256)
        value_in_cents = int(forecast_value * 100)
        
        logger.info(f"Logging forecast to blockchain: ${forecast_value:,.2f} ({value_in_cents} cents)")
        
        # Call storeForecast function
        tx_hash = self.contract.functions.storeForecast(value_in_cents).transact({
            'from': self.account
        })
        
        # Wait for confirmation
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Get stored value to verify
        stored_value, timestamp = self.contract.functions.getLatestForecast().call()
        
        result = {
            'success': True,
            'transaction_hash': tx_hash.hex(),
            'block_number': tx_receipt.blockNumber,
            'contract_address': self.contract_address,
            'forecast_value': forecast_value,
            'stored_value_cents': stored_value,
            'timestamp': timestamp,
            'gas_used': tx_receipt.gasUsed
        }
        
        logger.info(f"✓ Forecast logged successfully!")
        logger.info(f"  Transaction: {result['transaction_hash']}")
        logger.info(f"  Block: {result['block_number']}")
        logger.info(f"  Stored: ${stored_value / 100:,.2f}")
        
        return result
    
    def get_latest_forecast(self) -> Dict:
        """
        Retrieve latest forecast from blockchain.
        
        Returns:
            Dictionary with stored forecast data
        """
        if not self.contract:
            raise RuntimeError("Contract not deployed.")
        
        stored_value, timestamp = self.contract.functions.getLatestForecast().call()
        
        return {
            'forecast_value': stored_value / 100,  # Convert cents to dollars
            'timestamp': timestamp,
            'contract_address': self.contract_address
        }


def quick_test():
    """Quick test of blockchain logging."""
    logger.info("=== Testing Blockchain Logger ===")
    
    # Initialize
    bc_logger = BlockchainLogger()
    
    # Deploy contract
    address = bc_logger.compile_and_deploy()
    
    # Log a test forecast
    test_value = 15000.50
    result = bc_logger.log_forecast(test_value)
    
    print("\n✓ Blockchain Logging Test Successful!")
    print(f"  Contract: {result['contract_address']}")
    print(f"  Transaction: {result['transaction_hash']}")
    print(f"  Block: {result['block_number']}")
    print(f"  Stored Value: ${result['forecast_value']:,.2f}")
    
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    quick_test()

# Blockchain Integration - Quick Install Script
# Run this after setting up Ganache

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Blockchain Integration Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Python packages
Write-Host "Step 1: Installing Python dependencies..." -ForegroundColor Yellow
pip install web3==6.11.3 py-solc-x==2.0.2

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python packages installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install packages" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Install Solidity compiler
Write-Host "Step 2: Installing Solidity compiler..." -ForegroundColor Yellow
python -c "from solcx import install_solc; install_solc('0.8.0')"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Solidity compiler installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install Solidity compiler" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Check Ganache connection
Write-Host "Step 3: Checking Ganache connection..." -ForegroundColor Yellow
$ganacheUrl = "http://127.0.0.1:7545"

try {
    $response = Invoke-WebRequest -Uri $ganacheUrl -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Ganache is running at $ganacheUrl" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot connect to Ganache at $ganacheUrl" -ForegroundColor Red
    Write-Host "  Please start Ganache first:" -ForegroundColor Yellow
    Write-Host "  - Download from: https://trufflesuite.com/ganache/" -ForegroundColor Yellow
    Write-Host "  - Or run: ganache-cli -p 7545" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 4: Run test
Write-Host "Step 4: Running blockchain integration test..." -ForegroundColor Yellow
python test_blockchain.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✓ SETUP COMPLETE!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your ML pipeline is now blockchain-enabled!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Start your API: uvicorn api.main:app --reload --port 8001"
    Write-Host "  2. Upload CSV and run forecasts"
    Write-Host "  3. Check blockchain field in API response"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Test failed. Check the errors above." -ForegroundColor Red
    exit 1
}

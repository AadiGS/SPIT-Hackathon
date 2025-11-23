// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ForecastLogger
 * @dev Simple contract to log ML forecast values on blockchain
 */
contract ForecastLogger {
    // Latest forecast value (in cents to avoid decimals)
    uint256 public latestForecast;
    
    // Timestamp of last update
    uint256 public lastUpdated;
    
    // Event emitted when forecast is stored
    event ForecastStored(uint256 value, uint256 timestamp, address updatedBy);
    
    /**
     * @dev Store a new forecast value
     * @param _value Forecast value in cents (e.g., 150000 = $1500.00)
     */
    function storeForecast(uint256 _value) public {
        latestForecast = _value;
        lastUpdated = block.timestamp;
        emit ForecastStored(_value, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Get the latest forecast
     * @return value Latest forecast value
     * @return timestamp When it was stored
     */
    function getLatestForecast() public view returns (uint256 value, uint256 timestamp) {
        return (latestForecast, lastUpdated);
    }
}

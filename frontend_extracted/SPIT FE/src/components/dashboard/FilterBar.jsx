import React from 'react';
import { Calendar, MapPin, Tag, TrendingUp } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';

export default function FilterBar() {
    const {
        dateRange,
        selectedRegion,
        selectedCategory,
        dataMode,
        availableRegions,
        availableCategories,
        setDateRange,
        setSelectedRegion,
        setSelectedCategory,
        getDateOptions
    } = useFilters();

    const dateOptions = getDateOptions();

    return (
        <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Filters Label */}
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="font-medium">Filters:</span>
            </div>

            {/* Date Range Filter */}
            <div className="relative">
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none bg-gray-800 text-white px-4 py-2 pr-10 rounded-lg border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    {dateOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Region Filter */}
            <div className="relative">
                <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="appearance-none bg-gray-800 text-white px-4 py-2 pr-10 rounded-lg border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    <option value="all">All Regions</option>
                    {availableRegions.map(region => (
                        <option key={region} value={region}>
                            {region}
                        </option>
                    ))}
                </select>
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Category Filter (Product Clusters) */}
            <div className="relative">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-gray-800 text-white px-4 py-2 pr-10 rounded-lg border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    <option value="all">All Categories</option>
                    {availableCategories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Predictions Mode Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-900/20 text-blue-300">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Predictions Mode</span>
            </div>
        </div>
    );
}


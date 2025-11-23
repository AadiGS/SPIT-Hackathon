import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { dataAPI } from '../services/api';

const FilterContext = createContext();

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};

export const FilterProvider = ({ children }) => {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    
    // Filter state
    const [dateRange, setDateRange] = useState('all'); // 'all', 'week1', 'week2', 'week3', 'week4'
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    // Always show predictions only
    const dataMode = 'predicted';
    
    // Dynamic options
    const [availableRegions, setAvailableRegions] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch filter options when file is uploaded
    useEffect(() => {
        const fetchFilterOptions = async () => {
            if (!fileId || !user || !isDataUploaded) return;
            
            setLoading(true);
            try {
                // Fetch available regions and categories in one call
                const filterOptions = await dataAPI.getFilterOptions(fileId, user.company_id);
                
                // Set regions (countries)
                setAvailableRegions(filterOptions.regions || []);
                
                // Set categories (product clusters)
                const clusters = filterOptions.categories?.map(c => ({
                    id: c.id,
                    name: c.name || `Cluster ${c.id}`
                })) || [];
                setAvailableCategories(clusters);
                
                console.log('Loaded filter options:', {
                    regions: filterOptions.regions?.length,
                    categories: clusters.length
                });
                
            } catch (error) {
                console.error('Failed to fetch filter options:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFilterOptions();
    }, [fileId, user, isDataUploaded]);

    // Get date filter options (predictions only)
    const getDateOptions = () => {
        return [
            { value: 'all', label: 'All 4 Weeks Ahead' },
            { value: 'week1', label: 'Week 1' },
            { value: 'week2', label: 'Week 2' },
            { value: 'week3', label: 'Week 3' },
            { value: 'week4', label: 'Week 4' }
        ];
    };

    const value = {
        // State
        dateRange,
        selectedRegion,
        selectedCategory,
        dataMode, // Always 'predicted'
        availableRegions,
        availableCategories,
        loading,
        
        // Setters
        setDateRange,
        setSelectedRegion,
        setSelectedCategory,
        
        // Helpers
        getDateOptions,
        
        // Check if filters are active
        hasActiveFilters: selectedRegion !== 'all' || selectedCategory !== 'all' || dateRange !== 'all'
    };

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};


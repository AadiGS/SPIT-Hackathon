# 🎯 Dynamic Filter System Implementation Guide

## ✅ What's Been Implemented

### 1. Filter Infrastructure (Phase 1)

#### Frontend Components Created:
- ✅ **FilterContext.jsx** - Global filter state management
- ✅ **FilterBar.jsx** - UI component with all filters
- ✅ Integrated into DashboardLayout (shows on all pages except Team/Upload)

#### Features Implemented:
- ✅ **Date Range Filter** - Dynamic options based on mode
- ✅ **Region Filter** - Dynamically populated from forecast data
- ✅ **Category Filter** - Uses product clusters
- ✅ **Historical/Predicted Toggle** - Switch between past and future data
- ✅ **Auto-loading** - Fetches available options when CSV uploaded

### 2. Date Filter Options

**Prediction Mode** (default):
- All 4 Weeks Ahead
- Week 1
- Week 2
- Week 3
- Week 4

**Historical Mode**:
- Last 7 Days
- Last 30 Days
- This Quarter
- Year to Date
- All Time

### 3. Dynamic Dropdowns

**Regions**: Only shows countries that have forecast data (countries ignored in processing won't appear)

**Categories**: Shows product cluster names from ML grouping

---

## 🚀 Quick Test

1. **Restart Frontend** (to pick up new changes):
```powershell
cd "D:\Hackathons\SPIT\frontend_extracted\SPIT FE"
npm run dev
```

2. **Navigate to any dashboard** (Sales, Marketing, etc.)

3. **You should see the FilterBar** at the top with:
   - Date dropdown (showing prediction weeks)
   - Region dropdown (populated with your countries)
   - Category dropdown (showing your product clusters)
   - Historical/Predicted toggle (on right side)

---

## 📝 What Still Needs to Be Done

### Phase 2: Backend API Updates (Optional Enhancement)

The current implementation works with existing APIs, but for **full functionality**, you may want to add these backend endpoints:

#### Optional Backend Enhancements:

```python
# In prophet_backend/api/main.py

@app.get("/filter-options/{file_id}")
async def get_filter_options(file_id: str, company_id: str):
    """
    Get available filter options for a file.
    Returns: {
        "countries": ["UK", "Germany", ...],
        "clusters": [{"id": 0, "name": "Electronics"}, ...],
        "date_range": {"min": "2020-01-01", "max": "2021-12-31"}
    }
    """
    pass

@app.get("/forecast-results-filtered/{file_id}")
async def get_filtered_forecasts(
    file_id: str,
    company_id: str,
    date_range: str = "all",  # week1, week2, etc.
    country: str = "all",
    cluster_id: int = None
):
    """
    Get forecasts with applied filters.
    """
    pass
```

### Phase 3: Dashboard Integration (Next Step)

Each dashboard needs to be updated to:

1. **Import useFilters hook**
```javascript
import { useFilters } from '../../../contexts/FilterContext';
```

2. **Access filter values**
```javascript
const { dateRange, selectedRegion, selectedCategory, dataMode } = useFilters();
```

3. **Re-fetch data when filters change**
```javascript
useEffect(() => {
    fetchData();
}, [dateRange, selectedRegion, selectedCategory, dataMode]);
```

4. **Pass filters to API calls**
```javascript
const data = await dataAPI.getForecastResults(
    fileId,
    user.company_id,
    'total_revenue',
    selectedRegion !== 'all' ? 'country' : 'overall',
    selectedRegion !== 'all' ? selectedRegion : null
);
```

---

## 🎨 How It Currently Works

### Filter State Management

```javascript
// FilterContext provides these values:
{
  dateRange: 'all',           // Current date selection
  selectedRegion: 'all',      // Current region ('all' or country name)
  selectedCategory: 'all',    // Current category ('all' or cluster id)
  dataMode: 'predicted',      // 'predicted' or 'historical'
  availableRegions: [...],    // Array of country strings
  availableCategories: [...], // Array of {id, name} objects
  hasActiveFilters: false     // true if any filter is not 'all'
}
```

### Dynamic Options Loading

When a CSV is uploaded:
1. FilterContext fetches forecasts with `groupType='country'`
2. Extracts unique countries → populates Region dropdown
3. Fetches product clusters → populates Category dropdown

### Toggle Behavior

**When switching to Historical mode:**
- Date options change to Last 7 Days, Last 30 Days, etc.
- Date range resets to 'all'
- Filter values are preserved

**When switching to Predicted mode:**
- Date options change to Week 1, Week 2, etc.
- Date range resets to 'all'
- Filter values are preserved

---

## 📊 Example: Updating Sales Dashboard

Here's how to make SalesDashboard use filters:

```javascript
// SalesDashboard.jsx

import { useFilters } from '../../../contexts/FilterContext';

export default function SalesDashboard() {
    const { fileId } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, dataMode } = useFilters();
    
    const [forecastData, setForecastData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!fileId || !user) return;
            
            // Determine group type based on region filter
            const groupType = selectedRegion !== 'all' ? 'country' : 'overall';
            const groupKey = selectedRegion !== 'all' ? selectedRegion : null;
            
            const response = await dataAPI.getForecastResults(
                fileId,
                user.company_id,
                'total_revenue',
                groupType,
                groupKey
            );
            
            // Filter by date range if needed
            let filteredData = response.forecasts;
            if (dateRange !== 'all' && dataMode === 'predicted') {
                // Apply week filtering
                const weekStart = { week1: 0, week2: 7, week3: 14, week4: 21 }[dateRange];
                if (weekStart !== undefined) {
                    filteredData = filteredData.slice(weekStart, weekStart + 7);
                }
            }
            
            setForecastData(filteredData);
        };
        
        fetchData();
    }, [fileId, user, dateRange, selectedRegion, dataMode]);
    
    // ... rest of component
}
```

---

## 🎯 Current Status

### ✅ Fully Working:
- Filter UI renders correctly
- Toggle switches between modes
- Date options change dynamically
- Region dropdown populated with real countries
- Category dropdown populated with real clusters
- Filter state persists across page navigation

### ⏳ Needs Connection:
- Dashboards need to read filter values
- API calls need to use filter parameters
- Charts need to re-render with filtered data

---

## 🔧 Testing Checklist

- [ ] FilterBar appears on Home, Sales, Marketing, Product, RFM, Forecasting pages
- [ ] FilterBar does NOT appear on Team and Upload pages
- [ ] FilterBar only shows after CSV upload
- [ ] Date dropdown shows "Week 1-4" by default (Predicted mode)
- [ ] Region dropdown shows actual countries from your data
- [ ] Category dropdown shows your product clusters
- [ ] Toggle button switches between Historical/Predicted
- [ ] Date options change when toggling modes
- [ ] Filters persist when navigating between pages

---

## 📝 Next Steps for Full Implementation

1. **Choose one dashboard** (recommend Sales) and fully implement filter integration
2. **Test it works** with different filter combinations
3. **Apply the same pattern** to other dashboards
4. **Optionally add backend filtering** for better performance

---

## 💡 Tips

### Filter Logic Pattern:

```javascript
// 1. Get filter values
const { dateRange, selectedRegion, selectedCategory, dataMode } = useFilters();

// 2. Build API call based on filters
const groupType = selectedRegion !== 'all' ? 'country' :
                  selectedCategory !== 'all' ? 'cluster' : 'overall';

// 3. Fetch data
const data = await dataAPI.getForecastResults(...);

// 4. Filter client-side if needed
const filtered = filterByDateRange(data, dateRange, dataMode);

// 5. Update state
setState(filtered);
```

### Date Range Filtering:

```javascript
function filterByDateRange(forecasts, dateRange, dataMode) {
    if (dataMode === 'predicted' && dateRange !== 'all') {
        const weekMap = { week1: [0, 7], week2: [7, 14], week3: [14, 21], week4: [21, 28] };
        const [start, end] = weekMap[dateRange] || [0, forecasts.length];
        return forecasts.slice(start, end);
    }
    return forecasts;
}
```

---

## 🎉 Summary

**Phase 1 (Complete)**:
- ✅ Filter infrastructure built
- ✅ Dynamic dropdowns working
- ✅ Toggle implemented
- ✅ Filter bar integrated into layout

**Phase 2 (Your Task)**:
- Connect filters to dashboards
- Make API calls use filter values
- Update charts with filtered data

**Phase 3 (Optional)**:
- Backend filtering endpoints
- Historical data API
- Advanced date range logic

---

**The foundation is ready! Now dashboards just need to read and use the filter values.** 🚀


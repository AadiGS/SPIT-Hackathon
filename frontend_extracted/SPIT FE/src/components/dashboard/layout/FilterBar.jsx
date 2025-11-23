import React, { useState } from 'react';
import { Calendar, MapPin, Tag, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { cn } from "@/lib/utils";

function FilterDropdown({ value, onChange, options, icon: Icon, className }) {
    const selectedLabel = options.find(opt => opt.value === value)?.label || value;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-between h-10 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-normal",
                        className
                    )}
                >
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                        <span className="truncate">
                            {selectedLabel}
                        </span>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700",
                            value === option.value && "bg-gray-100 dark:bg-gray-800 font-medium"
                        )}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function FilterBar() {
    const [dateRange, setDateRange] = useState('last-30-days');
    const [region, setRegion] = useState('all');
    const [category, setCategory] = useState('all');

    return (
        <div className="bg-background border-b border-border p-4 sticky top-0 z-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Date Range Filter */}
                    <FilterDropdown
                        value={dateRange}
                        onChange={setDateRange}
                        icon={Calendar}
                        className="w-[200px]"
                        options={[
                            { value: 'today', label: 'Today' },
                            { value: 'yesterday', label: 'Yesterday' },
                            { value: 'last-7-days', label: 'Last 7 Days' },
                            { value: 'last-30-days', label: 'Last 30 Days' },
                            { value: 'this-quarter', label: 'This Quarter' },
                            { value: 'year-to-date', label: 'Year to Date' },
                        ]}
                    />

                    {/* Region Filter */}
                    <FilterDropdown
                        value={region}
                        onChange={setRegion}
                        icon={MapPin}
                        className="w-[180px]"
                        options={[
                            { value: 'all', label: 'All Regions' },
                            { value: 'na', label: 'North America' },
                            { value: 'eu', label: 'Europe' },
                            { value: 'apac', label: 'Asia Pacific' },
                            { value: 'latam', label: 'Latin America' },
                        ]}
                    />

                    {/* Category Filter */}
                    <FilterDropdown
                        value={category}
                        onChange={setCategory}
                        icon={Tag}
                        className="w-[180px]"
                        options={[
                            { value: 'all', label: 'All Categories' },
                            { value: 'electronics', label: 'Electronics' },
                            { value: 'fashion', label: 'Fashion' },
                            { value: 'home', label: 'Home & Garden' },
                            { value: 'sports', label: 'Sports' },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

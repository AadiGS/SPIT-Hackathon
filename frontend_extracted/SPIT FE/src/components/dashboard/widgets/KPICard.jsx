import React from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendLabel, description, className }) {
    const [showTooltip, setShowTooltip] = React.useState(false);
    
    return (
        <div className={cn(
            "bg-card rounded-lg border border-border p-6 relative",
            className
        )}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {title}
                        </p>
                        {description && (
                            <div className="relative">
                                <Info 
                                    className="h-4 w-4 text-gray-400 cursor-help"
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                />
                                {showTooltip && (
                                    <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                                        {description}
                                        <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {subtitle}
                        </p>
                    )}
                    {trend !== null && trend !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                            <p className={cn(
                                "text-sm font-medium",
                                trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {trend > 0 ? '↑ +' : '↓ '}{Math.abs(trend).toFixed(2)}%
                            </p>
                            {trendLabel && (
                                <p className="text-xs text-gray-400">
                                    {trendLabel}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                )}
            </div>
        </div>
    );
}

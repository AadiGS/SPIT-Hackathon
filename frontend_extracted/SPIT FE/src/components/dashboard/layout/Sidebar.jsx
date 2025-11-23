import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    TrendingUp,
    Users,
    LogOut,
    ShoppingCart,
    Package,
    Truck,
    DollarSign,
    MessageSquare,
    Upload,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// All possible navigation items with their permission requirements
const allNavigation = [
    { name: 'Home Dashboard', href: '/dashboard/home', icon: LayoutDashboard, permission: 'home' },
    { name: 'Marketing', href: '/dashboard/marketing', icon: TrendingUp, permission: 'marketing' },
    { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart, permission: 'sales' },
    { name: 'Product Team', href: '/dashboard/product', icon: Package, permission: 'product' },
    { name: 'Operations', href: '/dashboard/operations', icon: Truck, permission: 'operations' },
    { name: 'Finance', href: '/dashboard/finance', icon: DollarSign, permission: 'finance' },
    { name: 'Forecasting', href: '/dashboard/forecasting', icon: TrendingUp, permission: 'forecasting' },
    { name: 'RFM Segmentation', href: '/dashboard/rfm', icon: BarChart3, permission: 'rfm' },
    { name: 'Upload Data', href: '/dashboard/upload', icon: Upload, permission: 'upload' },
    { name: 'Team Management', href: '/dashboard/team', icon: Users, permission: 'team_management' },
];

export default function Sidebar() {
    const { logout, hasPermission, user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Filter navigation based on user permissions
    const navigation = allNavigation.filter(item => hasPermission(item.permission));

    return (
        <div className={cn(
            "bg-background border-r border-border h-screen overflow-y-auto flex flex-col",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Retail Analytics
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Enterprise Platform
                        </p>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                        isCollapsed && "mx-auto"
                    )}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                </button>
            </div>

            <nav className="mt-6 px-3 space-y-1 flex-1">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                                isCollapsed && 'justify-center'
                            )
                        }
                        title={isCollapsed ? item.name : ''}
                    >
                        <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                        {!isCollapsed && item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                {/* User Info */}
                {user && !isCollapsed && (
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.role_display || user.role}
                        </p>
                        {user.company_name && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                {user.company_name}
                            </p>
                        )}
                    </div>
                )}

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className={cn(
                        "flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                        isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && 'Logout'}
                </button>
            </div>
        </div>
    );
}

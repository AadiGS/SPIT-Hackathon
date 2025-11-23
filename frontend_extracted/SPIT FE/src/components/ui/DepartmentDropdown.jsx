import React from 'react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function DepartmentDropdown({ value, onChange, className, isAdminTaken = false }) {
    const departments = [
        { value: "Admin", label: "Admin", disabled: isAdminTaken && value !== "Admin" },
        { value: "Marketing", label: "Marketing" },
        { value: "Accounting & Finance", label: "Accounting & Finance" },
        { value: "Operations", label: "Operations" },
        { value: "Product Management", label: "Product Management" },
        { value: "Sales", label: "Sales" },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-between h-10 px-3 py-2 border border-border bg-card hover:bg-accent/50",
                        !value && "text-gray-500 dark:text-gray-400",
                        className
                    )}
                >
                    {value || "Select Department"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[240px] rounded-xl shadow-lg">
                {departments.map((dept) => (
                    <DropdownMenuItem
                        key={dept.value}
                        onClick={() => onChange(dept.value)}
                        disabled={dept.disabled}
                        className={cn(
                            "cursor-pointer",
                            value === dept.value && "bg-accent",
                            dept.disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {dept.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

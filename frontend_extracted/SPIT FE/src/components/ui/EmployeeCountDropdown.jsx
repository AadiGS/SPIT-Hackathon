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

export function EmployeeCountDropdown({ value, onChange, className }) {
    const options = [
        { value: "1-20", label: "1-20 Employees" },
        { value: "20-40", label: "20-40 Employees" },
        { value: "40-60", label: "40-60 Employees" },
        { value: "80-100", label: "80-100 Employees" },
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
                    {value ? options.find(opt => opt.value === value)?.label : "Select a range"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[240px] rounded-xl shadow-lg">
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "cursor-pointer",
                            value === opt.value && "bg-accent"
                        )}
                    >
                        {opt.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

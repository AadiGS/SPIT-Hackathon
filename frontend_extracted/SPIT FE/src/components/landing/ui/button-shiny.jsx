import * as React from "react"
import { Button } from "./button";
import { cn } from "../../../lib/utils";

function ButtonCta({ label = "Get Access", className, ...props }) {
    return (
        <Button
            variant="ghost"
            className={cn(
                "group relative w-1/2 h-12 px-4 rounded-full overflow-hidden transition-all duration-500",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-b from-gray-600 via-[#0A0A0A] to-gray-600">
                <div className="absolute inset-0 bg-[#0A0A0A] rounded-full opacity-90" />
            </div>

            <div className="absolute inset-[2px] bg-[#0A0A0A] rounded-full opacity-95" />

            <div className="absolute inset-[2px] bg-gradient-to-r from-[#0A0A0A] via-[#1E1E1E] to-[#0A0A0A] rounded-full opacity-90" />
            <div className="absolute inset-[2px] bg-gradient-to-b from-gray-600/40 via-[#1E1E1E] to-gray-600/30 rounded-full opacity-80" />
            <div className="absolute inset-[2px] bg-gradient-to-br from-white/10 via-[#1E1E1E] to-[#2E2E2E]/50 rounded-full" />

            <div className="absolute inset-[2px] shadow-[inset_0_0_15px_rgba(255,255,255,0.15)] rounded-full" />

            <div className="relative flex items-center justify-center gap-2">
                <span className="text-sm font-medium bg-gradient-to-b from-gray-600 via-white to-gray-600 bg-clip-text text-transparent tracking-normal">
                    {label}
                </span>
            </div>

            <div className="absolute inset-[2px] opacity-0 transition-opacity duration-300 bg-gradient-to-r from-[#2E2E2E]/20 via-white/10 to-[#2E2E2E]/20 group-hover:opacity-100 rounded-full" />
        </Button>
    );
}

export { ButtonCta }

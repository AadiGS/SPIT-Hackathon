import React from "react";
import { cn } from "../../../lib/utils";

export const BentoGrid = ({
    className,
    children
}) => {
    return (
        (<div
            className={cn(
                "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
                className
            )}>
            {children}
        </div>)
    );
};

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon
}) => {
    return (
        (<div
            className={cn(
                "row-span-1 rounded-xl group/bento hover:shadow-xl hover:shadow-white/5 transition duration-200 shadow-none p-4 bg-[#1E1E1E] border border-[#2E2E2E] hover:border-white/20 justify-between flex flex-col space-y-4",
                className
            )}>
            {header}
            <div className="group-hover/bento:translate-x-2 transition duration-200">
                {icon}
                <div
                    className="font-sans font-bold text-white mb-2 mt-2">
                    {title}
                </div>
                <div
                    className="font-sans font-normal text-[#999999] text-xs">
                    {description}
                </div>
            </div>
        </div>)
    );
};

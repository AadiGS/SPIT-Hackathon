import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const Select = React.forwardRef(({ className, options, placeholder, ...props }, ref) => {
    return (
        <div className="relative">
            <select
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                    className
                )}
                ref={ref}
                {...props}
            >
                {placeholder && <option value="" disabled>{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
    )
})
Select.displayName = "Select"

export { Select }

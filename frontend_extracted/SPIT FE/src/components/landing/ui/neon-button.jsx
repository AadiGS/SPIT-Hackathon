import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../../lib/utils"

const neonButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-transparent border border-white text-white hover:bg-white hover:text-black",
        solid: "bg-white text-black hover:bg-gray-200",
        ghost: "hover:bg-white/10 text-white",
        outline: "border border-white/30 text-white hover:border-white hover:bg-white/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
      neon: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      neon: true,
    },
  }
)

const NeonButton = React.forwardRef(
  ({ className, variant, size, neon = true, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(neonButtonVariants({ variant, size, neon, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)

NeonButton.displayName = "NeonButton"

export { NeonButton as Button, neonButtonVariants }

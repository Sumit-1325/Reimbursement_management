import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "h-9 w-full rounded-lg border text-sm transition-colors outline-none text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-700 bg-slate-900/50 px-3 py-2 focus-visible:border-purple-500 focus-visible:ring-purple-500/30",
        outline: "border-2 border-slate-700 bg-transparent px-3 py-2 hover:border-slate-500 focus-visible:border-purple-500 focus-visible:ring-purple-500/30",
        ghost: "border-transparent bg-slate-800/40 px-3 py-2 hover:bg-slate-800/60 focus-visible:border-purple-500 focus-visible:ring-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Input = React.forwardRef(({
  className,
  type,
  variant = "default",
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input, inputVariants }

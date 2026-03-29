import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-2.5 py-2 text-sm text-slate-100 transition-colors outline-none placeholder:text-slate-500 focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/30 disabled:cursor-not-allowed disabled:bg-slate-800/40 disabled:opacity-50",
        className
      )}
      {...props} />
  );
}

export { Textarea }

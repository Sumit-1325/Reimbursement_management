import React from "react"
import { cn } from "@/lib/utils"

const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  description = "",
  variant = "outline",
  onClick = () => {},
  className = ""
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/70 transition-all text-left",
        "hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors">
            {label}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-transparent group-hover:to-transparent rounded-lg transition-all opacity-0 group-hover:opacity-100" />
    </button>
  )
}

const QuickActions = ({ 
  title = "Quick Actions",
  description = "Commonly used operations",
  actions = []
}) => {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 backdrop-blur-sm border-l-4 border-l-purple-600">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.length === 0 ? (
            <p className="col-span-2 text-slate-400 text-sm text-center py-8">
              No quick actions available
            </p>
          ) : (
            actions.map((action, idx) => (
              <QuickActionButton key={idx} {...action} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export { QuickActions, QuickActionButton }

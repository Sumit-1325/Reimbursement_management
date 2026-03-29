import React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"

const StatCard = ({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  trend = "up",
  bgColor = "bg-blue-500/10",
  borderColor = "border-blue-500/30",
  textColor = "text-blue-600",
  subtitle = ""
}) => {
  const isTrendingUp = trend === "up"

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-lg border border-l-4",
        "bg-slate-900/80 backdrop-blur-sm",
        borderColor
      )}
    >
      <div className="p-6">
        {/* Background icon */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full",
          bgColor
        )} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon and Title */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              {title}
            </h3>
            <div className={cn(
              "p-3 rounded-lg",
              bgColor
            )}>
              <Icon className={cn("w-5 h-5", textColor)} />
            </div>
          </div>

          {/* Value */}
          <div className="mb-3">
            <p className="text-3xl font-bold text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Change */}
          {change !== undefined && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                isTrendingUp 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-red-500/10 text-red-400"
              )}>
                {isTrendingUp ? (
                  <TrendingUpIcon className="w-4 h-4" />
                ) : (
                  <TrendingDownIcon className="w-4 h-4" />
                )}
                <span>{Math.abs(change)}%</span>
              </div>
              <span className="text-xs text-slate-500">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatCard

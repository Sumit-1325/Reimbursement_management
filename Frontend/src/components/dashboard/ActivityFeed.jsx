import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const ActivityFeedItem = ({ 
  user, 
  avatar, 
  action, 
  timestamp, 
  type = "default" 
}) => {
  const typeStyles = {
    default: "border-l-slate-500 bg-slate-800/20",
    success: "border-l-green-500 bg-green-500/5",
    warning: "border-l-orange-500 bg-orange-500/5",
    error: "border-l-red-500 bg-red-500/5",
  }

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 border-l-2 rounded-r-lg transition-all hover:bg-slate-800/40",
      typeStyles[type]
    )}>
      <Avatar className="h-10 w-10 border-2 border-slate-700">
        <AvatarImage src={avatar} alt={user} />
        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs font-bold">
          {user.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">
          <span className="font-semibold text-blue-400">{user}</span>
          {" "}{action}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {timestamp}
        </p>
      </div>
    </div>
  )
}

const ActivityFeed = ({ 
  title = "Recent Activity", 
  description = "Latest updates from your system",
  activities = [],
  maxHeight = "max-h-96"
}) => {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 backdrop-blur-sm border-l-4 border-l-blue-600">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="px-6 py-4">
        <div className={cn("space-y-2 overflow-y-auto", maxHeight)}>
          {activities.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <p className="text-slate-400 text-sm">No recent activity</p>
            </div>
          ) : (
            activities.map((activity, idx) => (
              <ActivityFeedItem key={idx} {...activity} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export { ActivityFeed, ActivityFeedItem }

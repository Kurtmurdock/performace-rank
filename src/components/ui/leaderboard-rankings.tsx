"use client"

import * as React from "react"
import { Crown, EllipsisIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeaderboardRankingItem {
  userId: string
  userName: string | null
  rank: number
  value: number
  byline?: string | null
  avatarUrl?: string | null
  displayed?: boolean
}

interface LeaderboardRankingsProps extends React.HTMLAttributes<HTMLDivElement> {
  rankings: LeaderboardRankingItem[]
}

const crownColorMap: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-slate-300",
  3: "text-amber-600",
}

function formatValue(value: number) {
  return value.toLocaleString("pt-BR")
}

export function LeaderboardRankings({ className, rankings, ...props }: LeaderboardRankingsProps) {
  return (
    <div className={cn("bg-card w-full rounded-xl border border-border", className)} {...props}>
      <div className="divide-border divide-y">
        {rankings.map((ranking) => {
          const displayName = ranking.userName || `Vendedor ${ranking.userId}`
          const showCrown = ranking.rank <= 3
          const crownColor = crownColorMap[ranking.rank]
          return (
            <div key={ranking.userId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex w-8 items-center gap-1 shrink-0">
                <span className="w-4 text-sm font-semibold tabular-nums text-muted-foreground">
                  {ranking.rank}
                </span>
                {showCrown && <Crown className={cn("h-4 w-4", crownColor)} />}
              </div>
              {ranking.avatarUrl ? (
                <img src={ranking.avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="bg-secondary text-secondary-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                {ranking.byline && (
                  <p className="text-muted-foreground truncate text-xs">{ranking.byline}</p>
                )}
              </div>
              <p className="font-semibold tabular-nums text-sm">{formatValue(ranking.value)}</p>
            </div>
          )
        })}
        {rankings.length === 0 && (
          <div className="flex items-center justify-center px-4 py-6 text-muted-foreground text-sm">
            <EllipsisIcon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}

export type { LeaderboardRankingItem }

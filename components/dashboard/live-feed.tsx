'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { DollarSign, Eye, UserPlus, Zap } from 'lucide-react'

type ConversionType = 'subscription' | 'tip' | 'message' | 'click'

interface Conversion {
  id: string
  type: ConversionType
  creatorName: string
  amount?: number
  source?: string
  timestamp: Date
}

interface LiveFeedProps {
  initialConversions?: Conversion[]
  className?: string
}

const conversionConfig: Record<ConversionType, { icon: typeof DollarSign; color: string; label: string }> = {
  subscription: { icon: UserPlus, color: 'text-success', label: 'New subscription' },
  tip: { icon: DollarSign, color: 'text-accent', label: 'Tip received' },
  message: { icon: Zap, color: 'text-warning', label: 'PPV purchase' },
  click: { icon: Eye, color: 'text-text-secondary', label: 'Link click' },
}

// Generate mock conversions for demo
function generateMockConversion(): Conversion {
  const types: ConversionType[] = ['subscription', 'tip', 'message', 'click']
  const creators = ['Belle', 'Luna', 'Mia', 'Sophia', 'Emma', 'Ava']
  const sources = ['TikTok', 'Instagram', 'Twitter', 'Reddit', 'Direct']
  const type = types[Math.floor(Math.random() * types.length)]

  return {
    id: crypto.randomUUID(),
    type,
    creatorName: creators[Math.floor(Math.random() * creators.length)],
    amount: type !== 'click' ? Math.floor(Math.random() * 50) + 5 : undefined,
    source: sources[Math.floor(Math.random() * sources.length)],
    timestamp: new Date(),
  }
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function ConversionItem({ conversion, isNew }: { conversion: Conversion; isNew?: boolean }) {
  const config = conversionConfig[conversion.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-lg transition-all',
        isNew ? 'bg-accent/5 animate-fade-in' : 'bg-transparent',
        'hover:bg-white/5'
      )}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-lg bg-white/5', config.color)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {config.label}
          </span>
          {conversion.amount && (
            <span className="text-sm font-semibold text-success">
              +${conversion.amount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
          <span>{conversion.creatorName}</span>
          {conversion.source && (
            <>
              <span>•</span>
              <span>{conversion.source}</span>
            </>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-text-muted whitespace-nowrap">
        {formatTimeAgo(conversion.timestamp)}
      </span>
    </div>
  )
}

export function LiveFeed({ initialConversions = [], className }: LiveFeedProps) {
  const [conversions, setConversions] = useState<Conversion[]>(initialConversions)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  // Simulate real-time feed (replace with actual WebSocket/SSE in production)
  useEffect(() => {
    // Generate initial conversions if none provided
    if (conversions.length === 0) {
      const initial = Array.from({ length: 5 }, () => ({
        ...generateMockConversion(),
        timestamp: new Date(Date.now() - Math.random() * 3600000),
      }))
      setConversions(initial)
    }

    // Add new conversion every 3-8 seconds for demo
    const interval = setInterval(() => {
      const newConversion = generateMockConversion()
      setNewIds((prev) => new Set(prev).add(newConversion.id))
      setConversions((prev) => [newConversion, ...prev].slice(0, 20))

      // Remove "new" status after animation
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev)
          next.delete(newConversion.id)
          return next
        })
      }, 2000)
    }, Math.random() * 5000 + 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn('rounded-xl bg-background-elevated border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-text-primary">Live Feed</h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs text-text-muted">Live</span>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-h-[400px] overflow-y-auto">
        {conversions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Zap className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">
              No conversions yet. They&apos;ll appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {conversions.map((conversion) => (
              <ConversionItem
                key={conversion.id}
                conversion={conversion}
                isNew={newIds.has(conversion.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

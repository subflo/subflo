import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'percent' | 'number'
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  trend,
  format,
  className,
}: StatCardProps) {
  // Auto-determine trend from change value if not provided
  const resolvedTrend = trend ?? (change === undefined ? undefined : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral')

  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const formatChange = (val: number) => {
    const prefix = val > 0 ? '+' : ''
    return `${prefix}${val.toFixed(1)}%`
  }

  return (
    <div
      className={cn(
        'relative p-6 rounded-xl bg-background-elevated border border-border',
        'hover:border-border-hover transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        {icon && (
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-3xl font-bold text-text-primary">
          {formatValue(value)}
        </span>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              resolvedTrend === 'up' && 'text-success',
              resolvedTrend === 'down' && 'text-error',
              resolvedTrend === 'neutral' && 'text-text-muted'
            )}
          >
            {resolvedTrend === 'up' && <TrendingUp className="w-4 h-4" />}
            {resolvedTrend === 'down' && <TrendingDown className="w-4 h-4" />}
            {resolvedTrend === 'neutral' && <Minus className="w-4 h-4" />}
            <span>{formatChange(change)}</span>
          </div>
          <span className="text-sm text-text-muted">{changeLabel}</span>
        </div>
      )}

      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-accent-glow opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}

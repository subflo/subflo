'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'

interface RevenueDataPoint {
  date: string
  revenue: number
  adSpend?: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  showAdSpend?: boolean
  className?: string
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-background-elevated border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm text-text-secondary mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-text-secondary capitalize">
            {entry.dataKey}:
          </span>
          <span className="text-sm font-semibold text-text-primary">
            ${entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RevenueChart({ data, showAdSpend = false, className }: RevenueChartProps) {
  return (
    <div className={cn('w-full h-[350px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="adSpendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />

          <Tooltip content={<CustomTooltip />} />

          {showAdSpend && (
            <Area
              type="monotone"
              dataKey="adSpend"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#adSpendGradient)"
              dot={false}
              activeDot={{
                r: 6,
                stroke: '#f97316',
                strokeWidth: 2,
                fill: '#18181b',
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{
              r: 6,
              stroke: '#8b5cf6',
              strokeWidth: 2,
              fill: '#18181b',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart card wrapper with header
interface RevenueChartCardProps extends RevenueChartProps {
  title?: string
  subtitle?: string
  period?: string
  onPeriodChange?: (period: string) => void
}

export function RevenueChartCard({
  title = 'Revenue Overview',
  subtitle,
  period = '7d',
  onPeriodChange,
  ...chartProps
}: RevenueChartCardProps) {
  const periods = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
  ]

  return (
    <div className="p-6 rounded-xl bg-background-elevated border border-border">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-background-base">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange?.(p.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                period === p.value
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <RevenueChart {...chartProps} />
    </div>
  )
}

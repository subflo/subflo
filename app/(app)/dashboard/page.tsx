'use client'

import { useState } from 'react'
import { StatCard } from '@/components/ui/stat-card'
import { RevenueChartCard } from '@/components/dashboard/revenue-chart'
import { LiveFeed } from '@/components/dashboard/live-feed'
import {
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock data - replace with real API calls
const mockRevenueData = [
  { date: 'Mon', revenue: 12400, adSpend: 2100 },
  { date: 'Tue', revenue: 15800, adSpend: 2400 },
  { date: 'Wed', revenue: 14200, adSpend: 2200 },
  { date: 'Thu', revenue: 18600, adSpend: 2800 },
  { date: 'Fri', revenue: 22100, adSpend: 3200 },
  { date: 'Sat', revenue: 25400, adSpend: 3800 },
  { date: 'Sun', revenue: 21800, adSpend: 3400 },
]

const mockTopCreators = [
  {
    id: '1',
    name: 'Belle Delphine',
    avatar: null,
    revenue: 45200,
    conversions: 342,
    roas: 4.2,
    trend: 'up' as const,
  },
  {
    id: '2',
    name: 'Luna Rose',
    avatar: null,
    revenue: 38900,
    conversions: 287,
    roas: 3.8,
    trend: 'up' as const,
  },
  {
    id: '3',
    name: 'Mia Malkova',
    avatar: null,
    revenue: 31500,
    conversions: 245,
    roas: 3.5,
    trend: 'down' as const,
  },
  {
    id: '4',
    name: 'Sophia Gray',
    avatar: null,
    revenue: 28700,
    conversions: 198,
    roas: 3.2,
    trend: 'neutral' as const,
  },
  {
    id: '5',
    name: 'Emma Stone',
    avatar: null,
    revenue: 24300,
    conversions: 176,
    roas: 2.9,
    trend: 'up' as const,
  },
]

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState('7d')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your portfolio performance at a glance
          </p>
        </div>
        <button className="px-4 py-2 bg-gradient-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
          Add Creator
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={130300}
          change={12.5}
          format="currency"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Active Creators"
          value={24}
          change={8.3}
          format="number"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Avg. ROAS"
          value="3.8x"
          change={5.2}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Conversions"
          value={1248}
          change={-2.1}
          format="number"
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChartCard
            data={mockRevenueData}
            showAdSpend
            title="Revenue vs Ad Spend"
            subtitle="Track your portfolio performance over time"
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        </div>

        {/* Live Feed - 1 column */}
        <div className="lg:col-span-1">
          <LiveFeed />
        </div>
      </div>

      {/* Top Creators Table */}
      <div className="rounded-xl bg-background-elevated border border-border overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Top Creators</h3>
          <button className="text-sm text-accent hover:text-accent-purple transition-colors flex items-center gap-1">
            View All
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Creator
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Revenue
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Conversions
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  ROAS
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {mockTopCreators.map((creator, index) => (
                <tr
                  key={creator.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-muted w-6">
                        #{index + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-medium">
                        {creator.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {creator.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-text-primary">
                      ${creator.revenue.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-text-secondary">
                      {creator.conversions.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-sm font-medium',
                        creator.roas >= 4 && 'text-success',
                        creator.roas >= 3 && creator.roas < 4 && 'text-warning',
                        creator.roas < 3 && 'text-error'
                      )}
                    >
                      {creator.roas.toFixed(1)}x
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

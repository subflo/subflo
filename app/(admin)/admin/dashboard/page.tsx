'use client'

import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Link2,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

// Mock data for platform metrics
const platformMetrics = [
  {
    label: 'Total MRR',
    value: '$47,280',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    label: 'Active Organizations',
    value: '156',
    change: '+8',
    trend: 'up',
    icon: Building2,
  },
  {
    label: 'Total Users',
    value: '423',
    change: '+23',
    trend: 'up',
    icon: Users,
  },
  {
    label: 'Smart Links Created',
    value: '12,847',
    change: '+847',
    trend: 'up',
    icon: Link2,
  },
]

const revenueByPlan = [
  { plan: 'Starter', count: 89, mrr: 8900, color: 'bg-zinc-600' },
  { plan: 'Pro', count: 52, mrr: 25480, color: 'bg-red-600' },
  { plan: 'Agency', count: 15, mrr: 12900, color: 'bg-rose-500' },
]

const recentActivity = [
  { type: 'signup', org: 'FanBoost Media', user: 'jake@fanboost.io', time: '2 min ago' },
  { type: 'upgrade', org: 'Creator Collective', from: 'Starter', to: 'Pro', time: '15 min ago' },
  { type: 'churn', org: 'MediaPro Agency', reason: 'Budget cuts', time: '1 hour ago' },
  { type: 'signup', org: 'Digital Dreams', user: 'sarah@digitaldreams.co', time: '2 hours ago' },
  { type: 'upgrade', org: 'AdFlow Partners', from: 'Pro', to: 'Agency', time: '3 hours ago' },
]

const systemHealth = [
  { service: 'API Gateway', status: 'operational', latency: '45ms' },
  { service: 'Database', status: 'operational', latency: '12ms' },
  { service: 'OF API Proxy', status: 'operational', latency: '234ms' },
  { service: 'Meta CAPI', status: 'degraded', latency: '890ms' },
  { service: 'Stripe Webhooks', status: 'operational', latency: '78ms' },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Platform Dashboard</h1>
        <p className="mt-1 text-text-secondary">
          Real-time overview of Subflo platform metrics
        </p>
      </div>

      {/* Platform Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {platformMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-red-600/10 p-2">
                <metric.icon className="h-5 w-5 text-red-500" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {metric.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-semibold text-text-primary">{metric.value}</p>
              <p className="mt-1 text-sm text-text-secondary">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue by Plan */}
        <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-text-primary">Revenue by Plan</h2>
          <div className="mt-6 space-y-4">
            {revenueByPlan.map((plan) => (
              <div key={plan.plan}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{plan.plan}</span>
                  <span className="text-text-primary">${plan.mrr.toLocaleString()}/mo</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${plan.color}`}
                      style={{ width: `${(plan.mrr / 25480) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{plan.count} orgs</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Total MRR</span>
              <span className="text-lg font-semibold text-text-primary">$47,280</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-text-primary">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-800/30 p-3"
              >
                <div className={`mt-0.5 h-2 w-2 rounded-full ${
                  activity.type === 'signup' ? 'bg-emerald-400' :
                  activity.type === 'upgrade' ? 'bg-blue-400' : 'bg-red-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-text-primary">
                    {activity.type === 'signup' && (
                      <>New signup: <span className="font-medium">{activity.org}</span></>
                    )}
                    {activity.type === 'upgrade' && (
                      <><span className="font-medium">{activity.org}</span> upgraded {activity.from} → {activity.to}</>
                    )}
                    {activity.type === 'churn' && (
                      <><span className="font-medium text-red-400">{activity.org}</span> churned</>
                    )}
                  </p>
                  <p className="text-xs text-text-muted">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">System Health</h2>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">All Systems</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {systemHealth.map((service) => (
              <div
                key={service.service}
                className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-800/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    service.status === 'operational' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className="text-sm text-text-primary">{service.service}</span>
                </div>
                <span className="text-xs text-text-muted">{service.latency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-text-primary">Quick Actions</h2>
        <div className="mt-4 flex gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
            <Users className="h-4 w-4" />
            Impersonate User
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-zinc-700">
            <CreditCard className="h-4 w-4" />
            Stripe Dashboard
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-zinc-700">
            <Activity className="h-4 w-4" />
            View Logs
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-zinc-700">
            <Zap className="h-4 w-4" />
            Inngest Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

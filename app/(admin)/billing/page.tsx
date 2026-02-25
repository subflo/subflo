'use client'

import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Calendar,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'

// Mock MRR data
const mrrMetrics = [
  {
    label: 'Total MRR',
    value: '$47,280',
    change: '+$4,230',
    changePercent: '+9.8%',
    trend: 'up',
  },
  {
    label: 'New MRR',
    value: '$5,640',
    change: '+12 subscriptions',
    changePercent: '',
    trend: 'up',
  },
  {
    label: 'Churned MRR',
    value: '$1,410',
    change: '-3 subscriptions',
    changePercent: '',
    trend: 'down',
  },
  {
    label: 'Net MRR Growth',
    value: '$4,230',
    change: '+9.8%',
    changePercent: '',
    trend: 'up',
  },
]

// Mock subscription data from "Stripe"
const subscriptions = [
  {
    id: 'sub_1abc',
    org: 'FanBoost Media',
    plan: 'Pro',
    amount: 490,
    status: 'active',
    nextBilling: '2024-03-15',
    paymentMethod: '•••• 4242',
  },
  {
    id: 'sub_2def',
    org: 'Creator Collective',
    plan: 'Agency',
    amount: 860,
    status: 'active',
    nextBilling: '2024-03-10',
    paymentMethod: '•••• 5555',
  },
  {
    id: 'sub_3ghi',
    org: 'Digital Dreams',
    plan: 'Starter',
    amount: 100,
    status: 'trialing',
    nextBilling: '2024-03-05',
    paymentMethod: '•••• 1234',
  },
  {
    id: 'sub_4jkl',
    org: 'Growth Labs',
    plan: 'Pro',
    amount: 490,
    status: 'past_due',
    nextBilling: '2024-02-28',
    paymentMethod: '•••• 9999',
  },
  {
    id: 'sub_5mno',
    org: 'AdFlow Partners',
    plan: 'Agency',
    amount: 860,
    status: 'active',
    nextBilling: '2024-03-20',
    paymentMethod: '•••• 8888',
  },
  {
    id: 'sub_6pqr',
    org: 'MediaPro Agency',
    plan: 'Pro',
    amount: 490,
    status: 'canceled',
    nextBilling: '-',
    paymentMethod: '•••• 7777',
  },
]

const invoices = [
  { id: 'inv_001', org: 'FanBoost Media', amount: 490, status: 'paid', date: '2024-02-15' },
  { id: 'inv_002', org: 'Creator Collective', amount: 860, status: 'paid', date: '2024-02-10' },
  { id: 'inv_003', org: 'Growth Labs', amount: 490, status: 'failed', date: '2024-02-28' },
  { id: 'inv_004', org: 'AdFlow Partners', amount: 860, status: 'paid', date: '2024-02-20' },
  { id: 'inv_005', org: 'Digital Dreams', amount: 100, status: 'pending', date: '2024-03-05' },
]

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  active: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', icon: CheckCircle },
  trialing: { bg: 'bg-blue-400/10', text: 'text-blue-400', icon: Clock },
  past_due: { bg: 'bg-amber-400/10', text: 'text-amber-400', icon: AlertCircle },
  canceled: { bg: 'bg-red-400/10', text: 'text-red-400', icon: XCircle },
}

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-emerald-400/10 text-emerald-400',
  pending: 'bg-blue-400/10 text-blue-400',
  failed: 'bg-red-400/10 text-red-400',
}

const planColors: Record<string, string> = {
  Starter: 'bg-zinc-600 text-zinc-200',
  Pro: 'bg-red-600/20 text-red-400',
  Agency: 'bg-rose-600/20 text-rose-400',
}

export default function BillingPage() {
  const [timeRange, setTimeRange] = useState('30d')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Billing & Revenue</h1>
          <p className="mt-1 text-text-secondary">
            MRR dashboard and subscription management from Stripe
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 pr-10 text-sm text-text-primary outline-none focus:border-red-600"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open Stripe
          </a>
        </div>
      </div>

      {/* MRR Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {mrrMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">{metric.label}</p>
              {metric.trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
            </div>
            <p className="mt-2 text-3xl font-semibold text-text-primary">{metric.value}</p>
            <p className={`mt-1 text-sm ${metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {metric.change}
            </p>
          </div>
        ))}
      </div>

      {/* MRR Chart Placeholder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-text-primary">MRR Over Time</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-text-secondary">Total MRR</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-text-secondary">New MRR</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-500" />
              <span className="text-text-secondary">Churned MRR</span>
            </div>
          </div>
        </div>
        {/* Chart placeholder */}
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30">
          <div className="text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-2 text-sm text-text-muted">MRR chart will render here</p>
            <p className="text-xs text-text-muted">Integrate with Recharts or similar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Subscriptions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-medium text-text-primary">Subscriptions</h2>
            <button className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {subscriptions.map((sub) => {
              const statusStyle = statusColors[sub.status]
              const StatusIcon = statusStyle.icon
              return (
                <div key={sub.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${statusStyle.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{sub.org}</p>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${planColors[sub.plan]}`}>
                          {sub.plan}
                        </span>
                        <span>•</span>
                        <span>{sub.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">${sub.amount}/mo</p>
                    <p className="text-sm text-text-muted">
                      {sub.nextBilling !== '-' ? `Next: ${sub.nextBilling}` : 'Canceled'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-zinc-800 px-6 py-3">
            <button className="w-full text-center text-sm text-red-400 hover:text-red-300">
              View all subscriptions →
            </button>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-medium text-text-primary">Recent Invoices</h2>
            <a
              href="https://dashboard.stripe.com/invoices"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Stripe
            </a>
          </div>
          <div className="divide-y divide-zinc-800">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-text-primary">{invoice.org}</p>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{invoice.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${invoiceStatusColors[invoice.status]}`}>
                    {invoice.status}
                  </span>
                  <span className="font-medium text-text-primary">${invoice.amount}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 px-6 py-3">
            <button className="w-full text-center text-sm text-red-400 hover:text-red-300">
              View all invoices →
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-text-primary">Revenue Breakdown</h2>
        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-600" />
              <span className="text-sm text-text-secondary">Starter Plan</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-text-primary">$8,900</p>
            <p className="text-sm text-text-muted">89 subscriptions • 18.8%</p>
          </div>
          <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-red-300">Pro Plan</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-text-primary">$25,480</p>
            <p className="text-sm text-text-muted">52 subscriptions • 53.9%</p>
          </div>
          <div className="rounded-lg border border-rose-600/30 bg-rose-600/10 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-sm text-rose-300">Agency Plan</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-text-primary">$12,900</p>
            <p className="text-sm text-text-muted">15 subscriptions • 27.3%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

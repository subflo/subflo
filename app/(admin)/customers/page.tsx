'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  Users,
  Building2,
  Mail,
  Calendar,
  MoreVertical,
  UserCheck,
  Ban,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Eye,
} from 'lucide-react'

// Mock customer data
const customers = [
  {
    id: '1',
    org: 'FanBoost Media',
    email: 'jake@fanboost.io',
    plan: 'Pro',
    mrr: 490,
    users: 3,
    creators: 12,
    status: 'active',
    createdAt: '2024-01-15',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    org: 'Creator Collective',
    email: 'sarah@creatorcollective.com',
    plan: 'Agency',
    mrr: 860,
    users: 8,
    creators: 45,
    status: 'active',
    createdAt: '2023-11-20',
    lastActive: '30 min ago',
  },
  {
    id: '3',
    org: 'Digital Dreams',
    email: 'mike@digitaldreams.co',
    plan: 'Starter',
    mrr: 100,
    users: 1,
    creators: 2,
    status: 'active',
    createdAt: '2024-02-01',
    lastActive: '1 day ago',
  },
  {
    id: '4',
    org: 'MediaPro Agency',
    email: 'team@mediapro.agency',
    plan: 'Pro',
    mrr: 0,
    users: 5,
    creators: 23,
    status: 'churned',
    createdAt: '2023-09-10',
    lastActive: '2 weeks ago',
  },
  {
    id: '5',
    org: 'AdFlow Partners',
    email: 'admin@adflow.io',
    plan: 'Agency',
    mrr: 860,
    users: 12,
    creators: 67,
    status: 'active',
    createdAt: '2023-08-05',
    lastActive: '5 min ago',
  },
  {
    id: '6',
    org: 'Growth Labs',
    email: 'hello@growthlabs.co',
    plan: 'Pro',
    mrr: 490,
    users: 4,
    creators: 18,
    status: 'trialing',
    createdAt: '2024-02-20',
    lastActive: '1 hour ago',
  },
]

const planColors: Record<string, string> = {
  Starter: 'bg-zinc-600 text-zinc-200',
  Pro: 'bg-red-600/20 text-red-400',
  Agency: 'bg-rose-600/20 text-rose-400',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-400/10 text-emerald-400',
  trialing: 'bg-blue-400/10 text-blue-400',
  churned: 'bg-red-400/10 text-red-400',
  paused: 'bg-amber-400/10 text-amber-400',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.org.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesPlan = planFilter === 'all' || c.plan === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Customers</h1>
          <p className="mt-1 text-text-secondary">
            Manage organizations and users across the platform
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-zinc-700">
          <RefreshCw className="h-4 w-4" />
          Sync from Stripe
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by organization or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-none bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 pr-10 text-sm text-text-primary outline-none focus:border-red-600"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="churned">Churned</option>
            <option value="paused">Paused</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>

        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 pr-10 text-sm text-text-primary outline-none focus:border-red-600"
          >
            <option value="all">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Agency">Agency</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-text-secondary">Total Organizations</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">156</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-text-secondary">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">142</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-text-secondary">Trialing</p>
          <p className="mt-1 text-2xl font-semibold text-blue-400">8</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-text-secondary">Churned (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-red-400">6</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Organization
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Plan
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                MRR
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Users
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Creators
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Last Active
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredCustomers.map((customer) => (
              <tr
                key={customer.id}
                className="transition-colors hover:bg-zinc-800/30"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                      <Building2 className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{customer.org}</p>
                      <p className="text-sm text-text-muted">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${planColors[customer.plan]}`}>
                    {customer.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-text-primary">
                    ${customer.mrr}
                  </span>
                  <span className="text-text-muted">/mo</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Users className="h-4 w-4" />
                    {customer.users}
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {customer.creators}
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[customer.status]}`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-muted">
                  {customer.lastActive}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                      title="Impersonate"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-text-secondary transition-colors hover:bg-zinc-700 hover:text-text-primary"
                      title="View in Stripe"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-text-secondary transition-colors hover:bg-zinc-700 hover:text-text-primary"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <p className="text-sm text-text-muted">
            Showing {filteredCustomers.length} of {customers.length} customers
          </p>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-zinc-700 hover:text-text-primary">
              Previous
            </button>
            <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-zinc-700 hover:text-text-primary">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

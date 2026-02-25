'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  Bell,
  Search,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background-base">
      {/* Red admin indicator stripe */}
      <div className="h-1 bg-gradient-to-r from-red-600 to-rose-500" />

      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-1 h-[calc(100vh-4px)] w-64 border-r border-zinc-800 bg-background-elevated">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">Subflo Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-600/10 text-red-500'
                      : 'text-text-secondary hover:bg-zinc-800/50 hover:text-text-primary'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-red-500' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Admin badge */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-red-600/10 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
                <span className="text-sm font-semibold text-white">A</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Admin User</p>
                <p className="text-xs text-red-400">Platform Admin</p>
              </div>
              <button className="rounded-lg p-1.5 text-text-secondary hover:bg-zinc-800 hover:text-text-primary">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 flex-1">
          {/* Top bar */}
          <header className="sticky top-1 z-10 flex h-16 items-center justify-between border-b border-zinc-800 bg-background-base/80 px-8 backdrop-blur-xl">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search customers, orgs..."
                className="w-64 border-none bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-text-muted">⌘K</kbd>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="relative rounded-lg p-2 text-text-secondary hover:bg-zinc-800 hover:text-text-primary">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <div className="h-6 w-px bg-zinc-800" />
              <span className="rounded-full bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400">
                ADMIN MODE
              </span>
            </div>
          </header>

          {/* Page content */}
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

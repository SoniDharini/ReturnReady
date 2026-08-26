import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuth } from '@/context/AuthContext'
import { appPaths } from '@/lib/paths'

function resolveTitle(pathname: string): string {
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    onboarding: 'Welcome',
    properties: 'Properties',
    'properties/new': 'Add Property',
    tenancies: 'Tenancies',
    'tenancies/new': 'Invite Tenant',
    rental: 'My Rental',
    inspections: 'Inspections',
    'inspections/move-in': 'Move-In Inspection',
    'inspections/wizard': 'Inspection Wizard',
    'inspections/review': 'Inspection Review',
    'inspections/approval': 'Inspection Approval',
    'inspections/move-out': 'Move-Out Inspection',
    'inspections/comparison': 'Move-In vs Move-Out',
    settlement: 'Security Deposit Settlement',
    'settlement/sign': 'Final Approval',
    'settlement/complete': 'Property Handover Complete',
    reports: 'Reports',
    settings: 'Settings',
    help: 'Help',
  }

  const parts = pathname.split('/').filter(Boolean)
  const withoutRole = parts.slice(1).join('/')
  if (map[withoutRole]) return map[withoutRole]
  if (withoutRole.startsWith('properties/')) return 'Property Details'
  if (withoutRole.startsWith('tenancies/')) return 'Tenancy Details'
  return 'ReturnReady'
}

export function AppLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const paths = user ? appPaths(user.role) : null

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={resolveTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          settingsPath={paths?.settings || '/login'}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

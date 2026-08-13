import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuth } from '@/context/AuthContext'

const titles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/properties': 'Properties',
  '/app/properties/new': 'Add Property',
  '/app/properties/p1': 'Property Details',
  '/app/tenancies': 'Tenancies',
  '/app/tenancies/new': 'Create Tenancy',
  '/app/tenancies/t1': 'Tenancy Details',
  '/app/inspections': 'Inspections',
  '/app/inspections/move-in': 'Move-In Inspection',
  '/app/inspections/wizard': 'Inspection Wizard',
  '/app/inspections/review': 'Inspection Review',
  '/app/inspections/approval': 'Inspection Approval',
  '/app/inspections/move-out': 'Move-Out Inspection',
  '/app/inspections/comparison': 'Move-In vs Move-Out',
  '/app/settlement': 'Security Deposit Settlement',
  '/app/settlement/sign': 'Final Approval',
  '/app/settlement/complete': 'Property Handover Complete',
  '/app/reports': 'Reports',
  '/app/my-rental': 'My Rental',
  '/app/settings': 'Settings',
  '/app/help': 'Help',
}

export function AppLayout() {
  const { isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const title =
    titles[location.pathname] ||
    [...Object.entries(titles)].find(([path]) => location.pathname.startsWith(path))?.[1] ||
    'ReturnReady'

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

import { useAuth } from '@/context/AuthContext'
import { OwnerDashboard } from './OwnerDashboard'
import { TenantDashboard } from './TenantDashboard'

export function DashboardPage() {
  const { user } = useAuth()
  return user?.role === 'tenant' ? <TenantDashboard /> : <OwnerDashboard />
}

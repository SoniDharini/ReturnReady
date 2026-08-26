import { useAuth } from '@/context/AuthContext'
import { appPaths } from '@/lib/paths'

/** Role-aware paths for the authenticated workspace */
export function useAppPaths() {
  const { user } = useAuth()
  if (!user) {
    return appPaths('OWNER')
  }
  return appPaths(user.role)
}

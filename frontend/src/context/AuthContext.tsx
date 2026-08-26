import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '@/services/auth.service'
import { getAccessToken, getErrorMessage, setAccessToken } from '@/services/api'
import { roleHome } from '@/lib/paths'
import type { AuthUser, Invitation, UserRole } from '@/types'
import { isAxiosError } from 'axios'

type AuthResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; redirectTo?: string }

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  registerOwner: (data: {
    name: string
    email: string
    phone: string
    password: string
  }) => Promise<AuthResult>
  activateTenant: (token: string, password: string) => Promise<AuthResult>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  homePath: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapUser(user: AuthUser): AuthUser {
  return {
    ...user,
    isNewOwner: user.role === 'OWNER' ? Boolean(user.isNewOwner) : false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    const me = await authApi.fetchMe()
    setUser(mapUser(me))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        if (!getAccessToken()) {
          if (!cancelled) setUser(null)
          return
        }
        const me = await authApi.fetchMe()
        if (!cancelled) setUser(mapUser(me))
      } catch {
        setAccessToken(null)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const homePath = user ? roleHome(user.role) : '/login'

    return {
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      homePath,
      refreshUser,
      login: async (email, password) => {
        try {
          const result = await authApi.login({ email, password })
          const mapped = mapUser(result.user)
          setUser(mapped)

          if (
            mapped.role === 'TENANT' &&
            (mapped.tenantAccess?.status === 'CLOSED' ||
              mapped.tenantAccess?.status === 'REVOKED')
          ) {
            return {
              ok: false,
              error: 'ACCESS_CLOSED',
              redirectTo: `/access-closed?property=${encodeURIComponent(
                mapped.tenantAccess.propertyName || '',
              )}`,
            }
          }

          return { ok: true, redirectTo: roleHome(mapped.role) }
        } catch (error) {
          if (isAxiosError(error) && error.response?.data?.message === 'ACCESS_CLOSED') {
            const propertyName =
              (error.response.data as { propertyName?: string }).propertyName || ''
            return {
              ok: false,
              error: 'ACCESS_CLOSED',
              redirectTo: `/access-closed?property=${encodeURIComponent(propertyName)}`,
            }
          }
          return { ok: false, error: getErrorMessage(error, 'Invalid email or password') }
        }
      },
      registerOwner: async (data) => {
        try {
          const result = await authApi.registerOwner(data)
          const mapped = mapUser(result.user)
          setUser(mapped)
          return {
            ok: true,
            redirectTo: mapped.isNewOwner ? '/owner/onboarding' : roleHome('OWNER'),
          }
        } catch (error) {
          return { ok: false, error: getErrorMessage(error, 'Unable to create account') }
        }
      },
      activateTenant: async (token, password) => {
        try {
          const result = await authApi.activateTenant({ token, password })
          const mapped = mapUser(result.user)
          setUser(mapped)
          return { ok: true, redirectTo: '/tenant/dashboard' }
        } catch (error) {
          return { ok: false, error: getErrorMessage(error, 'Unable to activate access') }
        }
      },
      logout: async () => {
        await authApi.logout()
        setUser(null)
      },
    }
  }, [user, isBootstrapping, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRole(): UserRole {
  const { user } = useAuth()
  if (!user) throw new Error('useRole requires an authenticated user')
  return user.role
}

export type { Invitation }

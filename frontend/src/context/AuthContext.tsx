import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEMO_OWNER, DEMO_TENANT, type UserRole } from '@/data/mock'

type User = {
  name: string
  email: string
  role: UserRole
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  demoMode: 'populated' | 'empty'
  login: (role: UserRole) => void
  logout: () => void
  switchRole: (role: UserRole) => void
  setDemoMode: (mode: 'populated' | 'empty') => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [demoMode, setDemoMode] = useState<'populated' | 'empty'>('populated')

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      demoMode,
      login: (role) => setUser(role === 'owner' ? DEMO_OWNER : DEMO_TENANT),
      logout: () => setUser(null),
      switchRole: (role) => setUser(role === 'owner' ? DEMO_OWNER : DEMO_TENANT),
      setDemoMode,
    }),
    [user, demoMode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

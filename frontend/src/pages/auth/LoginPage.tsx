import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (!result.ok) {
        if (result.error === 'ACCESS_CLOSED' && result.redirectTo) {
          navigate(result.redirectTo)
          return
        }
        setError(result.error)
        return
      }
      navigate(result.redirectTo)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-card">
        <Link to="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            RR
          </div>
          <span className="font-extrabold text-ink">ReturnReady</span>
        </Link>

        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Your account role is fixed. You&apos;ll be taken to your Owner or Tenant workspace
          automatically.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-ink-secondary">
          <p>
            Property owner?{' '}
            <Link to="/register/owner" className="font-semibold text-brand-700 hover:underline">
              Create Owner Account
            </Link>
          </p>
          <p className="text-ink-muted">Tenants sign in after accepting an owner invitation.</p>
        </div>
      </div>
    </div>
  )
}

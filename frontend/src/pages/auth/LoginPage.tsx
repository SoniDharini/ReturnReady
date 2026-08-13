import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('rahul@example.com')
  const [password, setPassword] = useState('password')
  const [remember, setRemember] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isTenant = email.toLowerCase().includes('aaditya') || email.toLowerCase().includes('tenant')
    login(isTenant ? 'tenant' : 'owner')
    navigate('/app/dashboard')
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
          Access your properties, inspections, and settlements.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink-secondary">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-600"
              />
              Remember me
            </label>
            <button type="button" className="font-semibold text-brand-700 hover:underline">
              Forgot password?
            </button>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create Account
          </Link>
        </p>

        <div className="mt-6 rounded-xl bg-surface-muted p-3 text-xs text-ink-muted">
          Demo tip: use any email for owner, or include &quot;aaditya&quot; / &quot;tenant&quot; for tenant view.
        </div>
      </div>
    </div>
  )
}

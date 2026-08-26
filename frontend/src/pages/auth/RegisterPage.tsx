import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { registerOwner } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await registerOwner({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      if (!result.ok) {
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
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 shadow-card">
        <Link to="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            RR
          </div>
          <span className="font-extrabold text-ink">ReturnReady</span>
        </Link>

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Property Owner</p>
        <h1 className="text-2xl font-bold text-ink">Create Owner Account</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Create your account to manage properties, invite tenants, conduct inspections and complete
          rental handovers.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
            required
          />
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 chars, upper, lower, number"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            placeholder="Re-enter password"
            required
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Owner Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign In
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Tenants cannot register here. Use your invitation link instead.
        </p>
      </div>
    </div>
  )
}

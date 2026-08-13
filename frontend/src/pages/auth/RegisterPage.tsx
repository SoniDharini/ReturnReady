import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/data/mock'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [role, setRole] = useState<UserRole>('owner')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login(role)
    navigate('/app/dashboard')
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

        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Start documenting property condition with shared evidence.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'owner', label: 'Property Owner', icon: Building2, hint: 'Manage properties & tenancies' },
                  { id: 'tenant', label: 'Tenant', icon: Home, hint: 'Join inspections & settlements' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id)}
                  className={cn(
                    'rounded-2xl border-2 p-4 text-left transition-colors',
                    role === option.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-border bg-white hover:border-border-strong',
                  )}
                >
                  <option.icon
                    className={cn('mb-2 h-5 w-5', role === option.id ? 'text-brand-700' : 'text-ink-muted')}
                  />
                  <p className="text-sm font-bold text-ink">{option.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{option.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <Input label="Full Name" name="name" placeholder="Rahul Patel" required />
          <Input label="Email" type="email" name="email" placeholder="you@example.com" required />
          <Input label="Phone Number" type="tel" name="phone" placeholder="+91 98765 43210" required />
          <Input label="Password" type="password" name="password" placeholder="Create a password" required />
          <Input
            label="Confirm Password"
            type="password"
            name="confirm"
            placeholder="Re-enter password"
            required
          />

          <Button type="submit" className="w-full" size="lg">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

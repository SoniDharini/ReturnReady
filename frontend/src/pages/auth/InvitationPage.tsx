import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { getInvitation } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'
import type { Invitation } from '@/types'
import { formatCurrency } from '@/lib/utils'

export function InvitationPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { activateTenant } = useAuth()
  const [invite, setInvite] = useState<Invitation | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [step, setStep] = useState<'review' | 'activate'>('review')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingInvite(true)
      setLoadError('')
      try {
        const data = await getInvitation(token)
        if (!cancelled) setInvite(data)
      } catch (err) {
        if (!cancelled) setLoadError(getErrorMessage(err, 'Invitation Not Available'))
      } finally {
        if (!cancelled) setLoadingInvite(false)
      }
    }
    if (token) void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const expired = useMemo(
    () => loadError.toLowerCase().includes('expired'),
    [loadError],
  )

  if (loadingInvite) {
    return (
      <InviteShell>
        <p className="text-sm text-ink-secondary">Loading invitation...</p>
      </InviteShell>
    )
  }

  if (loadError || !invite) {
    return (
      <InviteShell>
        <h1 className="text-2xl font-bold text-ink">
          {expired ? 'This invitation has expired' : 'Invitation Not Available'}
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {expired
            ? 'Ask the property owner to send a new invitation.'
            : 'This invitation may have already been accepted, cancelled or expired.'}
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Back to ReturnReady</Button>
        </Link>
      </InviteShell>
    )
  }

  if (step === 'activate') {
    return (
      <InviteShell>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Tenant access</p>
        <h1 className="text-2xl font-bold text-ink">Activate My Access</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Your details come from the owner invitation. Create a password to activate your Tenant
          workspace.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            if (password !== confirm) {
              setError('Passwords do not match.')
              return
            }
            if (!acceptedTerms) {
              setError('Please accept the terms to continue.')
              return
            }
            setSubmitting(true)
            try {
              const result = await activateTenant(token, password)
              if (!result.ok) {
                setError(result.error)
                return
              }
              navigate(result.redirectTo)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <Input label="Full Name" value={invite.tenantName} readOnly />
          <Input label="Email" value={invite.tenantEmail} readOnly />
          <Input
            label="Create Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <label className="flex items-start gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            I accept the Terms and understand my access is connected only to this rental.
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Activating...' : 'Activate My Access'}
          </Button>
          <Button type="button" variant="tertiary" className="w-full" onClick={() => setStep('review')}>
            Back
          </Button>
        </form>
      </InviteShell>
    )
  }

  return (
    <InviteShell>
      <h1 className="text-2xl font-bold text-ink">You&apos;ve been invited to a rental handover</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        <span className="font-semibold text-ink">{invite.ownerName}</span> has invited you to join
        ReturnReady for:
      </p>

      <dl className="mt-8 space-y-4 rounded-2xl bg-surface-muted p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Property</dt>
          <dd className="font-semibold text-ink text-right">{invite.propertyName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Rental Period</dt>
          <dd className="font-semibold text-ink text-right">
            {invite.moveIn} – {invite.moveOut}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Security Deposit</dt>
          <dd className="font-semibold text-ink">{formatCurrency(invite.deposit)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Owner</dt>
          <dd className="font-semibold text-ink">{invite.ownerName}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-ink-muted">Your access will only be connected to this rental.</p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" size="lg" onClick={() => setStep('activate')}>
          Accept Invitation
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="secondary" className="w-full" size="lg">
            Decline Invitation
          </Button>
        </Link>
      </div>
    </InviteShell>
  )
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            RR
          </div>
          <span className="font-extrabold text-ink">ReturnReady</span>
        </div>
        {children}
      </Card>
    </div>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'

export function InvitationPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const accept = () => {
    login('tenant')
    navigate('/app/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            RR
          </div>
          <span className="font-extrabold text-ink">ReturnReady</span>
        </div>

        <h1 className="text-2xl font-bold text-ink">Rahul Patel invited you to ReturnReady</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Accept to join the tenancy and participate in the property handover record.
        </p>

        <dl className="mt-8 space-y-4 rounded-2xl bg-surface-muted p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Property</dt>
            <dd className="font-semibold text-ink">Green Residency — B-204</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Move-In</dt>
            <dd className="font-semibold text-ink">1 June 2026</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Move-Out</dt>
            <dd className="font-semibold text-ink">31 May 2027</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Security Deposit</dt>
            <dd className="font-semibold text-ink">{formatCurrency(50000)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" size="lg" onClick={accept}>
            Accept Invitation
          </Button>
          <Link to="/" className="flex-1">
            <Button variant="secondary" className="w-full" size="lg">
              Decline
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

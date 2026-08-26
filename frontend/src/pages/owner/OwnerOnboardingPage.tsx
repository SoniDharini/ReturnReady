import { useNavigate } from 'react-router-dom'
import { Building2, ClipboardCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'

const steps = [
  {
    icon: Building2,
    title: '1. Add Property',
    description: 'Create rooms and inventory for your rental.',
  },
  {
    icon: UserPlus,
    title: '2. Invite Tenant',
    description: 'Send a secure invitation to join this handover.',
  },
  {
    icon: ClipboardCheck,
    title: '3. Complete Move-In Inspection',
    description: 'Document condition together and lock the baseline.',
  },
]

export function OwnerOnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-brand-700">Welcome to ReturnReady</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Let&apos;s set up your first property.</h1>
        <p className="mt-3 text-ink-secondary">
          Hi {user?.name.split(' ')[0] || 'there'} — ReturnReady will guide you through adding your
          property, inviting your tenant and creating the move-in condition record.
        </p>
      </div>

      <div className="grid gap-3">
        {steps.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-ink">{title}</h2>
              <p className="mt-1 text-sm text-ink-secondary">{description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={() => navigate('/owner/properties/new')}>
          Add My First Property
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/owner/dashboard')}>
          Explore Dashboard
        </Button>
      </div>
    </div>
  )
}

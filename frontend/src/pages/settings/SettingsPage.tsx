import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export function SettingsPage() {
  const { user, demoMode, setDemoMode, switchRole } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Manage your profile and demo preferences." />

      <Card className="space-y-4">
        <h2 className="font-bold text-ink">Profile</h2>
        <Input label="Full Name" defaultValue={user?.name} />
        <Input label="Email" type="email" defaultValue={user?.email} />
        <Input
          label="Role"
          value={user?.role === 'owner' ? 'Property Owner' : 'Tenant'}
          readOnly
        />
        <Button>Save Changes</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold text-ink">Demo Controls</h2>
        <p className="text-sm text-ink-secondary">
          Switch roles or toggle empty states to preview the full UX without fake clutter.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => switchRole(user?.role === 'owner' ? 'tenant' : 'owner')}>
            Switch to {user?.role === 'owner' ? 'Tenant' : 'Owner'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDemoMode(demoMode === 'populated' ? 'empty' : 'populated')}
          >
            Show {demoMode === 'populated' ? 'Empty' : 'Populated'} States
          </Button>
        </div>
      </Card>
    </div>
  )
}

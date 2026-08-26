import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Manage your profile. Your role is fixed and cannot be changed." />

      <Card className="space-y-4">
        <h2 className="font-bold text-ink">Profile</h2>
        <Input label="Full Name" defaultValue={user?.name} />
        <Input label="Email" type="email" defaultValue={user?.email} />
        <Input
          label="Account Role"
          value={user?.role === 'OWNER' ? 'Property Owner' : 'Tenant'}
          readOnly
          hint="ReturnReady accounts use fixed roles. Owners self-register; tenants join by invitation only."
        />
        <Button>Save Changes</Button>
      </Card>
    </div>
  )
}

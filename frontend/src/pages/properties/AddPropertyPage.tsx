import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { PropertyWizard } from '@/components/properties/PropertyWizard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import type { Property } from '@/types'

export function AddPropertyPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { refreshUser } = useAuth()
  const [created, setCreated] = useState<Property | null>(null)

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">Property Added Successfully</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{created.name}</span> has been added to
            ReturnReady.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(paths.tenancyNew)}>Invite Tenant</Button>
            <Button variant="secondary" onClick={() => navigate(paths.property(created.id))}>
              View Property
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <PropertyWizard
      mode="create"
      onCancel={() => navigate(paths.properties)}
      onSuccess={async (property) => {
        await refreshUser()
        setCreated(property)
      }}
    />
  )
}

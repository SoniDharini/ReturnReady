import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { useAppPaths } from '@/hooks/useAppPaths'
import { getErrorMessage } from '@/services/api'
import {
  createMoveInInspection,
  listTenancyInspections,
} from '@/services/inspection.service'
import type { Inspection } from '@/types'

export function InspectionDashboardPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const moveIn = inspections.find((i) => i.type === 'MOVE_IN')

  useEffect(() => {
    if (!tenancyId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await listTenancyInspections(tenancyId)
        if (!cancelled) setInspections(data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load inspections'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [tenancyId])

  const startInspection = async () => {
    if (!tenancyId) return
    setStarting(true)
    setError('')
    try {
      const detail = await createMoveInInspection(tenancyId)
      navigate(paths.inspectionWizard(detail.inspection.id))
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to start inspection')
      if (message.includes('already exists') && moveIn) {
        navigate(paths.inspectionWizard(moveIn.id))
        return
      }
      setError(message)
    } finally {
      setStarting(false)
    }
  }

  if (!tenancyId) {
    return (
      <div>
        <PageHeader title="Move-In Inspection" description="Select a tenancy to begin." />
        <EmptyState
          icon={ClipboardCheck}
          title="No tenancy selected"
          description="Open a tenancy and choose Start Move-In Inspection."
        />
      </div>
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading inspection...</p>

  const canContinue =
    moveIn && ['DRAFT', 'IN_PROGRESS'].includes(moveIn.status)

  const showApproval = moveIn?.status === 'APPROVAL_PENDING'
  const isLocked = moveIn?.status === 'LOCKED'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Move-In Inspection"
        description="Document the property condition before the tenancy begins."
      />

      <Card>
        {moveIn ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{moveIn.propertyName}</h2>
                <p className="text-sm text-ink-secondary">Move-in inspection</p>
              </div>
              <Badge status={moveIn.status === 'APPROVAL_PENDING' ? 'Awaiting Approval' : 'In Progress'}>
                {moveIn.status.replaceAll('_', ' ')}
              </Badge>
            </div>

            {canContinue ? (
              <Button onClick={() => navigate(paths.inspectionWizard(moveIn.id))}>
                Continue Move-In Inspection
              </Button>
            ) : showApproval ? (
              <Button onClick={() => navigate(paths.inspectionApproval(moveIn.id))}>
                Review Approval Status
              </Button>
            ) : isLocked ? (
              <Badge status="Completed">Move-In Locked ✓</Badge>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-secondary">
              Start the move-in inspection to record room conditions, photos, meter readings, and keys
              handed over.
            </p>
            <Button disabled={starting} onClick={() => void startInspection()}>
              {starting ? 'Starting...' : 'Start Move-In Inspection'}
            </Button>
          </div>
        )}
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}

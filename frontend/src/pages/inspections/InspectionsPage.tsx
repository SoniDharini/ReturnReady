import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppPaths } from '@/hooks/useAppPaths'
import { getErrorMessage } from '@/services/api'
import { listMyInspections } from '@/services/inspection.service'
import type { Inspection } from '@/types'

export function InspectionsPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listMyInspections()
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
  }, [])

  if (loading) return <p className="text-sm text-ink-secondary">Loading inspections...</p>

  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Document property condition with photos, notes, and approvals."
      />

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {inspections.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No inspections yet"
          description="Inspections appear here once a tenancy is active and a handover begins."
        />
      ) : (
        <div className="grid gap-3">
          {inspections.map((inspection) => {
            const inProgress = ['DRAFT', 'IN_PROGRESS'].includes(inspection.status)
            return (
              <Card key={inspection.id} interactive className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">{inspection.propertyName}</h2>
                  <p className="text-sm text-ink-secondary">
                    {inspection.type.replaceAll('_', ' ')} inspection
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={inspection.status === 'APPROVAL_PENDING' ? 'Awaiting Approval' : 'In Progress'}>
                    {inspection.status.replaceAll('_', ' ')}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      inProgress
                        ? navigate(paths.inspectionWizard(inspection.id))
                        : navigate(paths.inspectionReview(inspection.id))
                    }
                  >
                    {inProgress ? 'Continue' : 'View'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

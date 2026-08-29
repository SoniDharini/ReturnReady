import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GitCompare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { formatCondition } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import { resolveInspectionImageUrl } from '@/services/inspection.service'
import {
  getComparison,
  listDamageAssessments,
  upsertDamageAssessment,
} from '@/services/settlement.service'
import type {
  ComparisonData,
  ComparisonItem,
  ComparisonResult,
  DamageAssessment,
  DamageClassification,
} from '@/types'

type FilterKey = 'all' | 'changed' | 'no_change' | 'damaged' | 'missing' | 'improved' | 'needs_review'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'changed', label: 'Changed' },
  { key: 'no_change', label: 'No Change' },
  { key: 'damaged', label: 'Damaged' },
  { key: 'missing', label: 'Missing' },
  { key: 'improved', label: 'Improved' },
  { key: 'needs_review', label: 'Needs Review' },
]

const CLASSIFICATIONS: Array<{ value: DamageClassification; label: string }> = [
  { value: 'NORMAL_WEAR_AND_TEAR', label: 'Normal Wear & Tear' },
  { value: 'EXISTING_DAMAGE', label: 'Existing Damage' },
  { value: 'TENANT_DAMAGE', label: 'Tenant Damage' },
  { value: 'MISSING_ITEM', label: 'Missing Item' },
  { value: 'REQUIRES_REVIEW', label: 'Requires Review' },
  { value: 'NO_ACTION', label: 'No Action Required' },
]

function resultLabel(result: ComparisonResult) {
  switch (result) {
    case 'NO_CHANGE':
      return 'No Change ✓'
    case 'IMPROVED':
      return 'Improved'
    case 'NEW_DAMAGE':
      return 'New Damage'
    case 'DETERIORATED':
      return 'Deteriorated'
    case 'MISSING':
      return 'Missing Item'
    default:
      return 'Needs Review'
  }
}

function resultTone(result: ComparisonResult): 'success' | 'warning' | 'danger' | 'neutral' {
  if (result === 'NO_CHANGE' || result === 'IMPROVED') return 'success'
  if (result === 'NEW_DAMAGE' || result === 'MISSING' || result === 'DETERIORATED') return 'danger'
  if (result === 'NEEDS_REVIEW') return 'warning'
  return 'neutral'
}

function matchesFilter(item: ComparisonItem, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'no_change') return item.result === 'NO_CHANGE'
  if (filter === 'improved') return item.result === 'IMPROVED'
  if (filter === 'missing') return item.result === 'MISSING'
  if (filter === 'needs_review') return item.result === 'NEEDS_REVIEW'
  if (filter === 'damaged') return ['NEW_DAMAGE', 'DETERIORATED'].includes(item.result)
  return !['NO_CHANGE', 'IMPROVED'].includes(item.result)
}

function ComparisonCard({
  item,
  assessment,
  isOwner,
  onAssess,
}: {
  item: ComparisonItem
  assessment?: DamageAssessment
  isOwner: boolean
  onAssess: (item: ComparisonItem) => void
}) {
  const muted = item.result === 'NO_CHANGE'
  const showCta = isOwner && !['NO_CHANGE', 'IMPROVED'].includes(item.result)

  return (
    <Card className={muted ? 'opacity-80' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink">{item.itemName}</h3>
          <p className="text-sm text-ink-muted">{item.roomName}</p>
        </div>
        <Badge tone={resultTone(item.result)}>{resultLabel(item.result)}</Badge>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Move-In</p>
          <p className="mt-2 font-semibold text-ink">{formatCondition(item.moveInCondition)}</p>
          {item.moveInIssue || item.moveInNotes ? (
            <p className="mt-1 text-sm text-ink-secondary">{item.moveInIssue || item.moveInNotes}</p>
          ) : null}
          {item.moveInEvidence[0] ? (
            <img
              src={resolveInspectionImageUrl(item.moveInEvidence[0].imageUrl)}
              alt="Move-in"
              className="mt-2 aspect-video w-full rounded-lg object-cover"
            />
          ) : null}
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Move-Out</p>
          <p className="mt-2 font-semibold text-ink">{formatCondition(item.moveOutCondition)}</p>
          {item.moveOutIssue || item.moveOutNotes ? (
            <p className="mt-1 text-sm text-ink-secondary">{item.moveOutIssue || item.moveOutNotes}</p>
          ) : null}
          {item.moveOutEvidence[0] ? (
            <img
              src={resolveInspectionImageUrl(item.moveOutEvidence[0].imageUrl)}
              alt="Move-out"
              className="mt-2 aspect-video w-full rounded-lg object-cover"
            />
          ) : null}
        </div>
      </div>

      {item.moveInCondition && item.moveOutCondition && item.result !== 'NO_CHANGE' ? (
        <p className="mt-3 text-sm text-ink-secondary">
          Condition changed: {formatCondition(item.moveInCondition)} →{' '}
          {formatCondition(item.moveOutCondition)}
        </p>
      ) : null}

      {assessment ? (
        <p className="mt-3 text-sm">
          <span className="font-semibold text-ink">Assessment: </span>
          {CLASSIFICATIONS.find((c) => c.value === assessment.classification)?.label}
        </p>
      ) : null}

      {showCta ? (
        <Button className="mt-4" variant="secondary" size="sm" onClick={() => onAssess(item)}>
          {assessment ? 'Update Assessment' : 'Review Damage'}
        </Button>
      ) : null}
    </Card>
  )
}

export function ComparisonPage() {
  const { user } = useAuth()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''
  const [data, setData] = useState<ComparisonData | null>(null)
  const [assessments, setAssessments] = useState<DamageAssessment[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assessItem, setAssessItem] = useState<ComparisonItem | null>(null)
  const [classification, setClassification] = useState<DamageClassification>('REQUIRES_REVIEW')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = user?.role === 'OWNER'

  const load = async () => {
    if (!tenancyId) return
    setLoading(true)
    try {
      const [comparison, assessmentList] = await Promise.all([
        getComparison(tenancyId),
        listDamageAssessments(tenancyId),
      ])
      setData(comparison)
      setAssessments(assessmentList)
      const expanded: Record<string, boolean> = {}
      comparison.rooms.forEach((room) => {
        expanded[room.roomId] = true
      })
      setExpandedRooms(expanded)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load comparison'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [tenancyId])

  const assessmentByItem = useMemo(() => {
    const map = new Map<string, DamageAssessment>()
    assessments.forEach((a) => {
      if (a.moveOutItemId) map.set(a.moveOutItemId, a)
    })
    return map
  }, [assessments])

  const filteredRooms = useMemo(() => {
    if (!data) return []
    return data.rooms
      .map((room) => ({
        ...room,
        items: room.items.filter((item) => matchesFilter(item, filter)),
      }))
      .filter((room) => room.items.length > 0)
  }, [data, filter])

  const openAssess = (item: ComparisonItem) => {
    const existing = item.moveOutItemId ? assessmentByItem.get(item.moveOutItemId) : undefined
    setAssessItem(item)
    setClassification(existing?.classification || 'REQUIRES_REVIEW')
    setDescription(existing?.description || '')
  }

  const saveAssessment = async () => {
    if (!tenancyId || !assessItem) return
    setSaving(true)
    try {
      const assessment = await upsertDamageAssessment(tenancyId, {
        key: assessItem.key,
        moveOutItemId: assessItem.moveOutItemId || undefined,
        classification,
        description,
      })
      setAssessments((prev) => {
        const next = prev.filter((a) => a.id !== assessment.id)
        return [assessment, ...next]
      })
      setAssessItem(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save assessment'))
    } finally {
      setSaving(false)
    }
  }

  if (!tenancyId) {
    return (
      <div>
        <PageHeader title="Move-In vs Move-Out" description="Review property condition changes." />
        <EmptyState
          icon={GitCompare}
          title="No tenancy selected"
          description="Open a tenancy to view the move-in vs move-out comparison."
        />
      </div>
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading comparison...</p>
  if (error && !data) return <p className="text-sm text-danger">{error}</p>
  if (!data) return <p className="text-sm text-danger">Comparison not available.</p>

  const noChanges = data.summary.changed === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move-In vs Move-Out"
        description="Review how the property condition changed during the tenancy."
        actions={
          isOwner ? (
            <Button variant="secondary" onClick={() => window.location.assign(paths.settlement(tenancyId))}>
              Propose Deductions
            </Button>
          ) : null
        }
      />

      <Card>
        <p className="text-sm text-ink-secondary">
          Property: <span className="font-semibold text-ink">{data.tenancy.propertyName}</span>
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          Tenant: <span className="font-semibold text-ink">{data.tenancy.tenantName}</span>
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: 'Items Compared', value: data.summary.totalItems },
          { label: 'No Change', value: data.summary.unchanged },
          { label: 'New Damage', value: data.summary.damaged },
          { label: 'Missing', value: data.summary.missing },
          { label: 'Improved', value: data.summary.improved },
          { label: 'Needs Review', value: data.summary.needsReview },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-xs text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      {noChanges ? (
        <Card className="text-center">
          <h2 className="text-lg font-bold text-ink">Property Condition Matched</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            No significant condition changes were identified between Move-In and Move-Out.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={filter === item.key ? 'primary' : 'secondary'}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredRooms.map((room) => (
          <Card key={room.roomId}>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() =>
                setExpandedRooms((prev) => ({ ...prev, [room.roomId]: !prev[room.roomId] }))
              }
            >
              <h2 className="text-lg font-bold text-ink">{room.roomName}</h2>
              <span className="text-sm text-ink-muted">{room.items.length} items</span>
            </button>
            {expandedRooms[room.roomId] ? (
              <div className="mt-4 space-y-4">
                {room.items.map((item) => (
                  <ComparisonCard
                    key={item.key}
                    item={item}
                    assessment={
                      item.moveOutItemId ? assessmentByItem.get(item.moveOutItemId) : undefined
                    }
                    isOwner={isOwner}
                    onAssess={openAssess}
                  />
                ))}
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      {data.meterComparisons.length > 0 ? (
        <Card>
          <h2 className="text-lg font-bold text-ink">Meter Readings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.meterComparisons.map((meter) => (
              <li key={meter.label} className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="font-semibold text-ink">{meter.label}</p>
                <p>
                  Move-In: {meter.moveInReading || '—'} {meter.unit} · Move-Out:{' '}
                  {meter.moveOutReading || '—'} {meter.unit}
                </p>
                {meter.usage !== null ? (
                  <p className="text-ink-secondary">Usage: {meter.usage} {meter.unit}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Modal
        open={Boolean(assessItem)}
        onClose={() => setAssessItem(null)}
        title="Damage Assessment"
        description={assessItem ? `${assessItem.roomName} — ${assessItem.itemName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssessItem(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void saveAssessment()}>
              {saving ? 'Saving...' : 'Save Assessment'}
            </Button>
          </>
        }
      >
        {assessItem ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-ink-muted">Move-In</p>
                <p className="font-semibold">{formatCondition(assessItem.moveInCondition)}</p>
              </div>
              <div>
                <p className="text-ink-muted">Move-Out</p>
                <p className="font-semibold">{formatCondition(assessItem.moveOutCondition)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Classification</p>
              <div className="space-y-2">
                {CLASSIFICATIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="classification"
                      checked={classification === option.value}
                      onChange={() => setClassification(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea
              label="Assessment Notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe why this classification was chosen."
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

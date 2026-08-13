import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { comparisonItems } from '@/data/mock'
import { cn } from '@/lib/utils'

const filters = ['All', 'No Change', 'Changed', 'Damaged', 'Missing', 'Needs Review'] as const

export function ComparisonPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [damageOpen, setDamageOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(comparisonItems[0])

  const filtered = useMemo(() => {
    if (filter === 'All') return comparisonItems
    if (filter === 'Damaged') return comparisonItems.filter((i) => i.status === 'New Damage')
    if (filter === 'Changed') return comparisonItems.filter((i) => i.status !== 'No Change')
    return comparisonItems.filter((i) => i.status === filter || (filter === 'Needs Review' && i.status === 'Needs Review'))
  }, [filter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move-In vs Move-Out"
        description="Review changes identified during the property handover."
        actions={
          <Button onClick={() => navigate('/app/settlement')}>Continue to Settlement</Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold',
              filter === item ? 'bg-brand-600 text-white' : 'bg-white text-ink-secondary border border-border',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((item) => {
          const unchanged = item.status === 'No Change'
          return (
            <Card
              key={item.id}
              className={cn(unchanged && 'border-success/20 bg-success-bg/40', item.status === 'New Damage' && 'border-danger/20')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-ink-muted">{item.room}</p>
                  <h3 className="text-lg font-bold text-ink">{item.name}</h3>
                </div>
                <Badge status={item.status}>
                  {item.status === 'New Damage' ? '⚠ New Damage' : item.status === 'Missing' ? '⚠ Missing' : item.status === 'No Change' ? '✓ No Significant Change' : item.status}
                </Badge>
              </div>

              {!unchanged ? (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {[
                      { label: 'MOVE-IN', data: item.moveIn },
                      { label: 'MOVE-OUT', data: item.moveOut },
                    ].map((side) => (
                      <div key={side.label} className="rounded-xl border border-border bg-surface-muted/50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{side.label}</p>
                        <div className="mt-3 flex h-28 items-center justify-center rounded-lg bg-white text-ink-muted">
                          <Camera className="h-6 w-6" aria-hidden />
                        </div>
                        <p className="mt-3 text-sm">
                          <span className="text-ink-muted">Condition:</span>{' '}
                          <span className="font-semibold text-ink">{side.data.condition}</span>
                        </p>
                        {side.data.notes ? (
                          <p className="mt-1 text-sm text-ink-secondary">Notes: {side.data.notes}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-muted">Date: {side.data.date}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-ink">
                      Condition changed: {item.moveIn.condition} → {item.moveOut.condition}
                    </p>
                    {(item.status === 'New Damage' || item.status === 'Needs Review' || item.status === 'Missing') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setDamageOpen(true)
                        }}
                      >
                        <TriangleAlert className="h-4 w-4" />
                        Review Damage
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-3 flex gap-6 text-sm text-ink-secondary">
                  <span>Move-In: {item.moveIn.condition}</span>
                  <span>Move-Out: {item.moveOut.condition}</span>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Modal
        open={damageOpen}
        onClose={() => setDamageOpen(false)}
        title="Damage Assessment"
        description={`Item: ${selectedItem.name}`}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDamageOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDamageOpen(false)
                navigate('/app/settlement')
              }}
            >
              Add Deduction
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex h-24 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex h-24 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
              <Camera className="h-5 w-5" />
            </div>
          </div>
          <Select
            label="Classification"
            options={[
              { value: 'wear', label: 'Normal Wear & Tear' },
              { value: 'existing', label: 'Existing Damage' },
              { value: 'tenant', label: 'Tenant Damage' },
              { value: 'missing', label: 'Missing Item' },
              { value: 'review', label: 'Requires Review' },
            ]}
            defaultValue="tenant"
          />
          <Textarea
            label="Description"
            placeholder="Describe why this classification was selected."
            defaultValue="Move-out photo shows a tear not present at move-in."
          />
          <Input label="Estimated deduction" placeholder="₹ ______" defaultValue="3000" />
        </div>
      </Modal>
    </div>
  )
}

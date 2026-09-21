import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { categoryLabel, CONDITION_CATEGORIES, CONDITION_TEMPLATES } from '@/lib/handoverUi'
import { getErrorMessage } from '@/services/api'
import {
  createCondition,
  deleteCondition,
  listConditions,
  updateCondition,
} from '@/services/handover.service'
import type { ConditionCategory, TenancyCondition } from '@/types'

type ConditionManagerProps = {
  tenancyId: string
  onChanged?: () => void
}

export function ConditionManager({ tenancyId, onChanged }: ConditionManagerProps) {
  const [conditions, setConditions] = useState<TenancyCondition[]>([])
  const [locked, setLocked] = useState(false)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TenancyCondition | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ConditionCategory>('GENERAL')
  const [isMandatory, setIsMandatory] = useState(true)
  const [requiresAcceptance, setRequiresAcceptance] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<TenancyCondition | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listConditions(tenancyId)
      setConditions(data.conditions)
      setLocked(data.locked)
      setAcceptedAt(data.conditionsAcceptedAt || null)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load handover conditions'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [tenancyId])

  const openCreate = (template?: (typeof CONDITION_TEMPLATES)[number]) => {
    setEditing(null)
    setTitle(template?.title || '')
    setDescription(template?.description || '')
    setCategory(template?.category || 'GENERAL')
    setIsMandatory(true)
    setRequiresAcceptance(true)
    setModalOpen(true)
  }

  const openEdit = (condition: TenancyCondition) => {
    setEditing(condition)
    setTitle(condition.title)
    setDescription(condition.description)
    setCategory(condition.category)
    setIsMandatory(condition.isMandatory)
    setRequiresAcceptance(condition.requiresTenantAcceptance !== false)
    setModalOpen(true)
  }

  const save = async () => {
    if (!title.trim()) {
      setError('Enter a condition title.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateCondition(editing.id, {
          title,
          description,
          category,
          isMandatory,
          requiresTenantAcceptance: requiresAcceptance,
        })
      } else {
        await createCondition(tenancyId, {
          title,
          description,
          category,
          isMandatory,
          requiresTenantAcceptance: requiresAcceptance,
        })
      }
      setModalOpen(false)
      await load()
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save condition'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setSaving(true)
    try {
      await deleteCondition(removeTarget.id)
      setRemoveTarget(null)
      await load()
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove condition'))
    } finally {
      setSaving(false)
    }
  }

  const canEdit = (condition: TenancyCondition) =>
    !locked || condition.status === 'AMENDMENT_PENDING' || condition.status === 'DRAFT'

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Property Handover Conditions</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Add any conditions the Tenant should agree to before moving in.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          Add Condition
        </Button>
      </div>

      {locked ? (
        <p className="mt-3 text-sm text-ink-secondary">
          Tenant accepted these conditions
          {acceptedAt ? ` on ${new Date(acceptedAt).toLocaleDateString()}` : ''}. New items are
          recorded as amendments.
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-ink-secondary">Loading conditions...</p> : null}

      {!loading && !conditions.length ? (
        <div className="mt-4">
          <p className="text-sm text-ink-muted">No handover conditions yet. Suggestions:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONDITION_TEMPLATES.slice(0, 4).map((template) => (
              <Button
                key={template.title}
                size="sm"
                variant="secondary"
                onClick={() => openCreate(template)}
              >
                {template.title}
              </Button>
            ))}
          </div>
        </div>
      ) : !loading ? (
        <ul className="mt-4 space-y-3">
          {conditions.map((condition) => (
            <li key={condition.id} className="rounded-xl border border-border px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{condition.title}</p>
                    <Badge status={condition.status === 'ACCEPTED' ? 'Active' : 'Proposed'}>
                      {condition.status === 'AMENDMENT_PENDING'
                        ? 'Amendment'
                        : condition.status === 'ACCEPTED'
                          ? 'Accepted'
                          : 'Draft'}
                    </Badge>
                    <span className="text-xs text-ink-muted">{categoryLabel(condition.category)}</span>
                    {condition.isMandatory ? (
                      <span className="text-xs text-ink-muted">Mandatory</span>
                    ) : null}
                  </div>
                  {condition.description ? (
                    <p className="mt-1 text-sm text-ink-secondary">{condition.description}</p>
                  ) : null}
                  {condition.status === 'ACCEPTED' && condition.acceptedAt ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Accepted by Tenant · {new Date(condition.acceptedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                {canEdit(condition) ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(condition)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="tertiary" onClick={() => setRemoveTarget(condition)}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Condition' : 'Add Condition'}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving condition...' : editing ? 'Update Condition' : 'Save Condition'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && modalOpen ? <p className="text-sm text-danger">{error}</p> : null}
          <Input label="Condition Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ConditionCategory)}
            options={CONDITION_CATEGORIES}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-start gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
            />
            Tenant must accept this before Move-In
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={requiresAcceptance}
              onChange={(e) => setRequiresAcceptance(e.target.checked)}
            />
            Requires Tenant Acceptance
          </label>
        </div>
      </Modal>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Condition?"
        description={removeTarget ? `${removeTarget.title} will no longer be shown to the Tenant.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={() => void remove()}>
              Remove Condition
            </Button>
          </>
        }
      />
    </Card>
  )
}

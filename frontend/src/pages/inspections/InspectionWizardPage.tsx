import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AccessItemsStep } from '@/components/inspections/AccessItemsStep'
import { InspectionItemCard } from '@/components/inspections/InspectionItemCard'
import { InspectionProgress } from '@/components/inspections/InspectionProgress'
import { MeterReadingStep } from '@/components/inspections/MeterReadingStep'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAppPaths } from '@/hooks/useAppPaths'
import { getErrorMessage } from '@/services/api'
import { getInspection, updateInspectionStep } from '@/services/inspection.service'
import type { InspectionDetail, InspectionItem } from '@/types'

type WizardStep =
  | { kind: 'room'; roomId: string; roomName: string }
  | { kind: 'meters' }
  | { kind: 'access' }

export function InspectionWizardPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const inspectionId = searchParams.get('inspectionId') || ''
  const [detail, setDetail] = useState<InspectionDetail | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingStep, setSavingStep] = useState(false)

  const load = useCallback(async () => {
    if (!inspectionId) return
    setLoading(true)
    try {
      const data = await getInspection(inspectionId)
      setDetail(data)
      setStepIndex(data.inspection.currentStepIndex || 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load inspection'))
    } finally {
      setLoading(false)
    }
  }, [inspectionId])

  useEffect(() => {
    void load()
  }, [load])

  const steps: WizardStep[] = useMemo(() => {
    if (!detail) return []
    const roomSteps: WizardStep[] = detail.rooms.map((room) => ({
      kind: 'room',
      roomId: room.roomId,
      roomName: room.roomName,
    }))
    return [...roomSteps, { kind: 'meters' }, { kind: 'access' }]
  }, [detail])

  const progressSteps = useMemo(() => {
    if (!detail) return []
    return steps.map((step, index) => {
      let complete = false
      if (step.kind === 'room') {
        const room = detail.rooms.find((r) => r.roomId === step.roomId)
        complete = Boolean(room?.items.length && room.items.every((i) => i.isCompleted))
      } else if (step.kind === 'meters') {
        complete = detail.meters.length > 0
      } else {
        complete = true // access is optional
      }
      return {
        id: step.kind === 'room' ? step.roomId : step.kind,
        label: step.kind === 'room' ? step.roomName : step.kind === 'meters' ? 'Meter Readings' : 'Keys & Access',
        complete,
        current: index === stepIndex,
      }
    })
  }, [detail, steps, stepIndex])

  const currentStep = steps[stepIndex]
  const readOnly =
    detail?.inspection.status === 'APPROVAL_PENDING' ||
    detail?.inspection.status === 'LOCKED' ||
    detail?.inspection.status === 'COMPLETED'

  const isMoveOut = detail?.inspection.type === 'MOVE_OUT'

  const getBaselineForItem = (item: InspectionItem) => {
    if (!detail?.baseline?.itemsByKey) return null
    const inv = item.inventoryItemId || 'room'
    const key = `${item.roomId}:${item.itemType}:${inv}`
    const baselineItem = detail.baseline.itemsByKey[key]
    if (!baselineItem) return null
    const evidence = detail.baseline.evidenceByItem?.[baselineItem.id] || []
    return {
      condition: baselineItem.condition,
      notes: baselineItem.notes,
      issueDescription: baselineItem.issueDescription,
      evidence,
    }
  }

  const persistStep = async (nextIndex: number) => {
    if (!inspectionId) return
    setSavingStep(true)
    try {
      await updateInspectionStep(inspectionId, nextIndex)
      setStepIndex(nextIndex)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingStep(false)
    }
  }

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      void persistStep(stepIndex + 1)
    } else if (inspectionId) {
      navigate(paths.inspectionReview(inspectionId))
    }
  }

  const goPrev = () => {
    if (stepIndex > 0) void persistStep(stepIndex - 1)
  }

  const handleItemUpdated = (updated: InspectionItem) => {
    setDetail((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        rooms: prev.rooms.map((room) => ({
          ...room,
          items: room.items.map((item) => (item.id === updated.id ? updated : item)),
        })),
      }
    })
    void load()
  }

  if (!inspectionId) {
    return <p className="text-sm text-danger">Missing inspection ID.</p>
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading inspection wizard...</p>
  if (error && !detail) return <p className="text-sm text-danger">{error}</p>
  if (!detail) return <p className="text-sm text-danger">Inspection not found.</p>

  if (detail.rooms.length === 0 && currentStep?.kind === 'room') {
    return (
      <Card>
        <h2 className="text-lg font-bold text-ink">No Rooms Available</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          This property does not currently contain any rooms to inspect.
        </p>
      </Card>
    )
  }

  const currentRoom =
    currentStep?.kind === 'room'
      ? detail.rooms.find((r) => r.roomId === currentStep.roomId)
      : null

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit lg:sticky lg:top-6">
        <InspectionProgress
          propertyName={detail.inspection.propertyName}
          steps={progressSteps}
          currentIndex={stepIndex}
          percent={detail.progress.percent}
        />
      </Card>

      <div className="space-y-6">
        {currentStep?.kind === 'room' && currentRoom ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">{currentRoom.roomName}</h2>
              <p className="text-sm text-ink-secondary">
                {isMoveOut
                  ? 'Record current move-out condition alongside the locked move-in baseline.'
                  : 'Inspect the room and each inventory item in this space.'}
              </p>
            </div>
            {currentRoom.items.map((item) => (
              <InspectionItemCard
                key={item.id}
                item={item}
                disabled={readOnly}
                baseline={isMoveOut ? getBaselineForItem(item) : null}
                evidence={detail.evidence.filter((e) => e.inspectionItemId === item.id)}
                onUpdated={handleItemUpdated}
                onEvidenceChange={() => void load()}
              />
            ))}
          </div>
        ) : null}

        {currentStep?.kind === 'meters' ? (
          <MeterReadingStep
            inspectionId={inspectionId}
            meters={detail.meters}
            disabled={readOnly}
            onChange={() => void load()}
          />
        ) : null}

        {currentStep?.kind === 'access' ? (
          <AccessItemsStep
            inspectionId={inspectionId}
            items={detail.accessItems}
            disabled={readOnly}
            onChange={() => void load()}
          />
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-2 border-t border-border bg-surface-muted/95 px-1 py-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="secondary" disabled={stepIndex === 0 || savingStep} onClick={goPrev}>
            Previous
          </Button>
          <Button type="button" className="flex-1 sm:flex-none" disabled={savingStep} onClick={goNext}>
            {savingStep
              ? 'Saving...'
              : stepIndex < steps.length - 1
                ? 'Save & Next'
                : 'Go to Review'}
          </Button>
        </div>
      </div>
    </div>
  )
}

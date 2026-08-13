import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { deductions } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'

export function SettlementPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [selected, setSelected] = useState(deductions[0])
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const refund = 50000 - totalDeductions
  const isTenant = user?.role === 'tenant'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Deposit Settlement"
        description="Green Residency — B-204"
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Security Deposit</p>
            <p className="text-3xl font-bold text-ink">{formatCurrency(50000)}</p>
          </div>
          <Badge status="Settlement Pending">Settlement Pending</Badge>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Proposed Deductions</h2>
        <div className="space-y-3">
          {deductions.map((deduction) => (
            <Card key={deduction.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{deduction.item}</h3>
                  <p className="mt-1 text-sm text-ink-secondary">{deduction.reason}</p>
                  <p className="mt-2 text-lg font-bold text-ink">{formatCurrency(deduction.amount)}</p>
                </div>
                <Badge status={deduction.status}>{deduction.status}</Badge>
              </div>

              {isTenant && deduction.status === 'Pending Tenant Review' ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-ink">Review Deduction</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-muted p-3 text-center">
                      <div className="mx-auto mb-2 flex h-16 items-center justify-center rounded-lg bg-white text-ink-muted">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-ink-muted">Move-In</p>
                    </div>
                    <div className="rounded-xl bg-surface-muted p-3 text-center">
                      <div className="mx-auto mb-2 flex h-16 items-center justify-center rounded-lg bg-white text-ink-muted">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-ink-muted">Move-Out</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm">Accept Deduction</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelected(deduction)
                        setDisputeOpen(true)
                      }}
                    >
                      Dispute
                    </Button>
                  </div>
                </div>
              ) : null}

              {deduction.status === 'Disputed' || deduction.status === 'Under Review' ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                  <p className="font-semibold text-ink">Discussion</p>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs font-semibold text-ink-muted">Tenant</p>
                    <p className="mt-1 text-ink-secondary">
                      “This tear was already present during move-in.”
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs font-semibold text-ink-muted">Owner response</p>
                    <p className="mt-1 text-ink-secondary">
                      “Move-in image shows only a stain, not the tear.”
                    </p>
                  </div>
                  {!isTenant ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary">
                        Update Deduction
                      </Button>
                      <Button size="sm">Accept Tenant Dispute</Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-brand-200">
        <h2 className="text-lg font-bold text-ink">Summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Security Deposit</dt>
            <dd className="font-semibold">{formatCurrency(50000)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Total Proposed Deductions</dt>
            <dd className="font-semibold text-danger">− {formatCurrency(totalDeductions)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="text-base font-bold text-ink">Expected Refund</dt>
            <dd className="text-2xl font-extrabold text-brand-700">{formatCurrency(refund)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge status="Ready for Sign-Off">Ready for Sign-Off</Badge>
          <Button className="ml-auto" onClick={() => navigate('/app/settlement/sign')}>
            Review & Sign
          </Button>
        </div>
      </Card>

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Dispute Deduction"
        description={`${selected.item} · ${formatCurrency(selected.amount)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDisputeOpen(false)}>Submit Dispute</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Reason"
            options={[
              { value: 'existed', label: 'Damage already existed' },
              { value: 'wear', label: 'Normal wear and tear' },
              { value: 'amount', label: 'Incorrect amount' },
              { value: 'item', label: 'Incorrect item' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Textarea label="Explanation" placeholder="Explain your dispute with clear details." />
          <Button variant="secondary" size="sm">
            Upload optional evidence
          </Button>
        </div>
      </Modal>
    </div>
  )
}

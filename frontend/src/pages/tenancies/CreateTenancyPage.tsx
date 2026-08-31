import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { listProperties } from '@/services/property.service'
import { createTenancy } from '@/services/tenancy.service'
import { getErrorMessage } from '@/services/api'
import type { Property } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'

const steps = ['Tenant', 'Rental Details', 'Review']

export function CreateTenancyPage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [searchParams] = useSearchParams()
  const preselectedPropertyId = searchParams.get('propertyId') || ''
  const [step, setStep] = useState(0)
  const [properties, setProperties] = useState<Property[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    moveIn: '',
    moveOut: '',
    rent: '',
    deposit: '',
  })

  useEffect(() => {
    void listProperties()
      .then((data) => {
        setProperties(data)
        if (preselectedPropertyId) {
          setPropertyId(preselectedPropertyId)
        } else if (data[0]) {
          setPropertyId(data[0].id)
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [preselectedPropertyId])

  const selected = properties.find((p) => p.id === propertyId)

  const sendInvite = async () => {
    setError('')
    setLoading(true)
    try {
      const tenancy = await createTenancy({
        propertyId,
        tenantName: form.tenantName,
        tenantEmail: form.tenantEmail,
        tenantPhone: form.tenantPhone,
        moveIn: form.moveIn,
        moveOut: form.moveOut,
        rent: Number(form.rent),
        deposit: Number(form.deposit),
      })
      navigate(paths.tenancy(tenancy.id))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send invitation'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Invite Tenant"
        description="Create a tenancy and send a secure invitation. The invitee will join as a Tenant."
      />

      <ol className="mb-6 flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <li
            key={label}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold',
              index === step
                ? 'bg-brand-600 text-white'
                : index < step
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-surface-subtle text-ink-muted',
            )}
          >
            {index + 1} {label}
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-ink">Tenant Information</h2>
            <Input
              label="Tenant Full Name"
              value={form.tenantName}
              onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
              required
            />
            <Input
              label="Tenant Email"
              type="email"
              value={form.tenantEmail}
              onChange={(e) => setForm((f) => ({ ...f, tenantEmail: e.target.value }))}
              required
            />
            <Input
              label="Tenant Phone Number"
              type="tel"
              value={form.tenantPhone}
              onChange={(e) => setForm((f) => ({ ...f, tenantPhone: e.target.value }))}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-ink">Rental Information</h2>
            {properties.length === 0 ? (
              <p className="text-sm text-ink-secondary">Add a property before inviting a tenant.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Property</p>
                {properties.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => setPropertyId(property.id)}
                    className={cn(
                      'w-full rounded-xl border-2 px-4 py-3 text-left',
                      propertyId === property.id ? 'border-brand-600 bg-brand-50' : 'border-border',
                    )}
                  >
                    <p className="font-semibold text-ink">{property.name}</p>
                    <p className="text-sm text-ink-muted">
                      {property.address}, {property.city}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Move-In Date"
                type="date"
                value={form.moveIn}
                onChange={(e) => setForm((f) => ({ ...f, moveIn: e.target.value }))}
                required
              />
              <Input
                label="Expected Move-Out Date"
                type="date"
                value={form.moveOut}
                onChange={(e) => setForm((f) => ({ ...f, moveOut: e.target.value }))}
                required
              />
              <Input
                label="Monthly Rent"
                type="number"
                value={form.rent}
                onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))}
                required
              />
              <Input
                label="Security Deposit"
                type="number"
                value={form.deposit}
                onChange={(e) => setForm((f) => ({ ...f, deposit: e.target.value }))}
                required
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="text-lg font-bold text-ink">Review</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Sending this invitation creates a Tenant-only account linked to this rental.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Property</dt>
                <dd className="font-semibold">{selected?.name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Tenant</dt>
                <dd className="font-semibold">{form.tenantName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Rental period</dt>
                <dd className="font-semibold">
                  {form.moveIn} – {form.moveOut}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Deposit</dt>
                <dd className="font-semibold">{formatCurrency(Number(form.deposit) || 0)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-8 flex flex-wrap justify-between gap-2">
          <Button variant="tertiary" onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={() => void sendInvite()} disabled={loading || !propertyId}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

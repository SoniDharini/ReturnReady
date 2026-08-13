import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { properties } from '@/data/mock'
import { cn, formatCurrency } from '@/lib/utils'

const steps = ['Property', 'Tenant', 'Rental Details', 'Review']

export function CreateTenancyPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [propertyId, setPropertyId] = useState('p1')

  const selected = properties.find((p) => p.id === propertyId)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Create Tenancy"
        description="Invite a tenant and set rental terms for a structured handover."
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
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Select Property</h2>
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
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-ink">Tenant Details</h2>
            <Input label="Tenant Name" defaultValue="Aaditya Shah" />
            <Input label="Tenant Email" type="email" defaultValue="aaditya@example.com" />
            <Input label="Phone" type="tel" defaultValue="+91 90000 11111" />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg font-bold text-ink sm:col-span-2">Rental Details</h2>
            <Input label="Move-In Date" type="date" defaultValue="2026-06-01" />
            <Input label="Move-Out Date" type="date" defaultValue="2027-05-31" />
            <Input label="Monthly Rent" type="number" defaultValue={28000} />
            <Input label="Security Deposit" type="number" defaultValue={50000} />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="text-lg font-bold text-ink">Review</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Property</dt>
                <dd className="font-semibold">{selected?.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Tenant</dt>
                <dd className="font-semibold">Aaditya Shah</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Period</dt>
                <dd className="font-semibold">01 Jun 2026 – 31 May 2027</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Rent</dt>
                <dd className="font-semibold">{formatCurrency(28000)} / month</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Deposit</dt>
                <dd className="font-semibold">{formatCurrency(50000)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-between gap-2">
          <Button variant="tertiary" onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={() => navigate('/app/tenancies/t1')}>
              Create Tenancy & Send Invitation
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { SettlementFinancials } from '@/types'

type SettlementSummaryCardsProps = {
  financials: SettlementFinancials
  showFinal: boolean
  isOwner: boolean
}

export function SettlementSummaryCards({
  financials,
  showFinal,
  isOwner,
}: SettlementSummaryCardsProps) {
  if (showFinal) {
    const cards = [
      { label: 'Security Deposit', value: formatCurrency(financials.securityDeposit) },
      { label: 'Final Deductions', value: formatCurrency(financials.finalDeductionTotal) },
      {
        label: 'Final Refund',
        value: formatCurrency(financials.finalRefund ?? 0),
        tone: 'brand' as const,
      },
    ]
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-sm text-ink-muted">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                card.tone === 'brand' ? 'text-brand-700' : 'text-ink'
              }`}
            >
              {card.value}
            </p>
          </Card>
        ))}
      </div>
    )
  }

  const hasDisputes = financials.disputedDeductionTotal > 0
  const proposedTotal =
    financials.proposedDeductionTotal +
    financials.disputedDeductionTotal +
    (financials.pendingReviewTotal ?? 0)

  const cards = [
    { label: 'Security Deposit', value: formatCurrency(financials.securityDeposit) },
    hasDisputes
      ? {
          label: isOwner ? 'Accepted / Resolved' : 'Accepted Deductions',
          value: formatCurrency(financials.acceptedDeductionTotal),
        }
      : {
          label: 'Proposed Deductions',
          value: formatCurrency(proposedTotal || financials.proposedDeductionTotal),
        },
    hasDisputes
      ? {
          label: 'Disputed Amount',
          value: formatCurrency(financials.disputedDeductionTotal),
          tone: 'warning' as const,
        }
      : {
          label: isOwner ? 'Accepted / Resolved' : 'Accepted Deductions',
          value: formatCurrency(financials.acceptedDeductionTotal),
        },
    {
      label: 'Projected Refund',
      value: formatCurrency(financials.projectedRefund),
      tone: 'brand' as const,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className="text-sm text-ink-muted">{card.label}</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              card.tone === 'brand'
                ? 'text-brand-700'
                : card.tone === 'warning'
                  ? 'text-warning'
                  : 'text-ink'
            }`}
          >
            {card.value}
          </p>
        </Card>
      ))}
    </div>
  )
}

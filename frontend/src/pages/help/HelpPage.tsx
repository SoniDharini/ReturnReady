import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'

const faqs = [
  {
    q: 'What is ReturnReady for?',
    a: 'It helps landlords and tenants document property condition at move-in, compare it at move-out, and settle deposits with shared evidence.',
  },
  {
    q: 'Can inspection records be changed after approval?',
    a: 'Once both parties approve, the inspection is locked so the evidence remains trustworthy.',
  },
  {
    q: 'How do disputes work?',
    a: 'Tenants can dispute a deduction with a reason and optional evidence. Owners can update the amount or accept the dispute.',
  },
]

export function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Help"
        description="Quick answers for completing your first handover confidently."
      />
      {faqs.map((faq) => (
        <Card key={faq.q}>
          <h3 className="font-bold text-ink">{faq.q}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{faq.a}</p>
        </Card>
      ))}
    </div>
  )
}

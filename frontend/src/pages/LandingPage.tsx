import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  FileCheck2,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const steps = [
  { label: 'Move-In', desc: 'Record condition' },
  { label: 'Document', desc: 'Photos & notes' },
  { label: 'Compare', desc: 'Side-by-side' },
  { label: 'Settle', desc: 'Fair deposit' },
]

const benefits = [
  {
    icon: ClipboardCheck,
    title: 'Document Everything',
    description: 'Create room-by-room inspection records with photos and notes.',
  },
  {
    icon: Camera,
    title: 'Compare Conditions',
    description: 'See move-in and move-out conditions side by side.',
  },
  {
    icon: Scale,
    title: 'Resolve Fairly',
    description: 'Identify damages, deductions and disputes using shared evidence.',
  },
  {
    icon: FileCheck2,
    title: 'Finalize Securely',
    description: 'Approve, sign and download the final property handover report.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border">
        <div className="page-container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              RR
            </div>
            <span className="text-base font-extrabold text-ink">ReturnReady</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="tertiary" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-50/80 to-white">
        <div className="page-container px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              ReturnReady
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Move in with proof. Move out with confidence.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              Create a shared property-condition record between landlords and tenants, compare
              move-in and move-out inspections, and settle deposits with clear evidence.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          <div id="how-it-works" className="mx-auto mt-14 max-w-3xl">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white p-4 shadow-card sm:grid-cols-4 sm:gap-0 sm:p-6">
              {steps.map((step, index) => (
                <div key={step.label} className="relative flex flex-col items-center px-2 py-3 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="mt-3 text-sm font-bold text-ink">{step.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{step.desc}</p>
                  {index < steps.length - 1 ? (
                    <span className="absolute right-0 top-8 hidden h-0.5 w-1/2 bg-border sm:block" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-sm font-medium text-ink-secondary">
              Move-In → Document → Compare → Settle
            </p>
          </div>
        </div>
      </section>

      <section className="page-container px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Built for fair handovers</h2>
          <p className="mt-3 text-ink-secondary">
            A focused workflow for documenting condition, comparing evidence, and settling deposits.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface-muted/60 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface-muted">
        <div className="page-container flex flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:px-6">
          <p>© 2026 ReturnReady. Fair rental handovers.</p>
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in to your account
          </Link>
        </div>
      </footer>
    </div>
  )
}

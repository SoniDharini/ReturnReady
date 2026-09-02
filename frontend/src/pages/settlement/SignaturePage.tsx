import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { useAppPaths } from '@/hooks/useAppPaths'
import { formatDisplayDate } from '@/lib/tenancyContext'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/services/api'
import { getSettlement, signSettlement } from '@/services/settlement.service'
import type { SettlementData } from '@/types'
import { PenLine } from 'lucide-react'

export function SignaturePage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const tenancyId = searchParams.get('tenancyId') || ''

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [data, setData] = useState<SettlementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const settlement = data?.settlement
  const financials = data?.financials
  const signatures = data?.signatures ?? []

  const tenantSig = signatures.find((s) => s.role === 'TENANT')
  const ownerSig = signatures.find((s) => s.role === 'OWNER')
  const userSigned =
    user?.role === 'TENANT' ? settlement?.tenantSigned : settlement?.ownerSigned

  useEffect(() => {
    if (!tenancyId) {
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const result = await getSettlement(tenancyId)
        setData(result)
        if (result.settlement?.status === 'COMPLETED') {
          navigate(paths.settlementComplete(tenancyId))
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load settlement'))
      } finally {
        setLoading(false)
      }
    })()
  }, [tenancyId, navigate, paths])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    setDrawing(true)
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = getPos(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1f24'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas || !tenancyId) return
    setSaving(true)
    setError('')
    try {
      const signatureDataUrl = canvas.toDataURL('image/png')
      const next = await signSettlement(tenancyId, signatureDataUrl)
      setData(next)
      if (next.settlement?.status === 'COMPLETED') {
        navigate(paths.settlementComplete(tenancyId))
      } else {
        setHasSignature(false)
        clear()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save signature'))
    } finally {
      setSaving(false)
    }
  }

  if (!tenancyId) {
    return (
      <div>
        <PageHeader title="Final Approval" description="Sign the final settlement." />
        <EmptyState
          icon={PenLine}
          title="No tenancy selected"
          description="Open settlement from your tenancy to sign."
        />
      </div>
    )
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading settlement...</p>

  const refund =
    financials?.finalRefund != null ? financials.finalRefund : financials?.projectedRefund ?? 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Final Sign-Off"
        description="Review the settlement summary and provide your digital signature."
      />

      <Card>
        <h2 className="font-bold text-ink">Final Settlement</h2>
        {data?.tenancy ? (
          <p className="mt-1 text-sm text-ink-secondary">
            {data.tenancy.propertyName} · {data.tenancy.tenantName}
          </p>
        ) : null}
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Security Deposit</dt>
            <dd className="font-semibold">{formatCurrency(financials?.securityDeposit ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Approved Deductions</dt>
            <dd className="font-semibold text-danger">
              − {formatCurrency(financials?.finalDeductionTotal ?? 0)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="font-bold text-ink">Final Refund</dt>
            <dd className="text-xl font-extrabold text-brand-700">{formatCurrency(refund)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          I confirm that I have reviewed the final property handover and settlement.
        </p>
      </Card>

      {!userSigned ? (
        <Card>
          <p className="mb-2 text-sm font-semibold text-ink">Sign here</p>
          <canvas
            ref={canvasRef}
            width={560}
            height={180}
            className="w-full touch-none rounded-xl border-2 border-dashed border-border bg-surface-muted"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={() => setDrawing(false)}
            onMouseLeave={() => setDrawing(false)}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={() => setDrawing(false)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={clear}>
              Clear
            </Button>
            <Button onClick={() => void confirm()} disabled={!hasSignature || saving}>
              {saving ? 'Saving...' : 'Confirm Signature'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ink-secondary">You have already signed this settlement.</p>
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">Tenant</span>
            <Badge tone={tenantSig || settlement?.tenantSigned ? 'success' : 'warning'}>
              {tenantSig
                ? `✓ Signed · ${formatDisplayDate(tenantSig.signedAt)}`
                : settlement?.tenantSigned
                  ? '✓ Signed'
                  : 'Pending'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">Owner</span>
            <Badge tone={ownerSig || settlement?.ownerSigned ? 'success' : 'warning'}>
              {ownerSig
                ? `✓ Signed · ${formatDisplayDate(ownerSig.signedAt)}`
                : settlement?.ownerSigned
                  ? '✓ Signed'
                  : 'Pending'}
            </Badge>
          </div>
        </div>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}

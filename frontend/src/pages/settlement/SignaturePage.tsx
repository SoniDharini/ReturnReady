import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { useAppPaths } from '@/hooks/useAppPaths'

export function SignaturePage() {
  const navigate = useNavigate()
  const paths = useAppPaths()
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [tenantSigned, setTenantSigned] = useState(false)
  const [ownerSigned, setOwnerSigned] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
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

  const confirm = () => {
    if (user?.role === 'TENANT') {
      setTenantSigned(true)
      if (ownerSigned) navigate(paths.settlementComplete)
    } else {
      setOwnerSigned(true)
      setTenantSigned(true)
      navigate(paths.settlementComplete)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Final Approval"
        description="Review the settlement summary and provide your digital signature."
      />

      <Card>
        <h2 className="font-bold text-ink">Final Settlement</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Security Deposit</dt>
            <dd className="font-semibold">{formatCurrency(50000)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Approved Deductions</dt>
            <dd className="font-semibold text-danger">− {formatCurrency(4700)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="font-bold text-ink">Final Refund</dt>
            <dd className="text-xl font-extrabold text-brand-700">{formatCurrency(45300)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          By signing, I acknowledge that I have reviewed the move-in and move-out records, proposed
          deductions, and final refund amount, and agree to this settlement.
        </p>
      </Card>

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
          <Button onClick={confirm} disabled={!hasSignature}>
            Confirm Signature
          </Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">Tenant</span>
            <Badge tone={tenantSigned ? 'success' : 'warning'}>
              {tenantSigned ? '✓ Signed · 31 May 2027' : 'Pending'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">Owner</span>
            <Badge tone={ownerSigned ? 'success' : 'warning'}>
              {ownerSigned ? '✓ Signed · 31 May 2027' : 'Pending'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}

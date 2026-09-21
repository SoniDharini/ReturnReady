import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type InvitationLinkCardProps = {
  invitationUrl: string | null
  onCopied?: () => void
}

export async function copyInvitationLink(invitationUrl: string) {
  if (!invitationUrl) {
    throw new Error('Invitation link is not available.')
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(invitationUrl)
    return
  }

  const input = document.createElement('textarea')
  input.value = invitationUrl
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(input)
  if (!copied) {
    throw new Error('Unable to copy invitation link.')
  }
}

export function InvitationLinkCard({ invitationUrl, onCopied }: InvitationLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const handleCopy = async () => {
    if (!invitationUrl) return
    setCopyError('')
    try {
      await copyInvitationLink(invitationUrl)
      setCopied(true)
      onCopied?.()
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError('Unable to copy invitation link. Select the link and copy it manually.')
    }
  }

  if (!invitationUrl) {
    return (
      <p className="text-sm text-ink-secondary">
        No active invitation link is available for this tenancy.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">Invitation Link</p>
      <div className="break-all rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink">
        {invitationUrl}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
          <Copy className="h-4 w-4" />
          {copied ? 'Copied' : 'Copy Link'}
        </Button>
        {copied ? (
          <span className="text-sm font-medium text-success">Invitation link copied.</span>
        ) : null}
      </div>
      {copyError ? <p className="text-sm text-danger">{copyError}</p> : null}
    </div>
  )
}

export function InvitationStatusBadge({
  status,
  expired,
}: {
  status: string
  expired?: boolean
}) {
  const label = expired && status === 'Pending' ? 'Expired' : status
  const tone =
    label === 'Accepted' ? 'success' : label === 'Pending' ? 'warning' : label === 'Expired' ? 'danger' : 'neutral'
  return <Badge tone={tone}>{label}</Badge>
}

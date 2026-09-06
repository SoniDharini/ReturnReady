import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PropertyChangeConversation } from '@/components/handover/PropertyChangeConversation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { getErrorMessage } from '@/services/api'
import { getPropertyChangeChat, listPendingChangeRequests } from '@/services/handover.service'
import { listTenancies } from '@/services/tenancy.service'
import type { PropertyChangeMessage, PropertyChangeRequest, Tenancy } from '@/types'

export function PropertyChangesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isOwner = user?.role === 'OWNER'
  const tenantTenancyId = user?.role === 'TENANT' ? user.tenantAccess?.tenancyId || '' : ''
  const queryTenancyId = searchParams.get('tenancyId') || ''

  const [tenancies, setTenancies] = useState<Tenancy[]>([])
  const [selectedId, setSelectedId] = useState(queryTenancyId || tenantTenancyId)
  const [propertyName, setPropertyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [messages, setMessages] = useState<PropertyChangeMessage[]>([])
  const [requests, setRequests] = useState<PropertyChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canRequest =
    !isOwner &&
    Boolean(selectedId) &&
    ['active', 'move-out', 'settlement'].includes(user?.tenantAccess?.stage || '')

  const loadChat = async (tenancyId: string, silent = false) => {
    if (!tenancyId) return
    if (!silent) setLoading(true)
    setError('')
    try {
      const data = await getPropertyChangeChat(tenancyId)
      setPropertyName(data.tenancy.propertyName)
      setOwnerName(data.tenancy.ownerName)
      setTenantName(data.tenancy.tenantName)
      setRooms(data.rooms)
      setMessages(data.messages)
      setRequests(data.requests)
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, 'Unable to load conversation'))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (isOwner) {
        try {
          const [list, pending] = await Promise.all([
            listTenancies(),
            listPendingChangeRequests().catch(() => [] as PropertyChangeRequest[]),
          ])
          const active = list.filter((t) => t.inviteStatus === 'Accepted' && t.stage !== 'complete')
          if (cancelled) return
          setTenancies(active)
          const nextId =
            queryTenancyId ||
            pending[0]?.tenancyId ||
            (active.length === 1 ? active[0].id : '')
          setSelectedId(nextId)
          if (nextId) await loadChat(nextId)
          else setLoading(false)
        } catch (err) {
          if (!cancelled) {
            setError(getErrorMessage(err, 'Unable to load property changes'))
            setLoading(false)
          }
        }
      } else if (tenantTenancyId) {
        setSelectedId(tenantTenancyId)
        await loadChat(tenantTenancyId)
      } else {
        setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [isOwner, tenantTenancyId, queryTenancyId])

  useEffect(() => {
    if (!selectedId) return
    const timer = window.setInterval(() => {
      void loadChat(selectedId, true)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [selectedId])

  const openTenancy = (id: string) => {
    setSelectedId(id)
    if (isOwner) setSearchParams({ tenancyId: id })
    void loadChat(id)
  }

  if (loading) return <p className="text-sm text-ink-secondary">Loading conversation...</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Changes"
        description="Talk with the other party. Formal approval is still required before any change is authorized."
      />

      {isOwner && tenancies.length > 1 && !selectedId ? (
        <div className="space-y-3">
          {tenancies.map((tenancy) => (
            <Card key={tenancy.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{tenancy.propertyName}</p>
                <p className="text-sm text-ink-secondary">Tenant: {tenancy.tenantName}</p>
              </div>
              <Button onClick={() => openTenancy(tenancy.id)}>Open conversation</Button>
            </Card>
          ))}
        </div>
      ) : null}

      {isOwner && tenancies.length > 1 && selectedId ? (
        <div className="flex flex-wrap gap-2">
          {tenancies.map((tenancy) => (
            <Button
              key={tenancy.id}
              size="sm"
              variant={tenancy.id === selectedId ? 'primary' : 'secondary'}
              onClick={() => openTenancy(tenancy.id)}
            >
              {tenancy.propertyName}
            </Button>
          ))}
        </div>
      ) : null}

      {!selectedId ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            {isOwner
              ? 'Select a tenancy to open the property change conversation.'
              : 'Property change chat is available after your invitation is accepted.'}
          </p>
        </Card>
      ) : (
        <PropertyChangeConversation
          tenancyId={selectedId}
          propertyName={propertyName}
          ownerName={ownerName}
          tenantName={tenantName}
          rooms={rooms}
          messages={messages}
          requests={requests}
          isOwner={isOwner}
          canRequest={canRequest}
          currentUserId={user?.id}
          onRefresh={() => loadChat(selectedId, true)}
        />
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {isOwner && selectedId ? (
        <button
          type="button"
          className="text-sm font-semibold text-brand-700"
          onClick={() => {
            setSelectedId('')
            setSearchParams({})
          }}
        >
          Back to tenancy list
        </button>
      ) : null}
    </div>
  )
}

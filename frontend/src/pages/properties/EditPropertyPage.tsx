import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PropertyWizard } from '@/components/properties/PropertyWizard'
import { useAppPaths } from '@/hooks/useAppPaths'
import { getErrorMessage } from '@/services/api'
import { getProperty } from '@/services/property.service'
import type { Property } from '@/types'

export function EditPropertyPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [property, setProperty] = useState<Property | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getProperty(id)
        if (!cancelled) setProperty(data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load property'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) void load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="text-sm text-ink-secondary">Loading property...</p>
  if (error || !property) {
    return <p className="text-sm text-danger">{error || 'Property not found'}</p>
  }

  return (
    <PropertyWizard
      mode="edit"
      initial={property}
      onCancel={() => navigate(paths.property(property.id))}
      onSuccess={(updated) => navigate(paths.property(updated.id))}
    />
  )
}

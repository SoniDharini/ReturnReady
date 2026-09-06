import type { Property, PropertyAvailability } from '@/types'

export function getAvailabilityLabel(availability?: PropertyAvailability) {
  switch (availability) {
    case 'OCCUPIED':
      return 'Occupied'
    case 'MOVE_OUT_IN_PROGRESS':
      return 'Move-Out in Progress'
    case 'SETTLEMENT_PENDING':
      return 'Settlement Pending'
    case 'AVAILABLE':
    default:
      return 'Available'
  }
}

export function getPropertyOccupancyDescription(property: Property) {
  if (property.canAssignTenant !== false && property.availability === 'AVAILABLE') {
    return 'No active tenant'
  }
  if (property.activeTenantName) {
    return `Occupied by ${property.activeTenantName}`
  }
  if (property.activeTenancy) {
    return `Occupied by ${property.activeTenancy}`
  }
  return getAvailabilityLabel(property.availability)
}

export function isPropertyAvailable(property: Property) {
  if (property.canAssignTenant === false) return false
  if (
    property.availability === 'OCCUPIED' ||
    property.availability === 'MOVE_OUT_IN_PROGRESS' ||
    property.availability === 'SETTLEMENT_PENDING'
  ) {
    return false
  }
  if (property.availability === 'AVAILABLE') return true
  return !property.activeTenancy && !property.activeTenantName
}

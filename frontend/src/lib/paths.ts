import type { UserRole } from '@/types'

export function roleHome(role: UserRole) {
  return role === 'OWNER' ? '/owner/dashboard' : '/tenant/dashboard'
}

export function roleBase(role: UserRole) {
  return role === 'OWNER' ? '/owner' : '/tenant'
}

export function appPaths(role: UserRole) {
  const base = roleBase(role)
  return {
    base,
    dashboard: `${base}/dashboard`,
    properties: '/owner/properties',
    propertyNew: '/owner/properties/new',
    property: (id: string) => `/owner/properties/${id}`,
    propertyEdit: (id: string) => `/owner/properties/${id}/edit`,
    tenancies: '/owner/tenancies',
    tenancyNew: '/owner/tenancies/new',
    tenancy: (id: string) => `/owner/tenancies/${id}`,
    rental: '/tenant/rental',
    inspections: `${base}/inspections`,
    inspectionMoveIn: `${base}/inspections/move-in`,
    inspectionWizard: `${base}/inspections/wizard`,
    inspectionMoveOut: `${base}/inspections/move-out`,
    inspectionReview: `${base}/inspections/review`,
    inspectionApproval: `${base}/inspections/approval`,
    comparison: `${base}/inspections/comparison`,
    settlement: `${base}/settlement`,
    settlementSign: `${base}/settlement/sign`,
    settlementComplete: `${base}/settlement/complete`,
    reports: `${base}/reports`,
    settings: `${base}/settings`,
    help: `${base}/help`,
    onboarding: '/owner/onboarding',
  }
}

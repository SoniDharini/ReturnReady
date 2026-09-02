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
    inspectionMoveIn: (tenancyId?: string) =>
      `${base}/inspections/move-in${tenancyId ? `?tenancyId=${tenancyId}` : ''}`,
    inspectionWizard: (inspectionId: string) =>
      `${base}/inspections/wizard?inspectionId=${inspectionId}`,
    inspectionMoveOut: `${base}/inspections/move-out`,
    inspectionReview: (inspectionId: string) =>
      `${base}/inspections/review?inspectionId=${inspectionId}`,
    inspectionApproval: (inspectionId?: string) =>
      `${base}/inspections/approval${inspectionId ? `?inspectionId=${inspectionId}` : ''}`,
    comparison: (tenancyId?: string) =>
      `${base}/inspections/comparison${tenancyId ? `?tenancyId=${tenancyId}` : ''}`,
    settlement: (tenancyId?: string) =>
      `${base}/settlement${tenancyId ? `?tenancyId=${tenancyId}` : ''}`,
    settlementSign: (tenancyId?: string) =>
      `${base}/settlement/sign${tenancyId ? `?tenancyId=${tenancyId}` : ''}`,
    settlementComplete: (tenancyId?: string) =>
      `${base}/settlement/complete${tenancyId ? `?tenancyId=${tenancyId}` : ''}`,
    reports: `${base}/reports`,
    settings: `${base}/settings`,
    help: `${base}/help`,
    onboarding: '/owner/onboarding',
  }
}

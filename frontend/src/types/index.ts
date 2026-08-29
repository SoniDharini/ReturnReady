export type RoomType =
  | 'BEDROOM'
  | 'BATHROOM'
  | 'LIVING_ROOM'
  | 'KITCHEN'
  | 'BALCONY'
  | 'DINING_ROOM'
  | 'CUSTOM'

export type PropertyRoom = {
  id?: string
  key?: string
  name: string
  type: RoomType
  isCustom: boolean
  items: Array<{
    id?: string
    name: string
    quantity: number
    description?: string
  }>
}

export type PropertyImage = {
  id?: string
  imageUrl: string
  caption?: string
  uploadedBy?: string
  uploadedAt?: string
}

export type UserRole = 'OWNER' | 'TENANT'

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  accountStatus: string
  /** Derived: owner with zero properties */
  isNewOwner?: boolean
  tenantAccess?: {
    status: 'INVITED' | 'ACTIVE' | 'CLOSED' | 'REVOKED'
    tenancyId: string
    inviteId: string
    propertyName: string
    ownerName: string
    moveIn: string
    moveOut: string
    deposit: number
  }
}

export type Property = {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  pin: string
  rooms: number
  bathrooms: number
  status: string
  activeTenancy: string | null
  roomList?: PropertyRoom[]
  images?: PropertyImage[]
}

export type Tenancy = {
  id: string
  propertyId: string
  propertyName: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  ownerName: string
  moveIn: string
  moveOut: string
  rent: number
  deposit: number
  status: string
  inviteStatus: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled'
  inviteSentAt: string
  inviteToken: string
  stage: 'invitation' | 'move-in' | 'active' | 'move-out' | 'settlement' | 'complete'
}

export type Invitation = {
  token: string
  status: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled'
  ownerName: string
  ownerEmail: string
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  propertyName: string
  moveIn: string
  moveOut: string
  deposit: number
  tenancyId: string
}

import type { Condition } from '@/components/shared/ConditionSelector'
import type { PhotoEvidence } from '@/components/shared/EvidenceUpload'

export type UserRole = 'owner' | 'tenant'

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
  activeTenancy: string | null
  status: string
}

export type InventoryItem = {
  id: string
  name: string
  quantity: number
  description: string
}

export type Room = {
  id: string
  name: string
  items: InventoryItem[]
  inspectionStatus: 'completed' | 'in_progress' | 'not_started'
}

export type Tenancy = {
  id: string
  propertyId: string
  propertyName: string
  tenantName: string
  tenantEmail: string
  ownerName: string
  moveIn: string
  moveOut: string
  rent: number
  deposit: number
  status: string
  moveInInspection: 'completed' | 'in_progress' | 'not_started' | 'awaiting_approval'
  moveOutInspection: 'completed' | 'in_progress' | 'not_started' | 'awaiting_approval'
  stage: 'invitation' | 'move-in' | 'active' | 'move-out' | 'settlement' | 'complete'
}

export type Deduction = {
  id: string
  item: string
  amount: number
  reason: string
  status: 'Pending Tenant Review' | 'Accepted' | 'Disputed' | 'Under Review'
}

export type ComparisonItem = {
  id: string
  name: string
  room: string
  status: 'No Change' | 'Changed' | 'New Damage' | 'Missing' | 'Needs Review'
  moveIn: { condition: Condition; notes: string; date: string }
  moveOut: { condition: Condition; notes: string; date: string }
}

export type NotificationItem = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
}

export type Report = {
  id: string
  property: string
  party: string
  period: string
  completedDate: string
  status: string
}

export const DEMO_OWNER = {
  name: 'Rahul Patel',
  email: 'rahul@example.com',
  role: 'owner' as UserRole,
}

export const DEMO_TENANT = {
  name: 'Aaditya Shah',
  email: 'aaditya@example.com',
  role: 'tenant' as UserRole,
}

export const properties: Property[] = [
  {
    id: 'p1',
    name: 'Green Residency — B-204',
    type: 'Apartment',
    address: 'Satellite Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pin: '380015',
    rooms: 7,
    bathrooms: 2,
    activeTenancy: 'Aaditya Shah',
    status: 'Active',
  },
  {
    id: 'p2',
    name: 'Lakeview Heights — 12A',
    type: 'Apartment',
    address: 'Prahlad Nagar',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pin: '380015',
    rooms: 5,
    bathrooms: 2,
    activeTenancy: 'Meera Joshi',
    status: 'Active',
  },
  {
    id: 'p3',
    name: 'Palm Grove Villa',
    type: 'Villa',
    address: 'Bopal',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pin: '380058',
    rooms: 9,
    bathrooms: 3,
    activeTenancy: null,
    status: 'Draft',
  },
  {
    id: 'p4',
    name: 'Orchid Square — 501',
    type: 'Apartment',
    address: 'CG Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pin: '380009',
    rooms: 4,
    bathrooms: 1,
    activeTenancy: 'Kiran Desai',
    status: 'Active',
  },
]

export const rooms: Room[] = [
  {
    id: 'r1',
    name: 'Living Room',
    inspectionStatus: 'completed',
    items: [
      { id: 'i1', name: 'Sofa', quantity: 1, description: '3-seater fabric sofa' },
      { id: 'i2', name: 'Television', quantity: 1, description: '43-inch LED' },
      { id: 'i3', name: 'Ceiling Fan', quantity: 1, description: 'White finish' },
      { id: 'i4', name: 'Coffee Table', quantity: 1, description: 'Wooden' },
      { id: 'i5', name: 'Curtains', quantity: 2, description: 'Living room windows' },
    ],
  },
  {
    id: 'r2',
    name: 'Bedroom 1',
    inspectionStatus: 'completed',
    items: [
      { id: 'i6', name: 'Double Bed', quantity: 1, description: 'With mattress' },
      { id: 'i7', name: 'Wardrobe', quantity: 1, description: '3-door' },
      { id: 'i8', name: 'Bedside Table', quantity: 2, description: 'Matching set' },
    ],
  },
  {
    id: 'r3',
    name: 'Bedroom 2',
    inspectionStatus: 'in_progress',
    items: [
      { id: 'i9', name: 'Single Bed', quantity: 1, description: 'With mattress' },
      { id: 'i10', name: 'Study Table', quantity: 1, description: 'With chair' },
      { id: 'i11', name: 'Ceiling Fan', quantity: 1, description: 'White finish' },
    ],
  },
  {
    id: 'r4',
    name: 'Kitchen',
    inspectionStatus: 'not_started',
    items: [
      { id: 'i12', name: 'Refrigerator', quantity: 1, description: 'Double door' },
      { id: 'i13', name: 'Gas Stove', quantity: 1, description: '4 burner' },
      { id: 'i14', name: 'Microwave', quantity: 1, description: '20L' },
    ],
  },
  {
    id: 'r5',
    name: 'Bathroom',
    inspectionStatus: 'not_started',
    items: [
      { id: 'i15', name: 'Mirror Cabinet', quantity: 1, description: 'Wall mounted' },
      { id: 'i16', name: 'Shower Fixture', quantity: 1, description: 'Chrome' },
    ],
  },
  {
    id: 'r6',
    name: 'Balcony',
    inspectionStatus: 'not_started',
    items: [{ id: 'i17', name: 'Clothes Dryer', quantity: 1, description: 'Foldable' }],
  },
  {
    id: 'r7',
    name: 'Entrance',
    inspectionStatus: 'not_started',
    items: [{ id: 'i18', name: 'Shoe Rack', quantity: 1, description: 'Wooden' }],
  },
]

export const tenancies: Tenancy[] = [
  {
    id: 't1',
    propertyId: 'p1',
    propertyName: 'Green Residency — B-204',
    tenantName: 'Aaditya Shah',
    tenantEmail: 'aaditya@example.com',
    ownerName: 'Rahul Patel',
    moveIn: '01 Jun 2026',
    moveOut: '31 May 2027',
    rent: 28000,
    deposit: 50000,
    status: 'Active',
    moveInInspection: 'completed',
    moveOutInspection: 'not_started',
    stage: 'active',
  },
  {
    id: 't2',
    propertyId: 'p2',
    propertyName: 'Lakeview Heights — 12A',
    tenantName: 'Meera Joshi',
    tenantEmail: 'meera@example.com',
    ownerName: 'Rahul Patel',
    moveIn: '15 Mar 2026',
    moveOut: '14 Mar 2027',
    rent: 32000,
    deposit: 64000,
    status: 'Inspection Pending',
    moveInInspection: 'awaiting_approval',
    moveOutInspection: 'not_started',
    stage: 'move-in',
  },
  {
    id: 't3',
    propertyId: 'p4',
    propertyName: 'Orchid Square — 501',
    tenantName: 'Kiran Desai',
    tenantEmail: 'kiran@example.com',
    ownerName: 'Rahul Patel',
    moveIn: '01 Jan 2025',
    moveOut: '31 Dec 2025',
    rent: 22000,
    deposit: 44000,
    status: 'Settlement Pending',
    moveInInspection: 'completed',
    moveOutInspection: 'completed',
    stage: 'settlement',
  },
]

export const samplePhotos: PhotoEvidence[] = [
  {
    id: 'ph1',
    name: 'sofa-front.jpg',
    uploadedAt: 'Today, 10:24 AM',
    uploadedBy: 'Rahul Patel',
  },
  {
    id: 'ph2',
    name: 'sofa-cushion.jpg',
    uploadedAt: 'Today, 10:25 AM',
    uploadedBy: 'Rahul Patel',
  },
]

export const comparisonItems: ComparisonItem[] = [
  {
    id: 'c1',
    name: 'Sofa',
    room: 'Living Room',
    status: 'New Damage',
    moveIn: {
      condition: 'Good',
      notes: 'Small stain on the left cushion.',
      date: '01 Jun 2026',
    },
    moveOut: {
      condition: 'Damaged',
      notes: 'Large tear on right cushion.',
      date: '31 May 2027',
    },
  },
  {
    id: 'c2',
    name: 'Ceiling Fan',
    room: 'Living Room',
    status: 'No Change',
    moveIn: { condition: 'Good', notes: '', date: '01 Jun 2026' },
    moveOut: { condition: 'Good', notes: '', date: '31 May 2027' },
  },
  {
    id: 'c3',
    name: 'Television',
    room: 'Living Room',
    status: 'No Change',
    moveIn: { condition: 'Excellent', notes: '', date: '01 Jun 2026' },
    moveOut: { condition: 'Excellent', notes: '', date: '31 May 2027' },
  },
  {
    id: 'c4',
    name: 'Mailbox Key',
    room: 'Access',
    status: 'Missing',
    moveIn: { condition: 'Good', notes: '1 key provided', date: '01 Jun 2026' },
    moveOut: { condition: 'Missing', notes: 'Key not returned', date: '31 May 2027' },
  },
  {
    id: 'c5',
    name: 'Refrigerator',
    room: 'Kitchen',
    status: 'Needs Review',
    moveIn: { condition: 'Good', notes: '', date: '01 Jun 2026' },
    moveOut: { condition: 'Fair', notes: 'Dent on lower door', date: '31 May 2027' },
  },
]

export const deductions: Deduction[] = [
  {
    id: 'd1',
    item: 'Sofa Repair',
    amount: 3000,
    reason: 'Large tear discovered during move-out inspection.',
    status: 'Pending Tenant Review',
  },
  {
    id: 'd2',
    item: 'Missing Key',
    amount: 500,
    reason: 'Mailbox key not returned at handover.',
    status: 'Accepted',
  },
  {
    id: 'd3',
    item: 'Cleaning',
    amount: 1200,
    reason: 'Deep cleaning required after move-out.',
    status: 'Accepted',
  },
]

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Move-Out Inspection Submitted',
    body: 'Aaditya submitted the move-out inspection for Green Residency.',
    time: '5 min ago',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Settlement Signed',
    body: 'Tenant approved the final settlement.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'n3',
    title: 'Inspection Approval Needed',
    body: 'Meera Joshi is waiting for your move-in approval.',
    time: '2 days ago',
    unread: true,
  },
]

export const reports: Report[] = [
  {
    id: 'rp1',
    property: 'Sunrise Apartments — 3B',
    party: 'Priya Mehta',
    period: 'Jun 2024 – May 2025',
    completedDate: '01 Jun 2025',
    status: 'Completed',
  },
]

export const accessItems = [
  { id: 'a1', name: 'Main Door Key', quantity: 2 },
  { id: 'a2', name: 'Mailbox Key', quantity: 1 },
  { id: 'a3', name: 'Parking Remote', quantity: 1 },
]

export const meters = [
  { id: 'm1', name: 'Electricity', reading: '12,450', unit: 'kWh' },
  { id: 'm2', name: 'Water', reading: '2,140', unit: 'units' },
]

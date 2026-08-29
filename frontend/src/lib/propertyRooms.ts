import type { PropertyRoom, RoomType } from '@/types'

export const ROOM_MAX = 20

export const STANDARD_ROOM_DEFS: Array<{
  type: Exclude<RoomType, 'CUSTOM'>
  label: string
  singular: string
}> = [
  { type: 'BEDROOM', label: 'Bedrooms', singular: 'Bedroom' },
  { type: 'BATHROOM', label: 'Bathrooms', singular: 'Bathroom' },
  { type: 'LIVING_ROOM', label: 'Living Rooms', singular: 'Living Room' },
  { type: 'KITCHEN', label: 'Kitchen', singular: 'Kitchen' },
  { type: 'BALCONY', label: 'Balcony', singular: 'Balcony' },
  { type: 'DINING_ROOM', label: 'Dining Room', singular: 'Dining Room' },
]

let roomKeyCounter = 0

export function createRoomKey() {
  roomKeyCounter += 1
  return `room-${Date.now()}-${roomKeyCounter}`
}

export function formatRoomName(singular: string, index: number, total: number) {
  if (total <= 1) return singular
  return `${singular} ${index + 1}`
}

export function countRoomsByType(rooms: PropertyRoom[], type: RoomType) {
  return rooms.filter((room) => room.type === type).length
}

export function makeRoom(
  type: RoomType,
  name: string,
  isCustom = type === 'CUSTOM',
): PropertyRoom {
  return {
    key: createRoomKey(),
    type,
    name,
    isCustom,
    items: [],
  }
}

function isAutoNamed(name: string, singular: string) {
  if (name === singular) return true
  return new RegExp(`^${singular.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+$`).test(name)
}

export function planQuantityChange(
  rooms: PropertyRoom[],
  type: Exclude<RoomType, 'CUSTOM'>,
  nextCount: number,
  singular: string,
): { nextRooms: PropertyRoom[]; removed: PropertyRoom[] } {
  const clamped = Math.max(0, Math.min(ROOM_MAX, nextCount))
  const ofType = rooms.filter((room) => room.type === type)
  const others = rooms.filter((room) => room.type !== type)

  if (clamped === ofType.length) {
    return { nextRooms: rooms, removed: [] }
  }

  if (clamped > ofType.length) {
    const added: PropertyRoom[] = []
    for (let i = ofType.length; i < clamped; i += 1) {
      added.push(makeRoom(type, formatRoomName(singular, i, clamped), false))
    }
    const updatedExisting = ofType.map((room, index) => {
      if (isAutoNamed(room.name, singular)) {
        return { ...room, name: formatRoomName(singular, index, clamped) }
      }
      return room
    })
    return {
      nextRooms: [...others, ...updatedExisting, ...added],
      removed: [],
    }
  }

  const keep = ofType.slice(0, clamped)
  const removed = ofType.slice(clamped)
  const renamed = keep.map((room, index) => {
    if (isAutoNamed(room.name, singular)) {
      return { ...room, name: formatRoomName(singular, index, clamped) }
    }
    return room
  })

  return {
    nextRooms: [...others, ...renamed],
    removed,
  }
}

export function applyQuantityChange(
  rooms: PropertyRoom[],
  type: Exclude<RoomType, 'CUSTOM'>,
  nextCount: number,
  singular: string,
) {
  return planQuantityChange(rooms, type, nextCount, singular).nextRooms
}

export function addCustomRooms(rooms: PropertyRoom[], baseName: string, quantity: number) {
  const name = baseName.trim()
  if (!name) return rooms
  const count = Math.max(1, Math.min(ROOM_MAX, quantity))
  const added: PropertyRoom[] = []
  for (let i = 0; i < count; i += 1) {
    added.push(makeRoom('CUSTOM', formatRoomName(name, i, count), true))
  }
  return [...rooms, ...added]
}

export function summarizeLayout(rooms: PropertyRoom[]) {
  const lines: string[] = []
  for (const def of STANDARD_ROOM_DEFS) {
    const count = countRoomsByType(rooms, def.type)
    if (count > 0) {
      lines.push(`${count} ${count === 1 ? def.singular : def.label}`)
    }
  }
  const custom = rooms.filter((room) => room.type === 'CUSTOM')
  if (custom.length > 0) {
    lines.push(`${custom.length} Custom Room${custom.length === 1 ? '' : 's'}`)
  }
  return lines
}

export function groupRooms(rooms: PropertyRoom[]) {
  return {
    bedrooms: rooms.filter((r) => r.type === 'BEDROOM'),
    bathrooms: rooms.filter((r) => r.type === 'BATHROOM'),
    other: rooms.filter((r) => r.type !== 'BEDROOM' && r.type !== 'BATHROOM'),
  }
}

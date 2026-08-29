import { AccessItem } from '../models/AccessItem.js';
import { Inspection } from '../models/Inspection.js';
import { InspectionEvidence } from '../models/InspectionEvidence.js';
import { InspectionItem } from '../models/InspectionItem.js';
import { MeterReading } from '../models/MeterReading.js';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';

const CONDITION_SCORES = {
  EXCELLENT: 5,
  GOOD: 4,
  FAIR: 3,
  DAMAGED: 2,
  MISSING: 0,
};

function itemKey(item) {
  const inv = item.inventoryItemId?.toString?.() || item.inventoryItemId || 'room';
  return `${item.roomId?.toString?.() || item.roomId}:${item.itemType}:${inv}`;
}

export function compareConditions(moveInCondition, moveOutCondition) {
  if (!moveInCondition || !moveOutCondition) return 'NEEDS_REVIEW';
  if (moveInCondition === moveOutCondition) return 'NO_CHANGE';

  if (moveOutCondition === 'MISSING') return 'MISSING';

  const inScore = CONDITION_SCORES[moveInCondition] ?? 0;
  const outScore = CONDITION_SCORES[moveOutCondition] ?? 0;

  if (outScore > inScore) return 'IMPROVED';
  if (outScore < inScore) {
    if (moveOutCondition === 'DAMAGED' && inScore >= CONDITION_SCORES.GOOD) {
      return 'NEW_DAMAGE';
    }
    return 'DETERIORATED';
  }
  return 'NEEDS_REVIEW';
}

async function loadInspectionBundle(inspectionId) {
  const items = await InspectionItem.find({ inspectionId }).sort({ createdAt: 1 });
  const evidence = await InspectionEvidence.find({ inspectionId });
  const meters = await MeterReading.find({ inspectionId });
  const accessItems = await AccessItem.find({ inspectionId });
  return {
    items: items.map((i) => i.toJSON()),
    evidence: evidence.map((e) => e.toJSON()),
    meters: meters.map((m) => m.toJSON()),
    accessItems: accessItems.map((a) => a.toJSON()),
  };
}

export async function getTenancyComparison(user, tenancyId) {
  const tenancy =
    user.role === 'OWNER'
      ? await Tenancy.findOne({ _id: tenancyId, ownerId: user.id })
      : await Tenancy.findOne({
          _id: tenancyId,
          tenantUserId: user.id,
          inviteStatus: 'Accepted',
        });

  if (!tenancy) throw new ApiError(404, 'Tenancy not found');

  const moveIn = await Inspection.findOne({ tenancyId, type: 'MOVE_IN', status: 'LOCKED' });
  const moveOut = await Inspection.findOne({
    tenancyId,
    type: 'MOVE_OUT',
    status: { $in: ['COMPLETED', 'APPROVAL_PENDING', 'SUBMITTED'] },
  });

  if (!moveIn) {
    throw new ApiError(400, 'Locked move-in inspection is required before comparison');
  }
  if (!moveOut) {
    throw new ApiError(400, 'Completed move-out inspection is required before comparison');
  }

  const moveInBundle = await loadInspectionBundle(moveIn._id);
  const moveOutBundle = await loadInspectionBundle(moveOut._id);

  const moveInMap = new Map(moveInBundle.items.map((item) => [itemKey(item), item]));
  const moveOutMap = new Map(moveOutBundle.items.map((item) => [itemKey(item), item]));

  const allKeys = new Set([...moveInMap.keys(), ...moveOutMap.keys()]);
  const itemComparisons = [];

  for (const key of allKeys) {
    const moveInItem = moveInMap.get(key);
    const moveOutItem = moveOutMap.get(key);
    const result = compareConditions(moveInItem?.condition, moveOutItem?.condition);

    const moveInEvidence = moveInItem
      ? moveInBundle.evidence.filter((e) => e.inspectionItemId === moveInItem.id)
      : [];
    const moveOutEvidence = moveOutItem
      ? moveOutBundle.evidence.filter((e) => e.inspectionItemId === moveOutItem.id)
      : [];

    itemComparisons.push({
      key,
      roomId: moveOutItem?.roomId || moveInItem?.roomId,
      roomName: moveOutItem?.roomName || moveInItem?.roomName,
      itemName: moveOutItem?.itemName || moveInItem?.itemName,
      inventoryItemId: moveOutItem?.inventoryItemId || moveInItem?.inventoryItemId,
      moveInItemId: moveInItem?.id || null,
      moveOutItemId: moveOutItem?.id || null,
      moveInCondition: moveInItem?.condition || null,
      moveOutCondition: moveOutItem?.condition || null,
      moveInNotes: moveInItem?.notes || '',
      moveOutNotes: moveOutItem?.notes || '',
      moveInIssue: moveInItem?.issueDescription || '',
      moveOutIssue: moveOutItem?.issueDescription || '',
      moveInEvidence,
      moveOutEvidence,
      result,
    });
  }

  const accessComparisons = [];
  const moveInAccess = new Map(moveInBundle.accessItems.map((a) => [a.name, a]));
  const moveOutAccess = new Map(moveOutBundle.accessItems.map((a) => [a.name, a]));
  const accessNames = new Set([...moveInAccess.keys(), ...moveOutAccess.keys()]);

  for (const name of accessNames) {
    const inQty = moveInAccess.get(name)?.quantity || 0;
    const outQty = moveOutAccess.get(name)?.quantity || 0;
    const diff = outQty - inQty;
    accessComparisons.push({
      name,
      moveInQuantity: inQty,
      moveOutQuantity: outQty,
      difference: diff,
      result: diff < 0 ? 'MISSING_ACCESS_ITEM' : diff === 0 ? 'NO_CHANGE' : 'NEEDS_REVIEW',
    });
  }

  const meterComparisons = [];
  const moveInMeters = new Map(
    moveInBundle.meters.map((m) => [m.type === 'OTHER' ? m.customTypeName : m.type, m]),
  );
  const moveOutMeters = new Map(
    moveOutBundle.meters.map((m) => [m.type === 'OTHER' ? m.customTypeName : m.type, m]),
  );
  const meterKeys = new Set([...moveInMeters.keys(), ...moveOutMeters.keys()]);

  for (const meterKey of meterKeys) {
    const inMeter = moveInMeters.get(meterKey);
    const outMeter = moveOutMeters.get(meterKey);
    const inReading = parseFloat(inMeter?.reading || '0');
    const outReading = parseFloat(outMeter?.reading || '0');
    const usage = Number.isFinite(outReading - inReading) ? outReading - inReading : null;

    meterComparisons.push({
      label: meterKey,
      moveInReading: inMeter?.reading || null,
      moveOutReading: outMeter?.reading || null,
      unit: outMeter?.unit || inMeter?.unit || '',
      usage,
      moveInImageUrl: inMeter?.imageUrl || '',
      moveOutImageUrl: outMeter?.imageUrl || '',
    });
  }

  const summary = {
    totalItems: itemComparisons.length,
    unchanged: itemComparisons.filter((i) => i.result === 'NO_CHANGE').length,
    improved: itemComparisons.filter((i) => i.result === 'IMPROVED').length,
    changed: itemComparisons.filter(
      (i) => !['NO_CHANGE', 'IMPROVED'].includes(i.result),
    ).length,
    damaged: itemComparisons.filter((i) =>
      ['NEW_DAMAGE', 'DETERIORATED'].includes(i.result),
    ).length,
    missing: itemComparisons.filter((i) => i.result === 'MISSING').length,
    needsReview: itemComparisons.filter((i) => i.result === 'NEEDS_REVIEW').length,
  };

  const roomsMap = new Map();
  for (const item of itemComparisons) {
    const roomKey = item.roomId?.toString?.() || item.roomId || 'unknown';
    if (!roomsMap.has(roomKey)) {
      roomsMap.set(roomKey, {
        roomId: roomKey,
        roomName: item.roomName || 'Room',
        items: [],
      });
    }
    roomsMap.get(roomKey).items.push(item);
  }

  return {
    tenancy: {
      id: tenancy._id.toString(),
      propertyName: tenancy.propertyName,
      tenantName: tenancy.tenantName,
      deposit: tenancy.deposit,
      moveOut: tenancy.moveOut,
    },
    moveInInspectionId: moveIn._id.toString(),
    moveOutInspectionId: moveOut._id.toString(),
    summary,
    items: itemComparisons,
    rooms: Array.from(roomsMap.values()),
    accessComparisons,
    meterComparisons,
  };
}

import { Inspection } from '../models/Inspection.js';
import { PropertyChangeRequest } from '../models/PropertyChangeRequest.js';
import { TenancyCondition } from '../models/TenancyCondition.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenancyComparison } from './comparison.service.js';
import { getInspectionDetail } from './inspection.service.js';
import { attachTenancyTimeline } from './tenancyDate.service.js';
import { getTenancyForUser } from './settlementHelpers.js';

function isReviewed(status) {
  return Boolean(status) && status !== 'NEEDS_REVIEW';
}

export async function buildMoveOutContext(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const [conditions, changeRequests, moveIn, moveOut] = await Promise.all([
    TenancyCondition.find({ tenancyId: tenancy._id }).sort({ sortOrder: 1, createdAt: 1 }),
    PropertyChangeRequest.find({ tenancyId: tenancy._id }).sort({ createdAt: -1 }),
    Inspection.findOne({ tenancyId: tenancy._id, type: 'MOVE_IN', status: 'LOCKED' }),
    Inspection.findOne({ tenancyId: tenancy._id, type: 'MOVE_OUT' }),
  ]);

  const approvedChanges = changeRequests.filter((r) =>
    ['AUTHORIZED', 'APPROVED', 'COMPLETED'].includes(r.status),
  );
  const rejectedChanges = changeRequests.filter((r) => r.status === 'REJECTED');

  const conditionsJson = conditions.map((c) => c.toJSON());
  const approvedJson = approvedChanges.map((c) => c.toJSON());
  const rejectedJson = rejectedChanges.map((c) => c.toJSON());

  let moveInDetail = null;
  let moveOutDetail = null;
  if (moveIn) {
    moveInDetail = await getInspectionDetail(user, moveIn._id.toString());
  }
  if (moveOut) {
    moveOutDetail = await getInspectionDetail(user, moveOut._id.toString());
  }

  let comparison = null;
  if (moveOut?.status === 'COMPLETED') {
    try {
      comparison = await getTenancyComparison(user, tenancyId);
    } catch {
      comparison = null;
    }
  }

  const conditionsReviewed = conditionsJson.filter((c) => isReviewed(c.complianceStatus)).length;
  const changesReviewed = approvedJson.filter((c) => isReviewed(c.complianceStatus)).length;

  const readiness = {
    hasLockedMoveIn: Boolean(moveIn),
    hasMoveOutInspection: Boolean(moveOut),
    moveOutStatus: moveOut?.status || null,
    handoverConditionsCount: conditionsJson.length,
    conditionsReviewed,
    conditionsComplete:
      conditionsJson.length === 0 || conditionsReviewed === conditionsJson.length,
    approvedChangesCount: approvedJson.length,
    approvedChangesReviewed: changesReviewed,
    approvedChangesComplete:
      approvedJson.length === 0 || changesReviewed === approvedJson.length,
    simplePath: conditionsJson.length === 0 && approvedJson.length === 0,
    roomsInspected: moveOutDetail
      ? moveOutDetail.rooms.filter((room) =>
          room.items.length > 0 && room.items.every((item) => item.isCompleted),
        ).length
      : 0,
    roomsTotal: moveOutDetail?.rooms.length || 0,
    inventoryCompleted: moveOutDetail?.progress?.completedItems || 0,
    inventoryTotal: moveOutDetail?.progress?.totalItems || 0,
    meterCount: moveOutDetail?.progress?.meterCount || 0,
    accessItemCount: moveOutDetail?.accessItems?.length || 0,
  };

  return {
    tenancy: await attachTenancyTimeline(tenancy),
    lockedMoveIn: moveInDetail,
    moveOutInspection: moveOutDetail,
    handoverConditions: conditionsJson,
    approvedPropertyChanges: approvedJson,
    rejectedPropertyChanges: rejectedJson,
    comparison,
    readiness,
  };
}

export async function requireMoveOutContext(user, tenancyId) {
  const context = await buildMoveOutContext(user, tenancyId);
  if (!context.readiness.hasLockedMoveIn) {
    throw new ApiError(400, 'Locked Move-In inspection is required before Move-Out');
  }
  return context;
}

import mongoose from 'mongoose';
import { Tenancy } from '../models/Tenancy.js';
import { ApiError } from '../utils/ApiError.js';

/** Tenancy states that reserve a property from new assignments */
export const ACTIVE_TENANCY_QUERY = {
  status: { $in: ['Invitation Sent', 'Active', 'Settlement Pending'] },
  inviteStatus: { $in: ['Pending', 'Accepted'] },
  stage: { $nin: ['complete'] },
};

export function deriveAvailabilityFromTenancy(tenancy) {
  if (!tenancy) {
    return {
      availability: 'AVAILABLE',
      activeTenantName: null,
      activeTenancyId: null,
      canAssignTenant: true,
    };
  }

  const tenantName = tenancy.tenantName;
  const tenancyId = tenancy._id?.toString?.() || tenancy.id;

  if (tenancy.status === 'Settlement Pending' || tenancy.stage === 'settlement') {
    return {
      availability: 'SETTLEMENT_PENDING',
      activeTenantName: tenantName,
      activeTenancyId: tenancyId,
      canAssignTenant: false,
    };
  }

  if (
    tenancy.stage === 'move-out' ||
    tenancy.occupancyStatus === 'PREPARING_TO_MOVE_OUT' ||
    tenancy.occupancyStatus === 'MOVED_OUT'
  ) {
    return {
      availability: 'MOVE_OUT_IN_PROGRESS',
      activeTenantName: tenantName,
      activeTenancyId: tenancyId,
      canAssignTenant: false,
    };
  }

  return {
    availability: 'OCCUPIED',
    activeTenantName: tenantName,
    activeTenancyId: tenancyId,
    canAssignTenant: false,
  };
}

export async function getActiveTenancyForProperty(propertyId, session = null) {
  let query = Tenancy.findOne({
    propertyId,
    ...ACTIVE_TENANCY_QUERY,
  }).sort({ createdAt: -1 });

  if (session) query = query.session(session);
  return query;
}

export async function assertPropertyAvailableForTenancy(propertyId, session = null) {
  const existing = await getActiveTenancyForProperty(propertyId, session);
  if (existing) {
    throw new ApiError(
      409,
      'This property already has an active or reserved tenancy. Complete or cancel the current tenancy before assigning another Tenant.',
    );
  }
}

export async function enrichPropertyWithAvailability(propertyDocOrJson) {
  const propertyId = propertyDocOrJson._id || propertyDocOrJson.id;
  const activeTenancy = await getActiveTenancyForProperty(propertyId);
  const base = propertyDocOrJson.toJSON ? propertyDocOrJson.toJSON() : { ...propertyDocOrJson };
  const availability = deriveAvailabilityFromTenancy(activeTenancy);

  if (availability.activeTenantName) {
    base.activeTenancy = availability.activeTenantName;
  } else if (!base.activeTenancy) {
    base.activeTenancy = null;
  }

  return { ...base, ...availability };
}

export async function enrichPropertiesWithAvailability(properties) {
  if (!properties.length) return [];

  const propertyIds = properties.map((p) => p._id || p.id);
  const activeTenancies = await Tenancy.find({
    propertyId: { $in: propertyIds },
    ...ACTIVE_TENANCY_QUERY,
  }).sort({ createdAt: -1 });

  const tenancyByProperty = new Map();
  for (const tenancy of activeTenancies) {
    const key = tenancy.propertyId.toString();
    if (!tenancyByProperty.has(key)) {
      tenancyByProperty.set(key, tenancy);
    }
  }

  return properties.map((property) => {
    const base = property.toJSON ? property.toJSON() : { ...property };
    const activeTenancy = tenancyByProperty.get(base.id);
    const availability = deriveAvailabilityFromTenancy(activeTenancy);

    if (availability.activeTenantName) {
      base.activeTenancy = availability.activeTenantName;
    } else if (!base.activeTenancy) {
      base.activeTenancy = null;
    }

    return { ...base, ...availability };
  });
}

export async function assertOwnerPropertyAccess(ownerId, propertyId) {
  const { Property } = await import('../models/Property.js');
  const property = await Property.findById(propertyId);
  if (!property) throw new ApiError(404, 'Property not found');
  if (property.ownerId.toString() !== ownerId.toString()) {
    throw new ApiError(403, 'You do not have permission to modify this property.');
  }
  return property;
}

function supportsTransactions() {
  const type = mongoose.connection?.client?.topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded' || type === 'LoadBalanced';
}

function isTransactionUnsupported(error) {
  const message = String(error?.message || '');
  return (
    error?.code === 20 ||
    error?.codeName === 'IllegalOperation' ||
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set member or mongos')
  );
}

/** Use a transaction when MongoDB supports it; otherwise run the work without a session. */
export async function withOptionalTransaction(fn) {
  if (!supportsTransactions()) {
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    return fn(null);
  } finally {
    session.endSession();
  }
}

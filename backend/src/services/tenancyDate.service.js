import { TenancyExtensionRequest } from '../models/TenancyExtensionRequest.js';

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTodayYmd(now = new Date(), timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function normalizeTenancyDate(value, timeZone = APP_TIMEZONE) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

export function daysBetweenYmd(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return null;
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  if (![y1, m1, d1, y2, m2, d2].every(Number.isFinite)) return null;
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  return Math.round((end - start) / MS_PER_DAY);
}

export function formatCalendarDate(value, timeZone = APP_TIMEZONE) {
  const ymd = normalizeTenancyDate(value, timeZone);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getDaysUntilMoveOut(expectedMoveOut, now = new Date(), timeZone = APP_TIMEZONE) {
  const target = normalizeTenancyDate(expectedMoveOut, timeZone);
  if (!target) return null;
  return daysBetweenYmd(getTodayYmd(now, timeZone), target);
}

export function isMoveOutToday(expectedMoveOut, now = new Date(), timeZone = APP_TIMEZONE) {
  return getDaysUntilMoveOut(expectedMoveOut, now, timeZone) === 0;
}

export function isMoveOutOverdue(expectedMoveOut, now = new Date(), timeZone = APP_TIMEZONE) {
  const days = getDaysUntilMoveOut(expectedMoveOut, now, timeZone);
  return days !== null && days < 0;
}

export function getMoveOutReminderState(expectedMoveOut, now = new Date(), timeZone = APP_TIMEZONE) {
  const days = getDaysUntilMoveOut(expectedMoveOut, now, timeZone);
  if (days === null) return 'NONE';
  if (days < 0) return 'OVERDUE';
  if (days === 0) return 'TODAY';
  if (days <= 5) return 'FIVE_DAYS';
  if (days <= 30) return 'THIRTY_DAYS';
  return 'MORE_THAN_30';
}

export function isTenancyEligibleForMoveOutReminders(tenancy) {
  if (!tenancy) return false;
  if (tenancy.inviteStatus !== 'Accepted') return false;
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed' || tenancy.status === 'Cancelled') {
    return false;
  }
  return ['move-in', 'active', 'move-out'].includes(tenancy.stage);
}

export function canRequestExtension(tenancy, pendingExtension) {
  if (!tenancy) return false;
  if (pendingExtension) return false;
  if (tenancy.inviteStatus !== 'Accepted') return false;
  if (tenancy.stage === 'complete' || tenancy.status === 'Completed' || tenancy.status === 'Cancelled') {
    return false;
  }
  return Boolean(normalizeTenancyDate(tenancy.moveOut));
}

export function buildMoveOutCountdownLabel(daysUntilMoveOut) {
  if (daysUntilMoveOut === null || daysUntilMoveOut === undefined) return '';
  if (daysUntilMoveOut === 0) return 'Move-Out Today';
  if (daysUntilMoveOut < 0) {
    const overdue = Math.abs(daysUntilMoveOut);
    return overdue === 1
      ? 'Move-Out date passed 1 day ago'
      : `Move-Out date passed ${overdue} days ago`;
  }
  if (daysUntilMoveOut === 1) return 'Move-Out in 1 Day';
  if (daysUntilMoveOut <= 5) return `Move-Out in ${daysUntilMoveOut} Days`;
  return `${daysUntilMoveOut} days remaining`;
}

export function buildMoveOutTimeline(tenancy, pendingExtension = null, now = new Date()) {
  const daysUntilMoveOut = getDaysUntilMoveOut(tenancy?.moveOut, now);
  const moveOutReminderState = getMoveOutReminderState(tenancy?.moveOut, now);
  const overdue = isMoveOutOverdue(tenancy?.moveOut, now);
  const today = isMoveOutToday(tenancy?.moveOut, now);
  const eligible = isTenancyEligibleForMoveOutReminders(tenancy);

  return {
    expectedMoveOut: tenancy?.moveOut || '',
    actualMoveOut: tenancy?.actualMoveOut || null,
    daysUntilMoveOut,
    daysOverdue: overdue && daysUntilMoveOut !== null ? Math.abs(daysUntilMoveOut) : 0,
    moveOutReminderState: eligible ? moveOutReminderState : 'NONE',
    isMoveOutToday: eligible && today,
    isOverdue: eligible && overdue,
    label: eligible ? buildMoveOutCountdownLabel(daysUntilMoveOut) : '',
    canRequestExtension: canRequestExtension(tenancy, pendingExtension),
  };
}

export function serializeDateHistory(history = []) {
  return history.map((entry) => ({
    field: entry.field,
    oldValue: entry.oldValue || '',
    newValue: entry.newValue || '',
    reason: entry.reason || '',
    changedBy: entry.changedBy?.toString?.() || entry.changedBy || null,
    requestedBy: entry.requestedBy?.toString?.() || entry.requestedBy || null,
    approvedBy: entry.approvedBy?.toString?.() || entry.approvedBy || null,
    changedAt: entry.changedAt || null,
  }));
}

export function summarizeMoveOutHistory(tenancy) {
  const history = serializeDateHistory(tenancy?.dateHistory || []).filter(
    (entry) => entry.field === 'moveOut' || entry.field === 'expectedMoveOutDate',
  );
  const originalExpectedMoveOut = history[0]?.oldValue || tenancy?.moveOut || '';
  const approvedExtensions = history.filter((entry) =>
    /extension/i.test(entry.reason || ''),
  );
  return {
    originalExpectedMoveOut,
    approvedExtensions,
    finalExpectedMoveOut: tenancy?.moveOut || '',
    actualMoveOut: tenancy?.actualMoveOut || null,
  };
}

export function formatExtensionRequest(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

export async function loadExtensionContext(tenancyId) {
  const [pending, latest] = await Promise.all([
    TenancyExtensionRequest.findOne({ tenancyId, status: 'PENDING' }).sort({ createdAt: -1 }),
    TenancyExtensionRequest.findOne({ tenancyId }).sort({ createdAt: -1 }),
  ]);
  return {
    pending,
    latestRejected: latest?.status === 'REJECTED' ? latest : null,
  };
}

export async function attachTenancyTimeline(tenancyDoc, extras = {}) {
  const json = tenancyDoc.toJSON ? tenancyDoc.toJSON() : { ...tenancyDoc };
  const context = extras.extensionContext || (await loadExtensionContext(tenancyDoc._id || tenancyDoc.id));
  json.dateHistory = serializeDateHistory(tenancyDoc.dateHistory || json.dateHistory || []);
  json.moveOutHistory = summarizeMoveOutHistory(tenancyDoc);
  json.moveOutTimeline = buildMoveOutTimeline(tenancyDoc, context.pending);
  json.pendingExtension = formatExtensionRequest(context.pending);
  json.latestRejectedExtension = formatExtensionRequest(context.latestRejected);
  return json;
}

export async function attachTenancyTimelines(tenancyDocs) {
  if (!tenancyDocs.length) return [];
  const ids = tenancyDocs.map((doc) => doc._id);
  const [pendingList, latestList] = await Promise.all([
    TenancyExtensionRequest.find({ tenancyId: { $in: ids }, status: 'PENDING' }),
    TenancyExtensionRequest.aggregate([
      { $match: { tenancyId: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$tenancyId', doc: { $first: '$$ROOT' } } },
    ]),
  ]);

  const pendingByTenancy = new Map(
    pendingList.map((item) => [item.tenancyId.toString(), item]),
  );
  const latestByTenancy = new Map(
    latestList.map((item) => [item._id.toString(), item.doc]),
  );

  return Promise.all(
    tenancyDocs.map((doc) => {
      const latest = latestByTenancy.get(doc._id.toString());
      return attachTenancyTimeline(doc, {
        extensionContext: {
          pending: pendingByTenancy.get(doc._id.toString()) || null,
          latestRejected: latest?.status === 'REJECTED' ? latest : null,
        },
      });
    }),
  );
}

export async function attachAccessTimeline(tenancy, access) {
  const context = await loadExtensionContext(tenancy._id);
  return {
    ...access,
    moveOut: tenancy.moveOut,
    actualMoveOut: tenancy.actualMoveOut,
    moveOutTimeline: buildMoveOutTimeline(tenancy, context.pending),
    pendingExtension: formatExtensionRequest(context.pending),
    latestRejectedExtension: formatExtensionRequest(context.latestRejected),
    moveOutHistory: summarizeMoveOutHistory(tenancy),
  };
}

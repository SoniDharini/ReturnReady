import { Notification } from '../models/Notification.js';
import { Tenancy } from '../models/Tenancy.js';
import { createNotification } from './notification.service.js';
import {
  formatCalendarDate,
  getDaysUntilMoveOut,
  isTenancyEligibleForMoveOutReminders,
  normalizeTenancyDate,
} from './tenancyDate.service.js';

const REMINDER_INTERVAL_MS = Number(process.env.MOVE_OUT_REMINDER_INTERVAL_MS) || 60 * 60 * 1000;

async function reminderAlreadySent({ tenancyId, userId, type, targetMoveOutDate }) {
  const existing = await Notification.findOne({
    tenancyId,
    userId,
    type,
    targetMoveOutDate,
  });
  return Boolean(existing);
}

async function sendOnce(payload) {
  if (await reminderAlreadySent(payload)) return false;
  await createNotification(payload);
  return true;
}

function propertyLabel(tenancy) {
  return tenancy.propertyName;
}

async function sendThirtyDayReminder(tenancy, targetMoveOutDate, formattedDate) {
  if (!tenancy.tenantUserId) return false;
  return sendOnce({
    userId: tenancy.tenantUserId,
    tenancyId: tenancy._id,
    type: 'MOVE_OUT_30_DAY_REMINDER',
    title: 'Upcoming Move-Out',
    message: `Your expected Move-Out date for ${propertyLabel(tenancy)} is ${formattedDate}. Your tenancy is expected to end in approximately one month. If you want to extend your stay, you can send an extension request to the Owner.`,
    targetMoveOutDate,
  });
}

async function sendFiveDayReminders(tenancy, targetMoveOutDate, formattedDate) {
  let sent = false;
  if (tenancy.tenantUserId) {
    sent =
      (await sendOnce({
        userId: tenancy.tenantUserId,
        tenancyId: tenancy._id,
        type: 'MOVE_OUT_5_DAY_REMINDER',
        title: 'Move-Out in 5 Days',
        message: `Your Move-Out date for ${propertyLabel(tenancy)} is ${formattedDate}. Please prepare for the property handover and Move-Out Inspection.`,
        targetMoveOutDate,
      })) || sent;
  }
  sent =
    (await sendOnce({
      userId: tenancy.ownerId,
      tenancyId: tenancy._id,
      type: 'MOVE_OUT_5_DAY_REMINDER',
      title: 'Tenant Move-Out in 5 Days',
      message: `${tenancy.tenantName} is expected to move out of ${propertyLabel(tenancy)} on ${formattedDate}. Prepare for the property handover and Move-Out Inspection.`,
      targetMoveOutDate,
    })) || sent;
  return sent;
}

async function sendOverdueReminders(tenancy, targetMoveOutDate, formattedDate) {
  let sent = false;
  if (tenancy.tenantUserId) {
    sent =
      (await sendOnce({
        userId: tenancy.tenantUserId,
        tenancyId: tenancy._id,
        type: 'MOVE_OUT_OVERDUE',
        title: 'Move-Out Date Passed',
        message: `Your expected Move-Out date for ${propertyLabel(tenancy)} was ${formattedDate}. Complete the handover when ready — your tenancy stays open until the current workflow finishes.`,
        targetMoveOutDate,
      })) || sent;
  }
  sent =
    (await sendOnce({
      userId: tenancy.ownerId,
      tenancyId: tenancy._id,
      type: 'MOVE_OUT_OVERDUE',
      title: 'Move-Out Date Passed',
      message: `${tenancy.tenantName} was expected to move out of ${propertyLabel(tenancy)} on ${formattedDate}. The handover has not yet been completed.`,
      targetMoveOutDate,
    })) || sent;
  return sent;
}

async function sendMoveOutDayReminders(tenancy, targetMoveOutDate, formattedDate) {
  let sent = false;
  if (tenancy.tenantUserId) {
    sent =
      (await sendOnce({
        userId: tenancy.tenantUserId,
        tenancyId: tenancy._id,
        type: 'MOVE_OUT_TODAY',
        title: 'Today is Your Move-Out Day',
        message: `Your scheduled Move-Out date for ${propertyLabel(tenancy)} is today. Complete the required handover and Move-Out Inspection when ready.`,
        targetMoveOutDate,
      })) || sent;
  }
  sent =
    (await sendOnce({
      userId: tenancy.ownerId,
      tenancyId: tenancy._id,
      type: 'MOVE_OUT_TODAY',
      title: 'Today is Tenant Move-Out Day',
      message: `${tenancy.tenantName} is scheduled to move out of ${propertyLabel(tenancy)} today.`,
      targetMoveOutDate,
    })) || sent;
  return sent;
}

export async function processMoveOutReminders(now = new Date()) {
  const tenancies = await Tenancy.find({
    inviteStatus: 'Accepted',
    stage: { $in: ['move-in', 'active', 'move-out'] },
    status: { $nin: ['Completed', 'Cancelled'] },
  });

  let sent = 0;
  for (const tenancy of tenancies) {
    if (!isTenancyEligibleForMoveOutReminders(tenancy)) continue;

    const targetMoveOutDate = normalizeTenancyDate(tenancy.moveOut);
    if (!targetMoveOutDate) continue;

    const daysUntil = getDaysUntilMoveOut(targetMoveOutDate, now);
    if (daysUntil === null) continue;

    const formattedDate = formatCalendarDate(targetMoveOutDate);

    if (daysUntil <= 30 && daysUntil > 5) {
      if (await sendThirtyDayReminder(tenancy, targetMoveOutDate, formattedDate)) sent += 1;
    }

    if (daysUntil <= 5 && daysUntil > 0) {
      if (await sendFiveDayReminders(tenancy, targetMoveOutDate, formattedDate)) sent += 1;
    }

    if (daysUntil === 0) {
      if (await sendMoveOutDayReminders(tenancy, targetMoveOutDate, formattedDate)) sent += 1;
    }

    if (daysUntil < 0) {
      if (await sendOverdueReminders(tenancy, targetMoveOutDate, formattedDate)) sent += 1;
    }
  }

  return { checked: tenancies.length, sent };
}

export function startMoveOutReminderScheduler() {
  const run = async () => {
    try {
      const result = await processMoveOutReminders();
      if (result.sent > 0) {
        console.log(`Move-out reminders sent: ${result.sent} (${result.checked} active tenancies checked)`);
      }
    } catch (error) {
      console.error('Move-out reminder check failed:', error.message);
    }
  };

  void run();
  const timer = setInterval(() => void run(), REMINDER_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

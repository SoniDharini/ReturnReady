import { Notification } from '../models/Notification.js';

export async function createNotification({ userId, tenancyId, type, title, message }) {
  if (!userId) return null;
  return Notification.create({
    userId,
    tenancyId: tenancyId || null,
    type,
    title,
    message: message || '',
    isRead: false,
  });
}

export async function listNotifications(userId, { limit = 50 } = {}) {
  const items = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  return { notifications: items.map((n) => n.toJSON()), unreadCount };
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) return null;
  notification.isRead = true;
  await notification.save();
  return notification.toJSON();
}

export async function markAllNotificationsRead(userId) {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return true;
}

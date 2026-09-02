import * as notificationService from '../services/notification.service.js';

export async function list(req, res, next) {
  try {
    const data = await notificationService.listNotifications(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead(
      req.user.id,
      req.params.id,
    );
    return res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    return next(error);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllNotificationsRead(req.user.id);
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
}

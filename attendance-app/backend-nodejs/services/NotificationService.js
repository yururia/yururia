const { query } = require('../config/database');
const logger = require('../utils/logger');

// ダミーのサービス（ローカルから本来のファイルをアップロードしてください）
class NotificationService {
  static async createNotification(data) {
    logger.warn('ダミーのNotificationService.createNotificationが呼び出されました');
    return { success: true, data: { id: 1 } };
  }
  static async getNotifications(options) {
    logger.warn('ダミーのNotificationService.getNotificationsが呼び出されました');
    return { success: true, data: { notifications: [], total: 0 } };
  }
  static async getNotification(id, userId) {
    logger.warn('ダミーのNotificationService.getNotificationが呼び出されました');
    return { success: true, data: { notification: { id, title: 'ダミー通知' } } };
  }
  static async markAsRead(id, userId) {
    logger.warn('ダミーのNotificationService.markAsReadが呼び出されました');
    return { success: true };
  }
  static async markAllAsRead(userId) {
    logger.warn('ダミーのNotificationService.markAllAsReadが呼び出されました');
    return { success: true };
  }
  static async deleteNotification(id, userId) {
    logger.warn('ダミーのNotificationService.deleteNotificationが呼び出されました');
    return { success: true };
  }
}

module.exports = NotificationService;



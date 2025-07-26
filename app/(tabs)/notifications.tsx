import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blink } from '../../lib/blink';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPreferences {
  order_updates: boolean;
  delivery_updates: boolean;
  promotions: boolean;
  price_drops: boolean;
  flash_sales: boolean;
  review_reminders: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    order_updates: true,
    delivery_updates: true,
    promotions: true,
    price_drops: true,
    flash_sales: true,
    review_reminders: true,
    push_enabled: true,
    email_enabled: true,
  });

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) return;

      const result = await blink.db.notifications.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        limit: 50,
      });

      setNotifications(result || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) return;

      const result = await blink.db.notification_preferences.list({
        where: { user_id: user.id },
        limit: 1,
      });

      if (result && result.length > 0) {
        const prefs = result[0];
        setPreferences({
          order_updates: Number(prefs.order_updates) > 0,
          delivery_updates: Number(prefs.delivery_updates) > 0,
          promotions: Number(prefs.promotions) > 0,
          price_drops: Number(prefs.price_drops) > 0,
          flash_sales: Number(prefs.flash_sales) > 0,
          review_reminders: Number(prefs.review_reminders) > 0,
          push_enabled: Number(prefs.push_enabled) > 0,
          email_enabled: Number(prefs.email_enabled) > 0,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await blink.db.notifications.update(notificationId, {
        is_read: true,
      });

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) return;

      // Update all unread notifications
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifications) {
        await blink.db.notifications.update(notif.id, { is_read: true });
      }

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await blink.db.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const updatePreferences = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const user = await blink.auth.me();
      if (!user) return;

      setPreferences(prev => ({ ...prev, [key]: value }));

      // Update in database
      const updateData = { [key]: value ? 1 : 0 };
      
      // Try to update existing preferences
      const existing = await blink.db.notification_preferences.list({
        where: { user_id: user.id },
        limit: 1,
      });

      if (existing && existing.length > 0) {
        await blink.db.notification_preferences.update(existing[0].id, updateData);
      } else {
        // Create new preferences
        await blink.db.notification_preferences.create({
          user_id: user.id,
          ...updateData,
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update': return 'bag-outline';
      case 'delivery_update': return 'car-outline';
      case 'flash_sale': return 'flash-outline';
      case 'price_drop': return 'trending-down-outline';
      case 'review_reminder': return 'star-outline';
      case 'stock_alert': return 'alert-circle-outline';
      default: return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_update': return '#2E7D32';
      case 'delivery_update': return '#1976D2';
      case 'flash_sale': return '#FF5722';
      case 'price_drop': return '#FF9800';
      case 'review_reminder': return '#9C27B0';
      case 'stock_alert': return '#F44336';
      default: return '#666';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              We'll notify you about orders, deals, and updates
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard,
              ]}
              onPress={() => !notification.is_read && markAsRead(notification.id)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: getNotificationColor(notification.type) + '20' }
                  ]}>
                    <Ionicons
                      name={getNotificationIcon(notification.type) as any}
                      size={20}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationText}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(notification.id)}
                  >
                    <Ionicons name="close-outline" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Push Notifications</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Enable Push Notifications</Text>
                <Switch
                  value={preferences.push_enabled}
                  onValueChange={(value) => updatePreferences('push_enabled', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Notification Types</Text>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Order Updates</Text>
                <Switch
                  value={preferences.order_updates}
                  onValueChange={(value) => updatePreferences('order_updates', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Delivery Updates</Text>
                <Switch
                  value={preferences.delivery_updates}
                  onValueChange={(value) => updatePreferences('delivery_updates', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Promotions & Deals</Text>
                <Switch
                  value={preferences.promotions}
                  onValueChange={(value) => updatePreferences('promotions', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Price Drop Alerts</Text>
                <Switch
                  value={preferences.price_drops}
                  onValueChange={(value) => updatePreferences('price_drops', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Flash Sales</Text>
                <Switch
                  value={preferences.flash_sales}
                  onValueChange={(value) => updatePreferences('flash_sales', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Review Reminders</Text>
                <Switch
                  value={preferences.review_reminders}
                  onValueChange={(value) => updatePreferences('review_reminders', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Email Notifications</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Enable Email Notifications</Text>
                <Switch
                  value={preferences.email_enabled}
                  onValueChange={(value) => updatePreferences('email_enabled', value)}
                  trackColor={{ false: '#ccc', true: '#2E7D32' }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
  markAllText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
  },
  unreadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  notificationContent: {
    padding: 16,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});
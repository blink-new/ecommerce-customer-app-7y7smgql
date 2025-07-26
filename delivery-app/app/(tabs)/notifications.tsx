import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
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

export default function DeliveryNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // For demo purposes, using delivery_1 as the current delivery partner
      const result = await blink.db.notifications.list({
        where: { user_id: 'delivery_1' },
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

  const handleNotificationAction = async (notification: Notification) => {
    try {
      const data = JSON.parse(notification.data || '{}');
      
      switch (notification.type) {
        case 'delivery_assigned':
          Alert.alert(
            'New Delivery',
            `New delivery assigned! Distance: ${data.distance}km. Accept this delivery?`,
            [
              { text: 'Decline', style: 'cancel' },
              { text: 'Accept', onPress: () => console.log('Accept delivery') },
            ]
          );
          break;
        case 'delivery_update':
          Alert.alert(
            'Delivery Update',
            notification.message,
            [{ text: 'OK' }]
          );
          break;
        default:
          break;
      }

      // Mark as read when action is taken
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'delivery_assigned': return 'bicycle-outline';
      case 'delivery_update': return 'car-outline';
      case 'earnings_update': return 'wallet-outline';
      case 'safety_alert': return 'shield-outline';
      case 'system_message': return 'information-circle-outline';
      default: return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'delivery_assigned': return '#2E7D32';
      case 'delivery_update': return '#1976D2';
      case 'earnings_update': return '#FF9800';
      case 'safety_alert': return '#F44336';
      case 'system_message': return '#9C27B0';
      default: return '#666';
    }
  };

  const getPriorityColor = (data: string) => {
    try {
      const parsed = JSON.parse(data || '{}');
      switch (parsed.priority) {
        case 'urgent': return '#F44336';
        case 'high': return '#FF9800';
        case 'normal': return '#2E7D32';
        case 'low': return '#666';
        default: return '#666';
      }
    } catch {
      return '#666';
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
  const urgentCount = notifications.filter(n => {
    try {
      const data = JSON.parse(n.data || '{}');
      return data.priority === 'urgent' && !n.is_read;
    } catch {
      return false;
    }
  }).length;

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
        <Text style={styles.headerTitle}>Delivery Notifications</Text>
        <View style={styles.headerBadges}>
          {urgentCount > 0 && (
            <View style={[styles.badge, { backgroundColor: '#F44336' }]}>
              <Text style={styles.badgeText}>{urgentCount} urgent</Text>
            </View>
          )}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#2E7D32' }]}>
            {notifications.filter(n => n.type === 'delivery_assigned').length}
          </Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF9800' }]}>
            {notifications.filter(n => n.type === 'earnings_update').length}
          </Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll receive updates about deliveries, earnings, and safety alerts
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
              onPress={() => handleNotificationAction(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: getNotificationColor(notification.type) + '20' }
                ]}>
                  <Ionicons
                    name={getNotificationIcon(notification.type) as any}
                    size={24}
                    color={getNotificationColor(notification.type)}
                  />
                </View>
                <View style={styles.notificationText}>
                  <View style={styles.titleRow}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </Text>
                    <View style={[
                      styles.priorityDot,
                      { backgroundColor: getPriorityColor(notification.data) }
                    ]} />
                  </View>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
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
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D32',
  },
});
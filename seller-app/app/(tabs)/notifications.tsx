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

export default function SellerNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // For demo purposes, using seller_1 as the current seller
      const result = await blink.db.notifications.list({
        where: { user_id: 'seller_1' },
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
        case 'order_update':
          // Navigate to order details or show order management
          Alert.alert(
            'Order Action',
            `Order ${data.order_id} requires your attention. Would you like to view details?`,
            [
              { text: 'Later', style: 'cancel' },
              { text: 'View Order', onPress: () => console.log('Navigate to order') },
            ]
          );
          break;
        case 'stock_alert':
          Alert.alert(
            'Stock Alert',
            `Product ${data.product_id} is running low. Current stock: ${data.current_stock}`,
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Restock', onPress: () => console.log('Navigate to inventory') },
            ]
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
      case 'order_update': return 'bag-outline';
      case 'stock_alert': return 'alert-circle-outline';
      case 'payment_update': return 'card-outline';
      case 'customer_message': return 'chatbubble-outline';
      default: return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_update': return '#2E7D32';
      case 'stock_alert': return '#F44336';
      case 'payment_update': return '#1976D2';
      case 'customer_message': return '#9C27B0';
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
        <Text style={styles.headerTitle}>Seller Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{unreadCount}</Text>
          </View>
        )}
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
            {notifications.filter(n => n.type === 'order_update').length}
          </Text>
          <Text style={styles.statLabel}>Orders</Text>
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
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll receive updates about orders, inventory, and business metrics
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
  unreadBadge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
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
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@blinkdotnew/sdk';

const blink = createClient({
  projectId: 'ecommerce-customer-app-7y7smgql',
  authRequired: true
});

const { width } = Dimensions.get('window');

export default function DeliveryDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    totalDeliveries: 0,
    completedDeliveries: 0,
    rating: 4.8,
    onTimeDeliveries: 95,
    totalDistance: 0
  });
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load delivery partner statistics
      const deliveries = await blink.db.orders.list({
        where: { delivery_partner_id: 'delivery_1' },
        limit: 100
      });

      const completedToday = deliveries.filter(delivery => 
        delivery.status === 'delivered' && 
        new Date(delivery.updated_at).toDateString() === new Date().toDateString()
      );

      const todayEarnings = completedToday.reduce((sum, delivery) => 
        sum + parseFloat(delivery.delivery_fee || 50), 0
      );

      const activeOrders = deliveries.filter(delivery => 
        ['confirmed', 'picked_up', 'out_for_delivery'].includes(delivery.status)
      );

      setStats({
        todayEarnings,
        totalDeliveries: deliveries.length,
        completedDeliveries: completedToday.length,
        rating: 4.8,
        onTimeDeliveries: 95,
        totalDistance: completedToday.length * 5.2 // Mock distance
      });

      setActiveDeliveries(activeOrders.slice(0, 5));

      // Mock notifications
      setNotifications([
        { id: 1, type: 'new_order', message: 'New delivery request from Electronics Store', time: '2 min ago' },
        { id: 2, type: 'bonus', message: 'You earned ₹50 bonus for 5 deliveries!', time: '1 hour ago' },
        { id: 3, type: 'update', message: 'Route optimization updated for better efficiency', time: '3 hours ago' }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    // Here you would update the delivery partner's online status in the database
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Delivery Dashboard</Text>
            <Text style={styles.headerSubtitle}>Ready to deliver excellence!</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineText, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#F44336', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Earnings"
          value={`₹${stats.todayEarnings}`}
          icon="wallet-outline"
          color="#4CAF50"
          subtitle={`${stats.completedDeliveries} deliveries`}
        />
        <StatCard
          title="Rating"
          value={`${stats.rating}⭐`}
          icon="star-outline"
          color="#FF9800"
          subtitle="Excellent service!"
        />
        <StatCard
          title="On-Time Rate"
          value={`${stats.onTimeDeliveries}%`}
          icon="time-outline"
          color="#2196F3"
          subtitle="Keep it up!"
        />
        <StatCard
          title="Distance Today"
          value={`${stats.totalDistance.toFixed(1)} km`}
          icon="location-outline"
          color="#9C27B0"
          subtitle="Eco-friendly!"
        />
      </View>

      {/* Active Deliveries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Deliveries</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {activeDeliveries.length > 0 ? (
          activeDeliveries.map((delivery, index) => (
            <View key={index} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>#{delivery.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) }]}>
                  <Text style={styles.statusText}>{delivery.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.deliveryAmount}>₹{parseFloat(delivery.total_amount || 0).toLocaleString()}</Text>
              <View style={styles.deliveryDetails}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.deliveryAddress}>Pickup from Electronics Store</Text>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No active deliveries</Text>
            <Text style={styles.emptySubtext}>Turn online to receive delivery requests</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="map-outline" size={24} color="#FF9800" />
            <Text style={styles.quickActionText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="call-outline" size={24} color="#4CAF50" />
            <Text style={styles.quickActionText}>Emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="help-circle-outline" size={24} color="#2196F3" />
            <Text style={styles.quickActionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings-outline" size={24} color="#9C27B0" />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {notifications.map((notification) => (
          <View key={notification.id} style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <Ionicons 
                name={getNotificationIcon(notification.type)} 
                size={20} 
                color={getNotificationColor(notification.type)} 
              />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Safety Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety & Support</Text>
        <TouchableOpacity style={styles.safetyButton}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Emergency SOS</Text>
            <Text style={styles.safetyDescription}>Quick access to emergency contacts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.safetyButton}>
          <Ionicons name="location" size={24} color="#2196F3" />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Share Location</Text>
            <Text style={styles.safetyDescription}>Share your live location with family</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightCard}>
          <Ionicons name="trending-up" size={24} color="#4CAF50" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Great Performance!</Text>
            <Text style={styles.insightDescription}>
              You're in the top 10% of delivery partners this week!
            </Text>
          </View>
        </View>
        <View style={styles.insightCard}>
          <Ionicons name="trophy" size={24} color="#FF9800" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Achievement Unlocked</Text>
            <Text style={styles.insightDescription}>
              50 successful deliveries milestone reached!
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed': return '#FF9800';
    case 'picked_up': return '#2196F3';
    case 'out_for_delivery': return '#9C27B0';
    case 'delivered': return '#4CAF50';
    default: return '#9E9E9E';
  }
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'new_order': return 'bag-add-outline';
    case 'bonus': return 'gift-outline';
    case 'update': return 'information-circle-outline';
    default: return 'notifications-outline';
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'new_order': return '#4CAF50';
    case 'bonus': return '#FF9800';
    case 'update': return '#2196F3';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFF3E0',
  },
  onlineToggle: {
    alignItems: 'center',
  },
  onlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deliveryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  deliveryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#FF9800',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    width: (width - 76) / 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  safetyContent: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  safetyDescription: {
    fontSize: 14,
    color: '#666',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MapPin, 
  Package, 
  Clock, 
  DollarSign, 
  Star,
  Navigation,
  Truck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react-native';
import { blink } from '../../lib/blink';

const { width } = Dimensions.get('window');

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null);
  const [deliveryPartner, setDeliveryPartner] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    totalDeliveries: 0,
    averageRating: 0,
    pendingPickups: 0,
    inTransitOrders: 0,
  });
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadDeliveryData();
      }
    });
    return unsubscribe;
  }, []);

  const loadDeliveryData = async () => {
    try {
      // Get delivery partner info
      const partnersResult = await blink.db.delivery_partners.list({
        where: { user_id: user?.id },
        limit: 1
      });

      if (partnersResult.length > 0) {
        const partnerData = partnersResult[0];
        setDeliveryPartner(partnerData);
        setIsOnline(Number(partnerData.is_online) > 0);

        // Load assigned orders
        const ordersResult = await blink.db.orders.list({
          where: { delivery_partner_id: partnerData.id },
          orderBy: { created_at: 'desc' },
          limit: 20
        });

        // Calculate today's stats
        const today = new Date().toDateString();
        const todayOrders = ordersResult.filter(order => 
          new Date(order.created_at).toDateString() === today
        );
        const todayDelivered = todayOrders.filter(order => order.status === 'delivered');
        const todayEarnings = todayDelivered.reduce((sum, order) => sum + (order.delivery_fee || 50), 0);

        // Get active orders (not delivered/cancelled)
        const active = ordersResult.filter(order => 
          !['delivered', 'cancelled', 'returned'].includes(order.status)
        );

        const pendingPickups = active.filter(order => 
          ['confirmed', 'processing', 'ready_for_pickup'].includes(order.status)
        ).length;

        const inTransit = active.filter(order => 
          ['picked_up', 'in_transit', 'out_for_delivery'].includes(order.status)
        ).length;

        setStats({
          todayDeliveries: todayDelivered.length,
          todayEarnings,
          totalDeliveries: partnerData.total_deliveries || 0,
          averageRating: partnerData.rating || 0,
          pendingPickups,
          inTransitOrders: inTransit,
        });

        setActiveOrders(active.slice(0, 5));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading delivery data:', error);
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!deliveryPartner) return;
    
    try {
      const newStatus = !isOnline;
      await blink.db.delivery_partners.update(deliveryPartner.id, {
        is_online: newStatus ? "1" : "0",
        updated_at: new Date().toISOString()
      });
      setIsOnline(newStatus);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image 
            source={{ uri: '/assets/images/citymerce-logo.jpg' }} 
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Loading Delivery Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image 
              source={{ uri: '/assets/images/citymerce-logo.jpg' }} 
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Citymerce Delivery</Text>
              <Text style={styles.partnerName}>{user?.displayName || user?.email}</Text>
            </View>
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

        {/* Online Status Banner */}
        {isOnline && (
          <View style={styles.onlineBanner}>
            <CheckCircle size={20} color="#4CAF50" />
            <Text style={styles.onlineBannerText}>
              You're online and ready to receive delivery requests!
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              icon={Package}
              title="Today's Deliveries"
              value={stats.todayDeliveries}
              color="#2E7D32"
            />
            <StatCard
              icon={DollarSign}
              title="Today's Earnings"
              value={`₹${stats.todayEarnings}`}
              color="#FF9800"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={Truck}
              title="Total Deliveries"
              value={stats.totalDeliveries}
              color="#1976D2"
            />
            <StatCard
              icon={Star}
              title="Average Rating"
              value={stats.averageRating.toFixed(1)}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MapPin size={24} color="#2E7D32" />
              <Text style={styles.actionText}>View Map</Text>
              {stats.pendingPickups > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{stats.pendingPickups}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Navigation size={24} color="#1976D2" />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Clock size={24} color="#FF9800" />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <AlertTriangle size={24} color="#F44336" />
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Orders</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {activeOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>#{order.order_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.orderDetails}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderAmount}>₹{order.total_amount.toLocaleString()}</Text>
                    <Text style={styles.deliveryFee}>Delivery: ₹{order.delivery_fee || 50}</Text>
                  </View>
                  <TouchableOpacity style={styles.actionOrderButton}>
                    <Text style={styles.actionOrderText}>
                      {getActionText(order.status)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.orderTime}>
                  {new Date(order.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Performance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Pending Pickups</Text>
              <Text style={[styles.performanceValue, { color: '#FF9800' }]}>
                {stats.pendingPickups}
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>In Transit</Text>
              <Text style={[styles.performanceValue, { color: '#2196F3' }]}>
                {stats.inTransitOrders}
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Vehicle</Text>
              <Text style={styles.performanceValue}>
                {deliveryPartner?.vehicle_type?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Status</Text>
              <Text style={[styles.performanceValue, { 
                color: Number(deliveryPartner?.is_verified) > 0 ? '#4CAF50' : '#F44336' 
              }]}>
                {Number(deliveryPartner?.is_verified) > 0 ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Safety Reminder */}
        <View style={styles.section}>
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <AlertTriangle size={20} color="#FF9800" />
              <Text style={styles.safetyTitle}>Safety First</Text>
            </View>
            <Text style={styles.safetyMessage}>
              Always wear your helmet, follow traffic rules, and use the SOS feature if you need help.
            </Text>
            <TouchableOpacity style={styles.sosButton}>
              <Text style={styles.sosButtonText}>Emergency SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ready_for_pickup': return '#FF9800';
    case 'picked_up': return '#2196F3';
    case 'in_transit': return '#9C27B0';
    case 'out_for_delivery': return '#4CAF50';
    case 'delivered': return '#4CAF50';
    case 'cancelled': return '#F44336';
    default: return '#9E9E9E';
  }
};

const getActionText = (status: string) => {
  switch (status) {
    case 'ready_for_pickup': return 'Pick Up';
    case 'picked_up': return 'Start Delivery';
    case 'in_transit': return 'Navigate';
    case 'out_for_delivery': return 'Complete';
    default: return 'View Details';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingLogo: {
    width: 120,
    height: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  onlineToggle: {
    alignItems: 'center',
    gap: 4,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  onlineBanner: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  onlineBannerText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    padding: 16,
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
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  deliveryFee: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  actionOrderButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionOrderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  safetyCard: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  safetyMessage: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 12,
    lineHeight: 20,
  },
  sosButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sosButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
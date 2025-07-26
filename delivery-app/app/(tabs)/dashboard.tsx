import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { blink } from '../../lib/blink';

const { width } = Dimensions.get('window');

interface DeliveryStats {
  todayEarnings: number;
  totalDeliveries: number;
  completionRate: number;
  avgRating: number;
  activeOrders: number;
  pendingPickups: number;
}

interface EarningsData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

export default function DeliveryDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<DeliveryStats>({
    todayEarnings: 0,
    totalDeliveries: 0,
    completionRate: 0,
    avgRating: 0,
    activeOrders: 0,
    pendingPickups: 0,
  });
  const [earningsData, setEarningsData] = useState<EarningsData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const user = await blink.auth.me();
      if (!user) return;

      // Load delivery partner data
      const deliveryPartner = await blink.db.delivery_partners.list({
        where: { user_id: user.id },
        limit: 1,
      });

      if (deliveryPartner.length === 0) {
        // Create delivery partner profile if doesn't exist
        await blink.db.delivery_partners.create({
          id: `dp_${Date.now()}`,
          user_id: user.id,
          name: user.displayName || user.email,
          phone: user.phone || '',
          vehicle_type: 'bike',
          license_number: '',
          is_verified: '0',
          is_online: '0',
          current_location: JSON.stringify({ lat: 0, lng: 0 }),
          rating: 4.5,
          total_deliveries: 0,
          total_earnings: 0,
        });
      }

      // Load orders assigned to this delivery partner
      const orders = await blink.db.orders.list({
        where: { delivery_partner_id: user.id },
        orderBy: { created_at: 'desc' },
      });

      // Calculate stats
      const today = new Date().toDateString();
      const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === today
      );

      const todayEarnings = todayOrders.reduce((sum, order) => {
        // Assume delivery fee is 10% of order total or minimum ₹50
        const deliveryFee = Math.max(parseFloat(order.total_amount || '0') * 0.1, 50);
        return sum + deliveryFee;
      }, 0);

      const totalDeliveries = orders.filter(order => order.status === 'delivered').length;
      const completionRate = orders.length > 0 ? (totalDeliveries / orders.length) * 100 : 0;
      const avgRating = 4.7; // Mock rating
      const activeOrders = orders.filter(order => 
        ['confirmed', 'picked_up', 'out_for_delivery'].includes(order.status)
      ).length;
      const pendingPickups = orders.filter(order => order.status === 'confirmed').length;

      setStats({
        todayEarnings,
        totalDeliveries,
        completionRate,
        avgRating,
        activeOrders,
        pendingPickups,
      });

      // Generate earnings chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      const earningsByDay = last7Days.map(() => Math.floor(Math.random() * 2000) + 500);

      setEarningsData({
        labels: last7Days,
        datasets: [
          {
            data: earningsByDay,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);

      const user = await blink.auth.me();
      if (!user) return;

      // Update online status in database
      await blink.db.delivery_partners.update(user.id, {
        is_online: newStatus ? '1' : '0',
      });

      // Log analytics event
      await blink.analytics.log('delivery_status_changed', {
        status: newStatus ? 'online' : 'offline',
        timestamp: Date.now(),
      });

      Alert.alert(
        'Status Updated',
        `You are now ${newStatus ? 'online' : 'offline'}. ${
          newStatus ? 'You will receive delivery requests.' : 'You will not receive new delivery requests.'
        }`
      );
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
      setIsOnline(!isOnline); // Revert on error
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const QuickAction = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Delivery Partner</Text>
          <Text style={styles.headerSubtitle}>Welcome back! Ready to deliver?</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Today's Earnings"
          value={`₹${stats.todayEarnings.toFixed(0)}`}
          icon="cash-outline"
          color="#2E7D32"
          subtitle="Great work!"
        />
        <StatCard
          title="Total Deliveries"
          value={stats.totalDeliveries.toString()}
          icon="checkmark-circle-outline"
          color="#FF9800"
          subtitle="Completed"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate.toFixed(1)}%`}
          icon="trending-up-outline"
          color="#1976D2"
          subtitle="Keep it up!"
        />
        <StatCard
          title="Rating"
          value={stats.avgRating.toFixed(1)}
          icon="star-outline"
          color="#7B1FA2"
          subtitle="⭐⭐⭐⭐⭐"
        />
      </View>

      {/* Active Orders Alert */}
      {stats.activeOrders > 0 && (
        <View style={styles.alertContainer}>
          <Ionicons name="alert-circle" size={24} color="#FF9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Active Deliveries</Text>
            <Text style={styles.alertText}>
              You have {stats.activeOrders} active orders and {stats.pendingPickups} pending pickups
            </Text>
          </View>
          <TouchableOpacity style={styles.alertButton}>
            <Text style={styles.alertButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Earnings Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Earnings Trend (Last 7 Days)</Text>
        <LineChart
          data={earningsData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2E7D32',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="View Orders"
            icon="list-outline"
            color="#2E7D32"
            onPress={() => {}}
          />
          <QuickAction
            title="Navigation"
            icon="navigate-outline"
            color="#FF9800"
            onPress={() => {}}
          />
          <QuickAction
            title="Earnings"
            icon="wallet-outline"
            color="#1976D2"
            onPress={() => {}}
          />
          <QuickAction
            title="Support"
            icon="help-circle-outline"
            color="#7B1FA2"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Safety Features */}
      <View style={styles.safetyContainer}>
        <Text style={styles.sectionTitle}>Safety & Support</Text>
        
        <TouchableOpacity style={styles.safetyButton}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Emergency SOS</Text>
            <Text style={styles.safetyText}>Quick access to emergency contacts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.safetyButton}>
          <Ionicons name="location" size={24} color="#2196F3" />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>Share Location</Text>
            <Text style={styles.safetyText}>Share your location with family</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.safetyButton}>
          <Ionicons name="call" size={24} color="#FF9800" />
          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>24/7 Support</Text>
            <Text style={styles.safetyText}>Get help anytime you need it</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Performance Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.sectionTitle}>Performance Tips</Text>
        
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#FF9800" />
          <Text style={styles.tipText}>
            Peak hours are 12-2 PM and 7-9 PM. Stay online during these times for maximum earnings!
          </Text>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.tipText}>
            Maintain a 4.5+ rating to get priority access to high-value orders.
          </Text>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="time" size={20} color="#2196F3" />
          <Text style={styles.tipText}>
            Complete deliveries 5 minutes early to improve your completion rate.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F5E8',
    marginTop: 4,
  },
  onlineToggle: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 55) / 2,
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
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  alertContainer: {
    backgroundColor: '#FFF3E0',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    color: '#F57C00',
  },
  alertButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  quickActionsContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  quickAction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: (width - 55) / 2,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  safetyContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  safetyContent: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 14,
    color: '#666',
  },
  tipsContainer: {
    margin: 20,
    marginTop: 0,
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
});
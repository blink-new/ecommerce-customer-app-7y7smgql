import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { blink } from '../../lib/blink';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    avgRating: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
  });
  const [revenueData, setRevenueData] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user (seller)
      const user = await blink.auth.me();
      if (!user) return;

      // Load seller stats
      const [orders, products] = await Promise.all([
        blink.db.orders.list({
          where: { seller_id: user.id },
          orderBy: { created_at: 'desc' },
        }),
        blink.db.products.list({
          where: { seller_id: user.id },
        }),
      ]);

      // Calculate stats
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
      const totalOrders = orders.length;
      const totalProducts = products.length;
      const avgRating = products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length || 0;

      // Calculate growth (mock data for demo)
      const revenueGrowth = 12.5;
      const orderGrowth = 8.3;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts,
        avgRating,
        revenueGrowth,
        orderGrowth,
      });

      // Generate revenue chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      const revenueByDay = last7Days.map(() => Math.floor(Math.random() * 50000) + 10000);

      setRevenueData({
        labels: last7Days,
        datasets: [
          {
            data: revenueByDay,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      });

      // Generate category performance data
      const categories = [
        { name: 'Electronics', population: 35, color: '#2E7D32', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Fashion', population: 28, color: '#FF9800', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Home', population: 20, color: '#1976D2', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Books', population: 17, color: '#7B1FA2', legendFontColor: '#333', legendFontSize: 12 },
      ];

      setCategoryData(categories);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, growth, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {growth !== undefined && (
        <View style={styles.growthContainer}>
          <Ionicons
            name={growth >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={growth >= 0 ? '#4CAF50' : '#F44336'}
          />
          <Text style={[styles.growthText, { color: growth >= 0 ? '#4CAF50' : '#F44336' }]}>
            {Math.abs(growth)}%
          </Text>
        </View>
      )}
    </View>
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
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! Here's your business overview</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue / 1000).toFixed(1)}K`}
          growth={stats.revenueGrowth}
          icon="cash-outline"
          color="#2E7D32"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          growth={stats.orderGrowth}
          icon="bag-outline"
          color="#FF9800"
        />
        <StatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon="cube-outline"
          color="#1976D2"
        />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon="star-outline"
          color="#7B1FA2"
        />
      </View>

      {/* Revenue Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trend (Last 7 Days)</Text>
        <LineChart
          data={revenueData}
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

      {/* Category Performance */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sales by Category</Text>
        <PieChart
          data={categoryData}
          width={width - 40}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle-outline" size={32} color="#2E7D32" />
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="list-outline" size={32} color="#FF9800" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="analytics-outline" size={32} color="#1976D2" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={32} color="#7B1FA2" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityItem}>
          <Ionicons name="bag-check-outline" size={24} color="#4CAF50" />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>New order received</Text>
            <Text style={styles.activityTime}>2 minutes ago</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <Ionicons name="star-outline" size={24} color="#FF9800" />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Product review received</Text>
            <Text style={styles.activityTime}>1 hour ago</Text>
          </View>
        </View>
        <View style={styles.activityItem}>
          <Ionicons name="cube-outline" size={24} color="#2196F3" />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Low stock alert</Text>
            <Text style={styles.activityTime}>3 hours ago</Text>
          </View>
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
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
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
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  actionsContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionButton: {
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
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  activityContainer: {
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
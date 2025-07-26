import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@blinkdotnew/sdk';

const blink = createClient({
  projectId: 'ecommerce-customer-app-7y7smgql',
  authRequired: true
});

const { width } = Dimensions.get('window');

export default function SellerDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load seller statistics
      const orders = await blink.db.orders.list({
        where: { seller_id: 'seller_1' },
        limit: 100
      });

      const products = await blink.db.products.list({
        where: { seller_id: 'seller_1' },
        limit: 100
      });

      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const lowStockItems = products.filter(product => parseInt(product.stock_quantity) < 10).length;

      setStats({
        totalSales: orders.length,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalRevenue,
        pendingOrders,
        lowStockItems
      });

      // Load recent orders
      const recent = orders.slice(0, 5);
      setRecentOrders(recent);

      // Load top products (mock data for now)
      const top = products.slice(0, 5);
      setTopProducts(top);

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! Here's your business overview</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon="cash-outline"
          color="#2E7D32"
          subtitle="This month"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon="bag-outline"
          color="#FF9800"
          subtitle={`${stats.pendingOrders} pending`}
        />
        <StatCard
          title="Products Listed"
          value={stats.totalProducts}
          icon="cube-outline"
          color="#1976D2"
          subtitle={`${stats.lowStockItems} low stock`}
        />
        <StatCard
          title="Conversion Rate"
          value="12.5%"
          icon="trending-up-outline"
          color="#7B1FA2"
          subtitle="+2.3% from last month"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle-outline" size={24} color="#2E7D32" />
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="list-outline" size={24} color="#FF9800" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="analytics-outline" size={24} color="#1976D2" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={24} color="#7B1FA2" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentOrders.map((order, index) => (
          <View key={index} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{order.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
            <Text style={styles.orderAmount}>₹{parseFloat(order.total_amount || 0).toLocaleString()}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Top Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Products</Text>
        {topProducts.map((product, index) => (
          <View key={index} style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>₹{parseFloat(product.price).toLocaleString()}</Text>
            </View>
            <View style={styles.productStats}>
              <Text style={styles.productSales}>Stock: {product.stock_quantity}</Text>
              <Text style={styles.productRating}>⭐ {product.rating || '4.5'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightCard}>
          <Ionicons name="trending-up" size={24} color="#2E7D32" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Sales Growth</Text>
            <Text style={styles.insightDescription}>
              Your sales increased by 23% this month. Keep up the great work!
            </Text>
          </View>
        </View>
        <View style={styles.insightCard}>
          <Ionicons name="alert-circle" size={24} color="#FF9800" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Low Stock Alert</Text>
            <Text style={styles.insightDescription}>
              {stats.lowStockItems} products are running low on stock. Restock soon!
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#FF9800';
    case 'confirmed': return '#2E7D32';
    case 'shipped': return '#1976D2';
    case 'delivered': return '#4CAF50';
    case 'cancelled': return '#F44336';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
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
    fontSize: 24,
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
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    width: (width - 76) / 2,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
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
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productSales: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productRating: {
    fontSize: 12,
    color: '#FF9800',
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
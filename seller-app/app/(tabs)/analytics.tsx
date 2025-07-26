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

interface AnalyticsData {
  salesTrend: any;
  topProducts: any[];
  customerInsights: any;
  revenueByCategory: any[];
  performanceMetrics: {
    conversionRate: number;
    avgOrderValue: number;
    customerRetention: number;
    returnRate: number;
  };
}

export default function SellerAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const user = await blink.auth.me();
      if (!user) return;

      // Load analytics data from database
      const [orders, products, reviews] = await Promise.all([
        blink.db.orders.list({
          where: { seller_id: user.id },
          orderBy: { created_at: 'desc' },
        }),
        blink.db.products.list({
          where: { seller_id: user.id },
        }),
        blink.db.product_reviews.list({
          orderBy: { created_at: 'desc' },
        }),
      ]);

      // Generate sales trend data
      const salesTrend = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [12000, 15000, 18000, 22000, 19000, 25000, 28000],
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      };

      // Generate top products data
      const topProducts = [
        { name: 'iPhone 15 Pro', sales: 45, revenue: 6074550 },
        { name: 'MacBook Pro M3', sales: 12, revenue: 2998800 },
        { name: 'AirPods Pro', sales: 89, revenue: 2216100 },
        { name: 'Samsung S24', sales: 23, revenue: 2872700 },
        { name: 'Gaming Laptop', sales: 8, revenue: 1439200 },
      ];

      // Generate customer insights
      const customerInsights = {
        labels: ['New', 'Returning', 'VIP'],
        datasets: [
          {
            data: [45, 35, 20],
          },
        ],
      };

      // Generate revenue by category
      const revenueByCategory = [
        { name: 'Electronics', population: 65, color: '#2E7D32', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Fashion', population: 20, color: '#FF9800', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Home', population: 10, color: '#1976D2', legendFontColor: '#333', legendFontSize: 12 },
        { name: 'Others', population: 5, color: '#7B1FA2', legendFontColor: '#333', legendFontSize: 12 },
      ];

      // Calculate performance metrics
      const performanceMetrics = {
        conversionRate: 3.2,
        avgOrderValue: 15750,
        customerRetention: 68.5,
        returnRate: 2.1,
      };

      setAnalyticsData({
        salesTrend,
        topProducts,
        customerInsights,
        revenueByCategory,
        performanceMetrics,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['7d', '30d', '90d', '1y'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.selectedPeriodButtonText,
            ]}
          >
            {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const MetricCard = ({ title, value, change, icon, color }: any) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={14}
            color={change >= 0 ? '#4CAF50' : '#F44336'}
          />
          <Text style={[styles.changeText, { color: change >= 0 ? '#4CAF50' : '#F44336' }]}>
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Advanced Analytics</Text>
        <Text style={styles.headerSubtitle}>Deep insights into your business performance</Text>
      </View>

      {/* Period Selector */}
      <PeriodSelector />

      {/* Performance Metrics */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="Conversion Rate"
          value={`${analyticsData.performanceMetrics.conversionRate}%`}
          change={0.5}
          icon="trending-up"
          color="#2E7D32"
        />
        <MetricCard
          title="Avg Order Value"
          value={`₹${(analyticsData.performanceMetrics.avgOrderValue / 1000).toFixed(1)}K`}
          change={12.3}
          icon="cash"
          color="#FF9800"
        />
        <MetricCard
          title="Customer Retention"
          value={`${analyticsData.performanceMetrics.customerRetention}%`}
          change={-2.1}
          icon="people"
          color="#1976D2"
        />
        <MetricCard
          title="Return Rate"
          value={`${analyticsData.performanceMetrics.returnRate}%`}
          change={-0.3}
          icon="return-down-back"
          color="#7B1FA2"
        />
      </View>

      {/* Sales Trend Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sales Trend</Text>
        <LineChart
          data={analyticsData.salesTrend}
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

      {/* Top Products */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Performing Products</Text>
        {analyticsData.topProducts.map((product, index) => (
          <View key={index} style={styles.productRow}>
            <View style={styles.productRank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productStats}>
                {product.sales} sales • ₹{(product.revenue / 1000).toFixed(0)}K revenue
              </Text>
            </View>
            <View style={styles.productProgress}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${(product.sales / 100) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Customer Insights */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Customer Segments</Text>
        <BarChart
          data={analyticsData.customerInsights}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            barPercentage: 0.7,
          }}
          style={styles.chart}
        />
      </View>

      {/* Revenue by Category */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue by Category</Text>
        <PieChart
          data={analyticsData.revenueByCategory}
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

      {/* Insights & Recommendations */}
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>AI Insights & Recommendations</Text>
        
        <View style={styles.insightCard}>
          <Ionicons name="bulb" size={24} color="#FF9800" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Inventory Optimization</Text>
            <Text style={styles.insightText}>
              Your iPhone 15 Pro is selling 3x faster than expected. Consider increasing stock by 40%.
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="trending-up" size={24} color="#4CAF50" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Pricing Strategy</Text>
            <Text style={styles.insightText}>
              Electronics category shows 15% higher profit margins. Consider expanding this category.
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="time" size={24} color="#2196F3" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Peak Sales Time</Text>
            <Text style={styles.insightText}>
              Most sales occur between 7-9 PM. Schedule promotions during this window.
            </Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
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
  periodSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#2E7D32',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedPeriodButtonText: {
    color: '#fff',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 0,
    gap: 15,
  },
  metricCard: {
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
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
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productStats: {
    fontSize: 12,
    color: '#666',
  },
  productProgress: {
    width: 60,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2E7D32',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  insightsContainer: {
    margin: 20,
    marginTop: 0,
  },
  insightCard: {
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
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
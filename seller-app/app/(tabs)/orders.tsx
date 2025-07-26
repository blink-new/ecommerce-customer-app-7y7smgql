import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useState, useEffect } from 'react'
import blink from '../../lib/blink'
import { Order } from '../../types/seller'

export default function Orders() {
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const statusOptions = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadOrders()
      }
    })
    return unsubscribe
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const orderList = await blink.db.orders.list({
        where: { sellerId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })
      setOrders(orderList)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await blink.db.orders.update(orderId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      await loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const filteredOrders = orders.filter(order => 
    selectedStatus === 'all' || order.status === selectedStatus
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B'
      case 'confirmed': return '#3B82F6'
      case 'processing': return '#8B5CF6'
      case 'shipped': return '#06B6D4'
      case 'delivered': return '#059669'
      case 'cancelled': return '#DC2626'
      default: return '#6B7280'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7'
      case 'confirmed': return '#DBEAFE'
      case 'processing': return '#EDE9FE'
      case 'shipped': return '#CFFAFE'
      case 'delivered': return '#D1FAE5'
      case 'cancelled': return '#FEE2E2'
      default: return '#F3F4F6'
    }
  }

  const OrderCard = ({ order }: { order: Order }) => (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
          </Text>
        </View>
        <View style={{
          backgroundColor: getStatusBgColor(order.status),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        }}>
          <Text style={{
            fontSize: 12,
            color: getStatusColor(order.status),
            fontWeight: '600',
            textTransform: 'capitalize',
          }}>
            {order.status}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
          Customer: {order.shippingAddress.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>
          ${order.total.toFixed(2)}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          Payment: {order.paymentStatus}
        </Text>
      </View>

      {/* Order Items */}
      <View style={{ marginBottom: 16 }}>
        {order.items.slice(0, 2).map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: '#F3F4F6',
              borderRadius: 6,
              marginRight: 12,
            }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: '#374151' }}>{item.productName}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                Qty: {item.quantity} × ${item.price.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
        {order.items.length > 2 && (
          <Text style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
            +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {order.status === 'pending' && (
          <>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#059669',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => updateOrderStatus(order.id, 'confirmed')}
            >
              <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FEE2E2',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => updateOrderStatus(order.id, 'cancelled')}
            >
              <Text style={{ fontSize: 14, color: '#DC2626', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
        
        {order.status === 'confirmed' && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#8B5CF6',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => updateOrderStatus(order.id, 'processing')}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>Start Processing</Text>
          </TouchableOpacity>
        )}
        
        {order.status === 'processing' && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#06B6D4',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => updateOrderStatus(order.id, 'shipped')}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>Mark as Shipped</Text>
          </TouchableOpacity>
        )}
        
        {order.status === 'shipped' && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#059669',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => updateOrderStatus(order.id, 'delivered')}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={{
            backgroundColor: '#F3F4F6',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#059669',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 }}>
          Orders
        </Text>
        <Text style={{ fontSize: 16, color: '#D1FAE5' }}>
          {orders.length} total orders
        </Text>
      </View>

      {/* Status Filter */}
      <View style={{ padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  backgroundColor: selectedStatus === status ? '#059669' : '#F3F4F6',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={{
                  fontSize: 14,
                  color: selectedStatus === status ? '#FFFFFF' : '#374151',
                  fontWeight: '500',
                  textTransform: 'capitalize',
                }}>
                  {status} {status !== 'all' && `(${orders.filter(o => o.status === status).length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 40 }}>
            Loading orders...
          </Text>
        ) : filteredOrders.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 8 }}>No orders found</Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
              {selectedStatus !== 'all' 
                ? `No ${selectedStatus} orders at the moment`
                : 'Orders will appear here when customers make purchases'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </ScrollView>
    </View>
  )
}
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blink } from '../../lib/blink';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface Address {
  id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
}

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  details: string;
  is_default: boolean;
}

export default function CheckoutScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  // New address form
  const [newAddress, setNewAddress] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    is_default: false,
  });

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const user = await blink.auth.me();
      if (!user) return;

      // Load cart items
      const cart = await blink.db.cart_items.list({
        where: { user_id: user.id },
      });

      // Get product details for cart items
      const cartWithProducts = await Promise.all(
        cart.map(async (item) => {
          const product = await blink.db.products.list({
            where: { id: item.product_id },
            limit: 1,
          });
          
          if (product.length > 0) {
            const images = product[0].images ? JSON.parse(product[0].images) : [];
            return {
              id: item.id,
              product_id: item.product_id,
              product_name: product[0].name,
              price: product[0].price,
              quantity: item.quantity,
              image_url: images[0] || '',
            };
          }
          return null;
        })
      );

      setCartItems(cartWithProducts.filter(Boolean) as CartItem[]);

      // Load addresses
      const userAddresses = await blink.db.addresses.list({
        where: { user_id: user.id },
        orderBy: { is_default: 'desc' },
      });
      setAddresses(userAddresses);
      
      // Set default address
      const defaultAddr = userAddresses.find(addr => Number(addr.is_default) > 0);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      }

      // Load payment methods
      const payments = await blink.db.payment_methods.list({
        where: { user_id: user.id, is_active: '1' },
        orderBy: { is_default: 'desc' },
      });
      setPaymentMethods(payments);
      
      // Set default payment method
      const defaultPayment = payments.find(pm => Number(pm.is_default) > 0);
      if (defaultPayment) {
        setSelectedPayment(defaultPayment.id);
      }

    } catch (error) {
      console.error('Error loading checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = promoDiscount;
    const deliveryFee = subtotal > 500 ? 0 : 50; // Free delivery above ₹500
    const tax = (subtotal - discount) * 0.18; // 18% GST
    const total = subtotal - discount + deliveryFee + tax;

    return { subtotal, discount, deliveryFee, tax, total };
  };

  const applyPromoCode = async () => {
    try {
      if (!promoCode.trim()) return;

      // Check if promo code exists
      const coupons = await blink.db.coupons.list({
        where: { code: promoCode.toUpperCase(), is_active: '1' },
        limit: 1,
      });

      if (coupons.length === 0) {
        Alert.alert('Invalid Code', 'The promo code you entered is not valid.');
        return;
      }

      const coupon = coupons[0];
      const { subtotal } = calculateTotals();
      
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
        if (coupon.max_discount_amount) {
          discount = Math.min(discount, coupon.max_discount_amount);
        }
      } else {
        discount = coupon.discount_value;
      }

      setPromoDiscount(discount);
      Alert.alert('Success', `Promo code applied! You saved ₹${discount.toFixed(0)}`);
    } catch (error) {
      console.error('Error applying promo code:', error);
      Alert.alert('Error', 'Failed to apply promo code');
    }
  };

  const handleAddAddress = async () => {
    try {
      if (!newAddress.name || !newAddress.address_line1 || !newAddress.city || !newAddress.pincode) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const user = await blink.auth.me();
      if (!user) return;

      await blink.db.addresses.create({
        id: `addr_${Date.now()}`,
        user_id: user.id,
        ...newAddress,
        is_default: newAddress.is_default ? '1' : '0',
      });

      Alert.alert('Success', 'Address added successfully');
      setShowAddressModal(false);
      setNewAddress({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        is_default: false,
      });
      loadCheckoutData();
    } catch (error) {
      console.error('Error adding address:', error);
      Alert.alert('Error', 'Failed to add address');
    }
  };

  const processPayment = async () => {
    try {
      if (!selectedAddress || !selectedPayment) {
        Alert.alert('Error', 'Please select delivery address and payment method');
        return;
      }

      setProcessing(true);
      const user = await blink.auth.me();
      if (!user) return;

      const { total } = calculateTotals();
      
      // Create order
      const orderId = `order_${Date.now()}`;
      await blink.db.orders.create({
        id: orderId,
        user_id: user.id,
        seller_id: cartItems[0]?.product_id ? 'seller_1' : 'seller_1', // Get from product
        total_amount: total.toString(),
        status: 'pending',
        payment_method: 'razorpay',
        payment_status: 'pending',
        delivery_address_id: selectedAddress,
        notes: '',
      });

      // Add order items
      for (const item of cartItems) {
        await blink.db.order_items.create({
          id: `oi_${Date.now()}_${item.id}`,
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total_price: item.price * item.quantity,
        });
      }

      // Simulate Razorpay payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update order status
      await blink.db.orders.update(orderId, {
        status: 'confirmed',
        payment_status: 'completed',
        payment_id: `razorpay_${Date.now()}`,
      });

      // Clear cart
      for (const item of cartItems) {
        await blink.db.cart_items.delete(item.id);
      }

      // Send notification
      await blink.db.notifications.create({
        id: `notif_${Date.now()}`,
        user_id: user.id,
        type: 'order',
        title: 'Order Confirmed!',
        message: `Your order #${orderId.slice(-6)} has been confirmed and will be delivered soon.`,
        data: JSON.stringify({ order_id: orderId, status: 'confirmed' }),
        is_read: '0',
      });

      // Log analytics
      await blink.analytics.log('purchase_completed', {
        order_id: orderId,
        total_amount: total,
        payment_method: 'razorpay',
        items_count: cartItems.length,
      });

      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${orderId.slice(-6)} has been confirmed. You will receive updates via notifications.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to orders screen or home
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const { subtotal, discount, deliveryFee, tax, total } = calculateTotals();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Checkout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({cartItems.length} items)</Text>
          {cartItems.map(item => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toLocaleString()} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <Text style={styles.addButton}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          
          {addresses.map(address => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress === address.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedAddress(address.id)}
            >
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedAddress === address.id && styles.radioSelected,
                ]} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressName}>{address.name}</Text>
                <Text style={styles.addressText}>
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ''}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>
                <Text style={styles.addressPhone}>📞 {address.phone}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {paymentMethods.map(method => {
            const details = JSON.parse(method.details);
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  selectedPayment === method.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    selectedPayment === method.id && styles.radioSelected,
                  ]} />
                </View>
                <View style={styles.paymentInfo}>
                  <View style={styles.paymentHeader}>
                    <Ionicons 
                      name={
                        method.type === 'card' ? 'card' :
                        method.type === 'upi' ? 'phone-portrait' :
                        method.type === 'wallet' ? 'wallet' : 'business'
                      } 
                      size={20} 
                      color="#666" 
                    />
                    <Text style={styles.paymentType}>
                      {method.type === 'card' ? 'Credit/Debit Card' :
                       method.type === 'upi' ? 'UPI' :
                       method.type === 'wallet' ? 'Wallet' : 'Net Banking'}
                    </Text>
                  </View>
                  <Text style={styles.paymentDetails}>
                    {method.type === 'card' ? `**** **** **** ${details.last4}` :
                     method.type === 'upi' ? details.vpa :
                     method.type === 'wallet' ? `${details.provider} Wallet` :
                     details.bank}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promo Code</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter promo code"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.promoButton} onPress={applyPromoCode}>
              <Text style={styles.promoButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {promoDiscount > 0 && (
            <View style={styles.promoSuccess}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.promoSuccessText}>
                Promo code applied! You saved ₹{promoDiscount.toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal ({cartItems.length} items)</Text>
            <Text style={styles.priceValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: '#4CAF50' }]}>Discount</Text>
              <Text style={[styles.priceValue, { color: '#4CAF50' }]}>-₹{discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={[styles.priceValue, deliveryFee === 0 && { color: '#4CAF50' }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax (GST 18%)</Text>
            <Text style={styles.priceValue}>₹{tax.toLocaleString()}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <View style={styles.totalContainer}>
          <Text style={styles.bottomTotal}>₹{total.toLocaleString()}</Text>
          <Text style={styles.bottomSubtext}>Total Amount</Text>
        </View>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={processPayment}
          disabled={processing}
        >
          <Text style={styles.payButtonText}>
            {processing ? 'Processing...' : 'Place Order'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity onPress={handleAddAddress}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.name}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, name: text }))}
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address Line 1 *</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.address_line1}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, address_line1: text }))}
                placeholder="House/Flat/Office No, Building Name"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address Line 2</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.address_line2}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, address_line2: text }))}
                placeholder="Area, Landmark (Optional)"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>City *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
                  placeholder="City"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>State</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAddress.state}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, state: text }))}
                  placeholder="State"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Pincode *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAddress.pincode}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, pincode: text }))}
                  placeholder="Pincode"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAddress.phone}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone: text }))}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Set as default address</Text>
              <Switch
                value={newAddress.is_default}
                onValueChange={(value) => setNewAddress(prev => ({ ...prev, is_default: value }))}
                trackColor={{ false: '#ccc', true: '#2E7D32' }}
                thumbColor={newAddress.is_default ? '#fff' : '#f4f3f4'}
              />
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
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  addButton: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addressCard: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  radioSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentCard: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  paymentDetails: {
    fontSize: 14,
    color: '#666',
  },
  promoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  promoButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  promoSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  promoSuccessText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalContainer: {
    flex: 1,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomSubtext: {
    fontSize: 14,
    color: '#666',
  },
  payButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  formRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { blink } from '../../lib/blink';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images: string[];
  };
}

interface Address {
  id: string;
  label: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  icon: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [deliverySlot, setDeliverySlot] = useState('standard');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const paymentMethods: PaymentMethod[] = [
    { id: 'razorpay_upi', type: 'UPI', name: 'UPI (Google Pay, PhonePe, Paytm)', icon: 'phone-portrait' },
    { id: 'razorpay_card', type: 'Card', name: 'Credit/Debit Card', icon: 'card' },
    { id: 'razorpay_netbanking', type: 'NetBanking', name: 'Net Banking', icon: 'globe' },
    { id: 'razorpay_wallet', type: 'Wallet', name: 'Digital Wallets', icon: 'wallet' },
    { id: 'cod', type: 'COD', name: 'Cash on Delivery', icon: 'cash' },
  ];

  const deliverySlots = [
    { id: 'standard', name: 'Standard Delivery', time: '3-5 business days', price: 0 },
    { id: 'express', name: 'Express Delivery', time: '1-2 business days', price: 99 },
    { id: 'same_day', name: 'Same Day Delivery', time: 'Within 24 hours', price: 199 },
  ];

  useEffect(() => {
    loadCheckoutData();
    setSelectedPayment(paymentMethods[0]);
  }, []);

  const loadCheckoutData = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) {
        Alert.alert('Error', 'Please login to continue');
        router.back();
        return;
      }

      // Load cart items
      const cartData = await blink.db.cartItems.list({
        where: { user_id: user.id },
      });

      // Load products for cart items
      const cartWithProducts = await Promise.all(
        cartData.map(async (item: any) => {
          const product = await blink.db.products.list({
            where: { id: item.product_id },
            limit: 1,
          });
          return {
            ...item,
            product: {
              name: product[0]?.name || 'Unknown Product',
              images: typeof product[0]?.images === 'string' 
                ? JSON.parse(product[0].images) 
                : product[0]?.images || [],
            },
          };
        })
      );

      // Load addresses
      const addressData = await blink.db.addresses.list({
        where: { user_id: user.id },
      });

      setCartItems(cartWithProducts);
      setAddresses(addressData as Address[]);
      
      // Set default address
      const defaultAddr = addressData.find((addr: any) => Number(addr.is_default) > 0);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr as Address);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout data');
      setLoading(false);
    }
  };

  const applyPromoCode = async () => {
    try {
      // Check promo codes from database
      const promoData = await blink.db.promoCodes.list({
        where: { 
          code: promoCode.toUpperCase(),
          is_active: "1"
        },
        limit: 1,
      });

      if (promoData.length > 0) {
        const promo = promoData[0] as any;
        let discountAmount = 0;

        if (promo.discount_type === 'percentage') {
          discountAmount = subtotal * (promo.discount_value / 100);
        } else {
          discountAmount = promo.discount_value;
        }

        // Apply maximum discount limit if exists
        if (promo.max_discount && discountAmount > promo.max_discount) {
          discountAmount = promo.max_discount;
        }

        setDiscount(discountAmount);
        Alert.alert('Success', `Promo code applied! ₹${discountAmount.toFixed(0)} discount`);
      } else {
        // Fallback to hardcoded promo codes
        if (promoCode.toLowerCase() === 'save10') {
          setDiscount(subtotal * 0.1);
          Alert.alert('Success', 'Promo code applied! 10% discount');
        } else if (promoCode.toLowerCase() === 'welcome20') {
          setDiscount(subtotal * 0.2);
          Alert.alert('Success', 'Promo code applied! 20% discount');
        } else {
          Alert.alert('Error', 'Invalid promo code');
        }
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      Alert.alert('Error', 'Failed to apply promo code');
    }
  };

  const processRazorpayPayment = async (orderTotal: number) => {
    try {
      // In a real app, you would integrate with Razorpay SDK
      // For now, we'll simulate the payment process
      
      Alert.alert(
        'Razorpay Payment',
        `Processing payment of ₹${orderTotal.toFixed(0)} via ${selectedPayment?.name}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Pay Now',
            onPress: () => completeOrder('razorpay_success'),
          },
        ]
      );
    } catch (error) {
      console.error('Razorpay payment error:', error);
      Alert.alert('Payment Failed', 'Please try again');
    }
  };

  const completeOrder = async (paymentStatus: string) => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      const user = await blink.auth.me();
      if (!user) return;

      const selectedSlot = deliverySlots.find(slot => slot.id === deliverySlot);
      const shippingCost = selectedSlot?.price || 0;
      const finalTotal = total + shippingCost;

      // Create order
      const order = await blink.db.orders.create({
        user_id: user.id,
        total_amount: finalTotal,
        status: paymentStatus === 'razorpay_success' ? 'confirmed' : 'pending',
        shipping_address: JSON.stringify(selectedAddress),
        payment_method: selectedPayment.type,
        payment_status: paymentStatus,
        discount_amount: discount,
        shipping_cost: shippingCost,
        delivery_slot: deliverySlot,
        special_instructions: specialInstructions,
        estimated_delivery: new Date(Date.now() + (selectedSlot?.time.includes('Same Day') ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Create order items
      for (const item of cartItems) {
        await blink.db.orderItems.create({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        });
      }

      // Create delivery tracking entry
      await blink.db.deliveryTracking.create({
        order_id: order.id,
        status: 'order_placed',
        current_location: JSON.stringify({ lat: 0, lng: 0 }),
        estimated_delivery: new Date(Date.now() + (selectedSlot?.time.includes('Same Day') ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Clear cart
      for (const item of cartItems) {
        await blink.db.cartItems.delete(item.id);
      }

      Alert.alert(
        'Order Placed Successfully!', 
        `Your order has been placed and will be delivered in ${selectedSlot?.time}. Order ID: ${order.id}`,
        [
          { text: 'Track Order', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Continue Shopping', onPress: () => router.push('/(tabs)/index') }
        ]
      );

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order');
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    const selectedSlot = deliverySlots.find(slot => slot.id === deliverySlot);
    const shippingCost = selectedSlot?.price || 0;
    const finalTotal = total + shippingCost;

    if (selectedPayment.type === 'COD') {
      completeOrder('cod_pending');
    } else {
      processRazorpayPayment(finalTotal);
    }
  };

  const renderAddressItem = ({ item }: { item: Address }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        selectedAddress?.id === item.id && styles.selectedAddressItem,
      ]}
      onPress={() => {
        setSelectedAddress(item);
        setShowAddressModal(false);
      }}
    >
      <View style={styles.addressItemContent}>
        <Text style={styles.addressItemLabel}>{item.label}</Text>
        <Text style={styles.addressItemText}>
          {item.address_line_1}
          {item.address_line_2 && `, ${item.address_line_2}`}
        </Text>
        <Text style={styles.addressItemText}>
          {item.city}, {item.state} {item.postal_code}
        </Text>
      </View>
      {Number(item.is_default) > 0 && (
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>Default</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <TouchableOpacity
      style={[
        styles.paymentItem,
        selectedPayment?.id === item.id && styles.selectedPaymentItem,
      ]}
      onPress={() => {
        setSelectedPayment(item);
        setShowPaymentModal(false);
      }}
    >
      <Ionicons name={item.icon as any} size={24} color="#2E7D32" />
      <View style={styles.paymentItemContent}>
        <Text style={styles.paymentItemName}>{item.name}</Text>
        <Text style={styles.paymentItemType}>{item.type}</Text>
      </View>
      {selectedPayment?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
      )}
    </TouchableOpacity>
  );

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const selectedSlot = deliverySlots.find(slot => slot.id === deliverySlot);
  const shipping = selectedSlot?.price || 0;
  const tax = (subtotal - discount) * 0.18;
  const total = subtotal - discount + shipping + tax;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading checkout...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, styles.activeDot]} />
          <Text style={styles.progressText}>Cart</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, styles.activeDot]} />
          <Text style={styles.progressText}>Checkout</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={styles.progressDot} />
          <Text style={styles.progressText}>Payment</Text>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary ({cartItems.length} items)</Text>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <Image 
              source={{ uri: item.product.images[0] }} 
              style={styles.itemImage} 
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>
                ₹{item.price.toLocaleString()} × {item.quantity}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              ₹{(item.price * item.quantity).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {selectedAddress ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
            <Text style={styles.addressText}>
              {selectedAddress.address_line_1}
              {selectedAddress.address_line_2 && `, ${selectedAddress.address_line_2}`}
            </Text>
            <Text style={styles.addressText}>
              {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
            </Text>
          </View>
        ) : (
          <Text style={styles.noAddressText}>No address selected</Text>
        )}
        
        <TouchableOpacity 
          style={styles.changeAddressButton}
          onPress={() => setShowAddressModal(true)}
        >
          <Text style={styles.changeAddressText}>Change Address</Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Options</Text>
        {deliverySlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.deliveryOption,
              deliverySlot === slot.id && styles.selectedDeliveryOption,
            ]}
            onPress={() => setDeliverySlot(slot.id)}
          >
            <View style={styles.deliveryOptionContent}>
              <Text style={styles.deliveryOptionName}>{slot.name}</Text>
              <Text style={styles.deliveryOptionTime}>{slot.time}</Text>
            </View>
            <Text style={styles.deliveryOptionPrice}>
              {slot.price === 0 ? 'FREE' : `₹${slot.price}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Add delivery instructions, landmark details, etc."
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {selectedPayment ? (
          <View style={styles.paymentCard}>
            <Ionicons name={selectedPayment.icon as any} size={24} color="#2E7D32" />
            <View style={styles.paymentCardContent}>
              <Text style={styles.paymentCardName}>{selectedPayment.name}</Text>
              <Text style={styles.paymentCardType}>{selectedPayment.type}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noPaymentText}>No payment method selected</Text>
        )}
        
        <TouchableOpacity 
          style={styles.changePaymentButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Text style={styles.changePaymentText}>Change Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Promo Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Promo Code</Text>
        <View style={styles.promoContainer}>
          <TextInput
            style={styles.promoInput}
            placeholder="Enter promo code (try SAVE10 or WELCOME20)"
            value={promoCode}
            onChangeText={setPromoCode}
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyPromoCode}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
        {discount > 0 && (
          <Text style={styles.discountText}>
            Discount applied: -₹{discount.toLocaleString()}
          </Text>
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
            <Text style={styles.priceLabel}>Discount</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              -₹{discount.toLocaleString()}
            </Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery ({selectedSlot?.name})</Text>
          <Text style={styles.priceValue}>
            {shipping === 0 ? 'FREE' : `₹${shipping}`}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Tax (18% GST)</Text>
          <Text style={styles.priceValue}>₹{tax.toFixed(0)}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(0)}</Text>
        </View>
      </View>

      {/* Place Order Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.placeOrderButton} onPress={placeOrder}>
          <Text style={styles.placeOrderText}>
            Place Order - ₹{total.toFixed(0)}
          </Text>
        </TouchableOpacity>
        <Text style={styles.secureText}>
          🔒 Your payment information is secure and encrypted
        </Text>
      </View>

      {/* Address Selection Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={addresses}
              renderItem={renderAddressItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
            />
            <TouchableOpacity style={styles.addNewButton}>
              <Ionicons name="add" size={20} color="#2E7D32" />
              <Text style={styles.addNewText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={paymentMethods}
              renderItem={renderPaymentMethod}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    marginBottom: 4,
  },
  activeDot: {
    backgroundColor: '#2E7D32',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noAddressText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  changeAddressButton: {
    alignSelf: 'flex-start',
  },
  changeAddressText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  deliveryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDeliveryOption: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  deliveryOptionContent: {
    flex: 1,
  },
  deliveryOptionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  deliveryOptionTime: {
    fontSize: 12,
    color: '#666',
  },
  deliveryOptionPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  instructionsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  paymentCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentCardType: {
    fontSize: 12,
    color: '#666',
  },
  noPaymentText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  changePaymentButton: {
    alignSelf: 'flex-start',
  },
  changePaymentText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  discountText: {
    marginTop: 8,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  discountValue: {
    color: '#2E7D32',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bottomContainer: {
    padding: 16,
  },
  placeOrderButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secureText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    padding: 20,
  },
  addressItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedAddressItem: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  addressItemContent: {
    flex: 1,
  },
  addressItemLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  addressItemText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPaymentItem: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  paymentItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  paymentItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentItemType: {
    fontSize: 12,
    color: '#666',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    margin: 20,
  },
  addNewText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});
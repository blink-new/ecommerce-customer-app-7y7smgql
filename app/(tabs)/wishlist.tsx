import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ShoppingCart, Share, Star, Trash2 } from 'lucide-react-native';
import { blink } from '@/lib/blink';
import { WishlistItem } from '@/types';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

export default function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadWishlistItems();
      }
    });
    return unsubscribe;
  }, []);

  const loadWishlistItems = async () => {
    try {
      // Sample wishlist items for demo
      const sampleWishlistItems: WishlistItem[] = [
        {
          id: '1',
          productId: '1',
          product: {
            id: '1',
            name: 'Wireless Bluetooth Headphones',
            description: 'Premium noise-cancelling headphones',
            price: 199.99,
            originalPrice: 249.99,
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
            category: 'Electronics',
            brand: 'AudioTech',
            rating: 4.8,
            reviewCount: 1247,
            inStock: true,
            tags: ['wireless', 'bluetooth'],
            sellerId: 'seller1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          userId: 'user1',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          productId: '3',
          product: {
            id: '3',
            name: 'Organic Cotton T-Shirt',
            description: 'Comfortable and sustainable everyday wear',
            price: 29.99,
            originalPrice: 39.99,
            images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
            category: 'Fashion',
            brand: 'EcoWear',
            rating: 4.4,
            reviewCount: 324,
            inStock: true,
            tags: ['organic', 'cotton'],
            sellerId: 'seller3',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          userId: 'user1',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          productId: '4',
          product: {
            id: '4',
            name: 'Professional Camera Lens',
            description: '85mm f/1.4 portrait lens for stunning photography',
            price: 899.99,
            images: ['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400'],
            category: 'Photography',
            brand: 'LensCraft',
            rating: 4.9,
            reviewCount: 156,
            inStock: false,
            tags: ['camera', 'lens'],
            sellerId: 'seller4',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          userId: 'user1',
          createdAt: new Date().toISOString(),
        },
      ];

      setWishlistItems(sampleWishlistItems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading wishlist items:', error);
      setLoading(false);
    }
  };

  const removeFromWishlist = (itemId: string) => {
    Alert.alert(
      'Remove from Wishlist',
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setWishlistItems(prev => prev.filter(item => item.id !== itemId));
          },
        },
      ]
    );
  };

  const addToCart = (item: WishlistItem) => {
    if (!item.product.inStock) {
      Alert.alert('Out of Stock', 'This item is currently out of stock.');
      return;
    }
    
    Alert.alert(
      'Added to Cart',
      `${item.product.name} has been added to your cart.`,
      [{ text: 'OK' }]
    );
  };

  const shareWishlist = () => {
    Alert.alert(
      'Share Wishlist',
      'Share your wishlist with friends and family!',
      [{ text: 'OK' }]
    );
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.productCard}>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeFromWishlist(item.id)}>
        <Heart size={20} color="#EF4444" fill="#EF4444" />
      </TouchableOpacity>

      <Image source={{ uri: item.product.images[0] }} style={styles.productImage} />
      
      {item.product.originalPrice && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            {Math.round(((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100)}% OFF
          </Text>
        </View>
      )}

      {!item.product.inStock && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.productBrand}>{item.product.brand}</Text>
        
        <View style={styles.ratingContainer}>
          <Star size={12} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.rating}>{item.product.rating}</Text>
          <Text style={styles.reviewCount}>({item.product.reviewCount})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.product.price}</Text>
          {item.product.originalPrice && (
            <Text style={styles.originalPrice}>${item.product.originalPrice}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            !item.product.inStock && styles.addToCartButtonDisabled
          ]}
          onPress={() => addToCart(item)}
          disabled={!item.product.inStock}
        >
          <ShoppingCart size={16} color={item.product.inStock ? "#FFFFFF" : "#9CA3AF"} />
          <Text style={[
            styles.addToCartText,
            !item.product.inStock && styles.addToCartTextDisabled
          ]}>
            {item.product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wishlist</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Heart size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Save items you love for later
          </Text>
          <TouchableOpacity style={styles.shopButton}>
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <Text style={styles.itemCount}>{wishlistItems.length} items</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={shareWishlist}>
          <Share size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Wishlist Items */}
      <FlatList
        data={wishlistItems}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  listContainer: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  addToCartText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addToCartTextDisabled: {
    color: '#9CA3AF',
  },
});
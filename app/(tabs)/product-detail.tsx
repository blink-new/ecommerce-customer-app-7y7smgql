import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { blink } from '../../lib/blink';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category_id: string;
  seller_id: string;
  stock_quantity: number;
  rating: number;
  review_count: number;
  specifications: any;
  variants: any;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string;
  review_text: string;
  images: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

interface QA {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  seller_id: string;
  answered_at: string;
}

interface FlashSale {
  id: string;
  original_price: number;
  sale_price: number;
  discount_percentage: number;
  end_time: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qa, setQA] = useState<QA[]>([]);
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: '',
  });

  useEffect(() => {
    loadProductDetails();
  }, [id]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      
      // Load product details
      const productData = await blink.db.products.list({
        where: { id: id as string },
        limit: 1,
      });
      
      if (productData.length > 0) {
        const prod = productData[0] as any;
        setProduct({
          ...prod,
          images: typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images,
          specifications: typeof prod.specifications === 'string' ? JSON.parse(prod.specifications || '{}') : prod.specifications,
          variants: typeof prod.variants === 'string' ? JSON.parse(prod.variants || '[]') : prod.variants,
        });
      }

      // Load reviews
      const reviewsData = await blink.db.productReviews.list({
        where: { product_id: id as string },
        orderBy: { created_at: 'desc' },
        limit: 10,
      });
      setReviews(reviewsData as any);

      // Load Q&A
      const qaData = await blink.db.productQa.list({
        where: { product_id: id as string },
        orderBy: { created_at: 'desc' },
        limit: 10,
      });
      setQA(qaData as any);

      // Load flash sale
      const flashSaleData = await blink.db.flashSales.list({
        where: { 
          product_id: id as string,
          is_active: "1"
        },
        limit: 1,
      });
      if (flashSaleData.length > 0) {
        setFlashSale(flashSaleData[0] as any);
      }

      // Track browsing history
      const user = await blink.auth.me();
      if (user) {
        await blink.db.browsingHistory.create({
          user_id: user.id,
          product_id: id as string,
        });
      }

    } catch (error) {
      console.error('Error loading product details:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to cart');
        return;
      }

      await blink.db.cartItems.create({
        user_id: user.id,
        product_id: product!.id,
        quantity: quantity,
        variant_id: selectedVariant?.id || null,
      });

      Alert.alert('Success', 'Item added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const addToWishlist = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to wishlist');
        return;
      }

      await blink.db.wishlistItems.create({
        user_id: user.id,
        product_id: product!.id,
      });

      Alert.alert('Success', 'Item added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      Alert.alert('Error', 'Failed to add item to wishlist');
    }
  };

  const shareProduct = async () => {
    try {
      await Share.share({
        message: `Check out this amazing product: ${product?.name} - Only ₹${product?.price} on Citymerce!`,
        url: `https://citymerce.com/product/${product?.id}`,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const submitReview = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) {
        Alert.alert('Login Required', 'Please login to write a review');
        return;
      }

      await blink.db.productReviews.create({
        product_id: product!.id,
        user_id: user.id,
        rating: newReview.rating,
        title: newReview.title,
        review_text: newReview.content,
        images: '[]',
        is_verified_purchase: false,
        helpful_count: 0,
      });

      setShowReviewModal(false);
      setNewReview({ rating: 5, title: '', content: '' });
      loadProductDetails(); // Reload to show new review
      Alert.alert('Success', 'Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const submitQuestion = async () => {
    try {
      const user = await blink.auth.me();
      if (!user) {
        Alert.alert('Login Required', 'Please login to ask a question');
        return;
      }

      await blink.db.productQa.create({
        product_id: product!.id,
        user_id: user.id,
        question: newQuestion,
        answer: null,
        seller_id: null,
        answered_at: null,
      });

      setShowQAModal(false);
      setNewQuestion('');
      loadProductDetails(); // Reload to show new question
      Alert.alert('Success', 'Question submitted successfully!');
    } catch (error) {
      console.error('Error submitting question:', error);
      Alert.alert('Error', 'Failed to submit question');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color="#FFD700"
      />
    ));
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewStars}>
          {renderStars(item.rating)}
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewTitle}>{item.title}</Text>
      <Text style={styles.reviewText}>{item.review_text}</Text>
      {item.is_verified_purchase && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
          <Text style={styles.verifiedText}>Verified Purchase</Text>
        </View>
      )}
      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.helpfulButton}>
          <Ionicons name="thumbs-up-outline" size={16} color="#666" />
          <Text style={styles.helpfulText}>Helpful ({item.helpful_count})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQA = ({ item }: { item: QA }) => (
    <View style={styles.qaItem}>
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>Q:</Text>
        <Text style={styles.questionText}>{item.question}</Text>
      </View>
      {item.answer && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>A:</Text>
          <Text style={styles.answerText}>{item.answer}</Text>
          <Text style={styles.answerDate}>
            Answered on {new Date(item.answered_at).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading product details...</Text>
      </View>
    );
  }

  const currentPrice = flashSale ? flashSale.sale_price : product.price;
  const originalPrice = flashSale ? flashSale.original_price : product.price;
  const hasDiscount = flashSale && flashSale.sale_price < flashSale.original_price;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareProduct}>
            <Ionicons name="share-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={addToWishlist} style={{ marginLeft: 16 }}>
            <Ionicons name="heart-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Images */}
      <View style={styles.imageContainer}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {product.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.productImage} />
          ))}
        </ScrollView>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{flashSale!.discount_percentage}% OFF</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {renderStars(Math.floor(product.rating))}
          </View>
          <Text style={styles.ratingText}>
            {product.rating} ({product.review_count} reviews)
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
          {hasDiscount && (
            <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString()}</Text>
          )}
        </View>

        {flashSale && (
          <View style={styles.flashSaleContainer}>
            <Text style={styles.flashSaleText}>⚡ Flash Sale ends in 23h 45m</Text>
          </View>
        )}

        <Text style={styles.description}>{product.description}</Text>

        {/* Stock Status */}
        <View style={styles.stockContainer}>
          {product.stock_quantity > 0 ? (
            <Text style={styles.inStock}>✅ In Stock ({product.stock_quantity} available)</Text>
          ) : (
            <Text style={styles.outOfStock}>❌ Out of Stock</Text>
          )}
        </View>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.variantsContainer}>
            <Text style={styles.variantsTitle}>Available Options:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {product.variants.map((variant: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.variantButton,
                    selectedVariant?.id === variant.id && styles.selectedVariant,
                  ]}
                  onPress={() => setSelectedVariant(variant)}
                >
                  <Text style={styles.variantText}>{variant.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AR Preview Button */}
        <TouchableOpacity 
          style={styles.arPreviewButton}
          onPress={() => router.push('/ar-preview')}
        >
          <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
          <Text style={styles.arPreviewText}>Try AR Preview</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.addToCartButton} onPress={addToCart}>
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNowButton}>
            <Text style={styles.buyNowText}>Buy Now</Text>
          </TouchableOpacity>
        </View>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <View style={styles.specificationsContainer}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {Object.entries(product.specifications).map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{key}:</Text>
                <Text style={styles.specValue}>{value as string}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={styles.writeReviewButton}>Write Review</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Q&A Section */}
        <View style={styles.qaSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Questions & Answers</Text>
            <TouchableOpacity onPress={() => setShowQAModal(true)}>
              <Text style={styles.askQuestionButton}>Ask Question</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={qa}
            renderItem={renderQA}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </View>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.ratingStars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setNewReview({ ...newReview, rating: i + 1 })}
                  >
                    <Ionicons
                      name={i < newReview.rating ? 'star' : 'star-outline'}
                      size={24}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.reviewTitleInput}
              placeholder="Review title"
              value={newReview.title}
              onChangeText={(text) => setNewReview({ ...newReview, title: text })}
            />

            <TextInput
              style={styles.reviewContentInput}
              placeholder="Write your review..."
              value={newReview.content}
              onChangeText={(text) => setNewReview({ ...newReview, content: text })}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Q&A Modal */}
      <Modal visible={showQAModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask a Question</Text>
              <TouchableOpacity onPress={() => setShowQAModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.questionInput}
              placeholder="What would you like to know about this product?"
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitQuestion}>
              <Text style={styles.submitButtonText}>Submit Question</Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#666',
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  flashSaleContainer: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  flashSaleText: {
    color: '#FF9800',
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  stockContainer: {
    marginBottom: 16,
  },
  inStock: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  outOfStock: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  variantsContainer: {
    marginBottom: 16,
  },
  variantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  variantButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  selectedVariant: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  variantText: {
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  quantityButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    paddingHorizontal: 16,
    fontSize: 16,
  },
  arPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  arPreviewText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buyNowButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buyNowText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  specificationsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specKey: {
    flex: 1,
    fontWeight: 'bold',
    color: '#333',
  },
  specValue: {
    flex: 2,
    color: '#666',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  writeReviewButton: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  reviewItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    color: '#999',
    fontSize: 12,
  },
  reviewTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  reviewText: {
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedText: {
    color: '#2E7D32',
    fontSize: 12,
    marginLeft: 4,
  },
  reviewActions: {
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  qaSection: {
    marginBottom: 24,
  },
  askQuestionButton: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  qaItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  questionContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  questionLabel: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 8,
  },
  questionText: {
    flex: 1,
    color: '#333',
  },
  answerContainer: {
    flexDirection: 'row',
    paddingLeft: 16,
  },
  answerLabel: {
    fontWeight: 'bold',
    color: '#FF9800',
    marginRight: 8,
  },
  answerText: {
    flex: 1,
    color: '#666',
  },
  answerDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingSelector: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  reviewTitleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  reviewContentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
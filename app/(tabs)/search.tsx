import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { blink } from '../../lib/blink';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  rating: number;
  category_id: string;
  seller_id: string;
  stock_quantity: number;
}

interface Category {
  id: string;
  name: string;
  image: string;
}

interface FilterOptions {
  minPrice: string;
  maxPrice: string;
  rating: number;
  category: string;
  sortBy: string;
  inStock: boolean;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: '',
    maxPrice: '',
    rating: 0,
    category: '',
    sortBy: 'relevance',
    inStock: false,
  });

  useEffect(() => {
    loadCategories();
    loadRecentSearches();
    loadTrendingProducts();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await blink.db.categories.list({
        limit: 10,
      });
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadRecentSearches = () => {
    // In a real app, this would come from local storage
    setRecentSearches(['iPhone', 'Laptop', 'Headphones', 'T-shirt', 'Smart Watch']);
  };

  const loadTrendingProducts = async () => {
    try {
      const productsData = await blink.db.products.list({
        orderBy: { rating: 'desc' },
        limit: 10,
      });
      
      const formattedProducts = productsData.map((product: any) => ({
        ...product,
        images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      }));
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading trending products:', error);
    }
  };

  const searchProducts = async (query: string, appliedFilters?: FilterOptions) => {
    if (!query.trim() && !appliedFilters) {
      loadTrendingProducts();
      return;
    }

    setLoading(true);
    try {
      const currentFilters = appliedFilters || filters;
      let whereClause: any = {};

      // Text search
      if (query.trim()) {
        whereClause.OR = [
          { name: { contains: query } },
          { description: { contains: query } },
        ];
      }

      // Price filters
      if (currentFilters.minPrice) {
        whereClause.price = { ...whereClause.price, gte: parseFloat(currentFilters.minPrice) };
      }
      if (currentFilters.maxPrice) {
        whereClause.price = { ...whereClause.price, lte: parseFloat(currentFilters.maxPrice) };
      }

      // Rating filter
      if (currentFilters.rating > 0) {
        whereClause.rating = { gte: currentFilters.rating };
      }

      // Category filter
      if (currentFilters.category) {
        whereClause.category_id = currentFilters.category;
      }

      // Stock filter
      if (currentFilters.inStock) {
        whereClause.stock_quantity = { gt: 0 };
      }

      // Sort options
      let orderBy: any = { created_at: 'desc' };
      switch (currentFilters.sortBy) {
        case 'price_low':
          orderBy = { price: 'asc' };
          break;
        case 'price_high':
          orderBy = { price: 'desc' };
          break;
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        case 'newest':
          orderBy = { created_at: 'desc' };
          break;
      }

      const productsData = await blink.db.products.list({
        where: whereClause,
        orderBy: orderBy,
        limit: 50,
      });
      
      const formattedProducts = productsData.map((product: any) => ({
        ...product,
        images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      }));
      
      setProducts(formattedProducts);

      // Add to recent searches if it's a text search
      if (query.trim() && !recentSearches.includes(query)) {
        setRecentSearches([query, ...recentSearches.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchProducts(query);
  };

  const handleVoiceSearch = () => {
    setIsRecording(true);
    // Simulate voice recording
    setTimeout(() => {
      setIsRecording(false);
      const voiceQuery = "wireless headphones";
      setSearchQuery(voiceQuery);
      searchProducts(voiceQuery);
      Alert.alert('Voice Search', `Searching for: "${voiceQuery}"`);
    }, 2000);
  };

  const applyFilters = () => {
    setShowFilters(false);
    searchProducts(searchQuery, filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      minPrice: '',
      maxPrice: '',
      rating: 0,
      category: '',
      sortBy: 'relevance',
      inStock: false,
    };
    setFilters(clearedFilters);
    searchProducts(searchQuery, clearedFilters);
  };

  const navigateToProduct = (productId: string) => {
    router.push(`/(tabs)/product-detail?id=${productId}`);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigateToProduct(item.id)}
    >
      <Image source={{ uri: item.images[0] }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        {item.stock_quantity === 0 && (
          <Text style={styles.outOfStock}>Out of Stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => {
        setFilters({ ...filters, category: item.id });
        searchProducts('', { ...filters, category: item.id });
      }}
    >
      <Image source={{ uri: item.image }} style={styles.categoryImage} />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStars = (rating: number, onPress?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => onPress && onPress(i + 1)}
        disabled={!onPress}
      >
        <Ionicons
          name={i < rating ? 'star' : 'star-outline'}
          size={20}
          color="#FFD700"
        />
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/citymerce-logo.jpg')}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>Search Products</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={handleVoiceSearch}>
            <Ionicons 
              name="mic" 
              size={20} 
              color={isRecording ? "#FF9800" : "#2E7D32"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Filter and Sort Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={16} color="#2E7D32" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="swap-vertical" size={16} color="#2E7D32" />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {searchQuery === '' && Object.values(filters).every(v => !v || v === 'relevance') ? (
          <>
            {/* Recent Searches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <View style={styles.recentSearches}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleSearch(search)}
                  >
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Popular Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Categories</Text>
              <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              />
            </View>

            {/* Trending Products */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Products</Text>
              <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </>
        ) : (
          <>
            {/* Search Results */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {loading ? 'Searching...' : `${products.length} results found`}
              </Text>
              <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.priceInputs}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min Price"
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceSeparator}>to</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max Price"
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                <View style={styles.ratingFilter}>
                  {renderStars(filters.rating, (rating) => 
                    setFilters({ ...filters, rating })
                  )}
                  <Text style={styles.ratingText}>& above</Text>
                </View>
              </View>

              {/* Category */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterItem,
                      filters.category === '' && styles.selectedCategoryFilter,
                    ]}
                    onPress={() => setFilters({ ...filters, category: '' })}
                  >
                    <Text style={styles.categoryFilterText}>All</Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryFilterItem,
                        filters.category === category.id && styles.selectedCategoryFilter,
                      ]}
                      onPress={() => setFilters({ ...filters, category: category.id })}
                    >
                      <Text style={styles.categoryFilterText}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                {[
                  { key: 'relevance', label: 'Relevance' },
                  { key: 'price_low', label: 'Price: Low to High' },
                  { key: 'price_high', label: 'Price: High to Low' },
                  { key: 'rating', label: 'Customer Rating' },
                  { key: 'newest', label: 'Newest First' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={styles.sortOption}
                    onPress={() => setFilters({ ...filters, sortBy: option.key })}
                  >
                    <Ionicons
                      name={filters.sortBy === option.key ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color="#2E7D32"
                    />
                    <Text style={styles.sortOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Availability */}
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.checkboxOption}
                  onPress={() => setFilters({ ...filters, inStock: !filters.inStock })}
                >
                  <Ionicons
                    name={filters.inStock ? 'checkbox' : 'checkbox-outline'}
                    size={20}
                    color="#2E7D32"
                  />
                  <Text style={styles.checkboxText}>In Stock Only</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#2E7D32',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
  },
  sortButtonText: {
    marginLeft: 4,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  recentSearches: {
    flexDirection: 'column',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentSearchText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  categoriesList: {
    paddingRight: 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '48%',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  outOfStock: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  priceSeparator: {
    marginHorizontal: 12,
    color: '#666',
  },
  ratingFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  selectedCategoryFilter: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryFilterText: {
    fontSize: 14,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sortOptionText: {
    marginLeft: 8,
    fontSize: 16,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
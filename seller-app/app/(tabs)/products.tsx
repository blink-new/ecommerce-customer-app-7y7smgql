import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import blink from '../../lib/blink'
import { Product } from '../../types/seller'

export default function Products() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  const categories = ['all', 'electronics', 'clothing', 'home', 'books', 'sports']

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadProducts()
      }
    })
    return unsubscribe
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const productList = await blink.db.products.list({
        where: { sellerId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })
      setProducts(productList)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      await blink.db.products.update(productId, {
        isActive: !currentStatus
      })
      await loadProducts()
    } catch (error) {
      Alert.alert('Error', 'Failed to update product status')
    }
  }

  const ProductCard = ({ product }: { product: Product }) => (
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
      <View style={{ flexDirection: 'row' }}>
        <Image
          source={{ uri: product.images[0] || 'https://via.placeholder.com/80' }}
          style={{ width: 80, height: 80, borderRadius: 8, marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 }}>
              {product.name}
            </Text>
            <View style={{
              backgroundColor: product.isActive ? '#D1FAE5' : '#FEE2E2',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              marginLeft: 8,
            }}>
              <Text style={{
                fontSize: 12,
                color: product.isActive ? '#059669' : '#DC2626',
                fontWeight: '500',
              }}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 8 }}>
            {product.description.length > 60 
              ? `${product.description.substring(0, 60)}...` 
              : product.description}
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>
              ${product.price.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              Stock: {product.inventory}
            </Text>
          </View>
          
          {product.inventory <= product.lowStockThreshold && (
            <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: '500' }}>
              ⚠️ Low Stock Alert
            </Text>
          )}
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#F3F4F6',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: product.isActive ? '#FEE2E2' : '#D1FAE5',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => toggleProductStatus(product.id, product.isActive)}
        >
          <Text style={{
            fontSize: 14,
            color: product.isActive ? '#DC2626' : '#059669',
            fontWeight: '500',
          }}>
            {product.isActive ? 'Deactivate' : 'Activate'}
          </Text>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 }}>
              Products
            </Text>
            <Text style={{ fontSize: 16, color: '#D1FAE5' }}>
              {products.length} products in catalog
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 14, color: '#059669', fontWeight: '600' }}>+ Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={{ padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <TextInput
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 16,
          }}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={{
                  backgroundColor: selectedCategory === category ? '#059669' : '#F3F4F6',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={{
                  fontSize: 14,
                  color: selectedCategory === category ? '#FFFFFF' : '#374151',
                  fontWeight: '500',
                  textTransform: 'capitalize',
                }}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 40 }}>
            Loading products...
          </Text>
        ) : filteredProducts.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 8 }}>No products found</Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first product to the catalog'}
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </ScrollView>
    </View>
  )
}
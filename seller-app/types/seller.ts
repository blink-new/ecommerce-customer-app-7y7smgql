export interface Seller {
  id: string
  userId: string
  businessName: string
  businessType: string
  contactEmail: string
  contactPhone: string
  address: string
  taxId?: string
  bankAccount?: string
  isVerified: boolean
  rating: number
  totalSales: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  sellerId: string
  name: string
  description: string
  category: string
  subcategory?: string
  price: number
  comparePrice?: number
  costPrice?: number
  sku: string
  barcode?: string
  images: string[]
  variants?: ProductVariant[]
  inventory: number
  lowStockThreshold: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  tags: string[]
  seoTitle?: string
  seoDescription?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  name: string
  options: { [key: string]: string }
  price: number
  sku: string
  inventory: number
  image?: string
}

export interface Order {
  id: string
  customerId: string
  sellerId: string
  items: OrderItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  shippingAddress: Address
  billingAddress: Address
  trackingNumber?: string
  courierPartner?: string
  estimatedDelivery?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  variantId?: string
  variantName?: string
  quantity: number
  price: number
  total: number
}

export interface Address {
  id: string
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  lastOrderDate?: string
  createdAt: string
}

export interface Analytics {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  conversionRate: number
  topProducts: Array<{
    productId: string
    name: string
    sales: number
    revenue: number
  }>
  salesByMonth: Array<{
    month: string
    revenue: number
    orders: number
  }>
  customerMetrics: {
    newCustomers: number
    returningCustomers: number
    customerRetentionRate: number
  }
}

export interface Promotion {
  id: string
  sellerId: string
  name: string
  type: 'percentage' | 'fixed_amount' | 'bogo' | 'free_shipping'
  value: number
  code?: string
  description: string
  startDate: string
  endDate: string
  usageLimit?: number
  usageCount: number
  minimumOrderValue?: number
  applicableProducts?: string[]
  isActive: boolean
  createdAt: string
}
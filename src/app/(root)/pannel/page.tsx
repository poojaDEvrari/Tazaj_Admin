"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  Package,
  ShoppingCart,
  Eye,
  LogOut,
  RefreshCw as Refresh,
  Download,
  Plus,
  Upload,
  BarChart3,
  TrendingUp,
  Activity,
  DollarSign,
  Bell,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
} from "lucide-react"

import { API_BASE_URL } from "../../lib/config"
import { loadProducts, loadStats, loadUsers, loadOrders, getAuthHeaders } from "../../lib/data"
import { GroceryItems } from "../../lib/grocery-items"

interface User {
  _id: string
  name: string
  email: string
  phone: string
  userType: "buyer" | "seller" | "admin"
  isActive: boolean
  createdAt: string
}

interface Product {
  _id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  quantity: number
  unit: string
  sellerId: string
  sellerName: string
  isAvailable: boolean
  createdAt: string
  discountPercent: number
  taxPercent: number
  applyVAT: boolean
}

interface Order {
  _id: string
  orderId: string
  userId: string
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  address: {
    name: string
    phone: string
    address: string
    city: string
    state: string
    pincode: string
  }
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  totalAmount: number
  specialRequests?: string
  createdAt: string
}

interface Stats {
  totalUsers: number
  totalSellers: number
  pendingRequests: number
  activeSellers: number
  totalProducts: number
  availableProducts: number
  hiddenProducts: number
  totalOrders: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    pendingRequests: 0,
    activeSellers: 0,
    totalProducts: 0,
    availableProducts: 0,
    hiddenProducts: 0,
    totalOrders: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  // Product form state
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageSelectionMode, setImageSelectionMode] = useState<"predefined" | "url" | "upload">("predefined")
  const [selectedCategory, setSelectedCategory] = useState("Fruits")
  const [selectedPredefinedItem, setSelectedPredefinedItem] = useState<string | null>(null)
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Fruits",
    quantity: "",
    unit: "kg",
    imageUrl: "",
    discountPercent: "",
    taxPercent: "",
    applyVAT: false,
  })

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const userData = localStorage.getItem("user_data")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.userType !== "admin") {
      router.push("/login")
      return
    }

    setUser(parsedUser)
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [statsData, usersData, productsData, ordersData] = await Promise.all([
        loadStats(),
        loadUsers(),
        loadProducts(),
        loadOrders(),
      ])

      if (statsData) setStats(statsData)
      setUsers(usersData)
      setProducts(productsData)
      setOrders(ordersData)
    } catch (error) {
      setError("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive }),
      })
      const data = await response.json()
      if (data.success) {
        const updatedUsers = await loadUsers()
        setUsers(updatedUsers)
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error)
    }
  }

  const toggleProductStatus = async (productId: string, isAvailable: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/items/${productId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isAvailable }),
      })
      const data = await response.json()
      if (data.success) {
        const [updatedProducts, updatedStats] = await Promise.all([loadProducts(), loadStats()])
        setProducts(updatedProducts)
        if (updatedStats) setStats(updatedStats)
      }
    } catch (error) {
      console.error("Failed to toggle product status:", error)
    }
  }

  const getPredefinedItemImageUrl = (itemName: string) => {
    return GroceryItems.getImageUrl(itemName)
  }

  const handlePredefinedImageSelect = (imageName: string) => {
    const imageUrl = getPredefinedItemImageUrl(imageName)
    setSelectedPredefinedItem(imageName)
    setProductForm({ ...productForm, name: imageName, imageUrl: imageUrl || "" })
  }

  const handleCustomUrlChange = (url: string) => {
    setSelectedPredefinedItem(null)
    setProductForm({ ...productForm, imageUrl: url })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedPredefinedItem(null)
      setSelectedImage(file)
      const previewUrl = URL.createObjectURL(file)
      setProductForm({ ...productForm, imageUrl: previewUrl })
    }
  }

  const addProduct = async () => {
    try {
      console.log("[v0] Starting addProduct function")
      console.log("[v0] Selected predefined item:", selectedPredefinedItem)
      console.log("[v0] Product form imageUrl:", productForm.imageUrl)
      console.log("[v0] Image selection mode:", imageSelectionMode)

      if (!productForm.name || !productForm.price || !productForm.quantity) {
        setError("Please fill in all required fields")
        return
      }

      let finalImageUrl = productForm.imageUrl

      if (selectedPredefinedItem !== null) {
        const predefinedUrl = getPredefinedItemImageUrl(selectedPredefinedItem)
        finalImageUrl = predefinedUrl || productForm.imageUrl
        console.log("[v0] Using predefined item URL:", finalImageUrl)
      }

      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: Number.parseFloat(productForm.price),
        category: productForm.category,
        quantity: Number.parseInt(productForm.quantity),
        unit: productForm.unit,
        imageUrl: finalImageUrl,
        isAvailable: true,
        discount: productForm.discountPercent ? Number.parseFloat(productForm.discountPercent) : 0, // Changed from discountPercent to discount
        tax: productForm.taxPercent ? Number.parseFloat(productForm.taxPercent) : 0, // Changed from taxPercent to tax
        hasVAT: productForm.applyVAT, // Changed from applyVAT to hasVAT
      }

      console.log("[v0] Final product data being sent:", productData)

      const response = await fetch(`${API_BASE_URL}/admin/items`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("[v0] Add product response:", data)

      if (data.success) {
        setProductForm({
          name: "",
          description: "",
          price: "",
          category: "Fruits",
          quantity: "",
          unit: "kg",
          imageUrl: "",
          discountPercent: "",
          taxPercent: "",
          applyVAT: false,
        })
        setSelectedImage(null)
        setSelectedPredefinedItem(null)
        setImageSelectionMode("predefined")
        setIsAddingProduct(false)

        const [updatedProducts, updatedStats] = await Promise.all([loadProducts(), loadStats()])
        setProducts(updatedProducts)
        if (updatedStats) setStats(updatedStats)
      } else {
        console.error("[v0] Add product failed:", data.message)
        setError(data.message || "Failed to add product")
      }
    } catch (error) {
      console.error("[v0] Add product error:", error)
      setError("Failed to add product. Please try again.")
    }
  }

  const downloadInvoice = async (order: Order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${order.orderId}/invoice/data`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        const invoiceData = data.invoiceData
        const invoiceHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invoice - ${order.orderId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #2d5016; }
              .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 8px; }
              .company-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
              .order-info { margin-bottom: 20px; background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .items-table th, .items-table td { border: 1px solid #bbf7d0; padding: 12px; text-align: left; }
              .items-table th { background-color: #dcfce7; color: #166534; font-weight: bold; }
              .total { text-align: right; font-weight: bold; font-size: 18px; background: #f0fdf4; padding: 15px; border-radius: 8px; }
              .special-requests { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">Tazaj</div>
              <h2>INVOICE</h2>
              <h3>Order ID: ${order.orderId}</h3>
            </div>
            <div class="order-info">
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Customer:</strong> ${invoiceData.customer.name}</p>
              <p><strong>Phone:</strong> ${invoiceData.customer.phone}</p>
              <p><strong>Email:</strong> ${invoiceData.customer.email}</p>
              <p><strong>Address:</strong> ${invoiceData.customer.address.address}, ${invoiceData.customer.address.city}, ${invoiceData.customer.address.state} - ${invoiceData.customer.address.pincode}</p>
              <p><strong>Payment Method:</strong> ${invoiceData.order.paymentMethod.toUpperCase()}</p>
              <p><strong>Payment Status:</strong> ${invoiceData.order.paymentStatus.toUpperCase()}</p>
              <p><strong>Order Status:</strong> ${invoiceData.order.orderStatus.toUpperCase()}</p>
            </div>
            ${
              order.specialRequests
                ? `
            <div class="special-requests">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">Special Requests:</h4>
              <p style="margin: 0;">${order.specialRequests}</p>
            </div>`
                : ""
            }
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.order.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>BHD ${item.price}</td>
                    <td>BHD ${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="total">
              <p>Subtotal: BHD ${invoiceData.order.subtotal?.toFixed(2) || "0.00"}</p>
              <p>Delivery Fee: BHD ${invoiceData.order.deliveryFee?.toFixed(2) || "0.00"}</p>
              <p>Tax: BHD ${invoiceData.order.taxAmount?.toFixed(2) || "0.00"}</p>
              <p style="font-size: 20px; margin-top: 10px;">Total Amount: BHD ${invoiceData.order.totalAmount.toFixed(2)}</p>
            </div>
            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for shopping with Tazaj!</p>
              <p>Fresh groceries delivered to your door.</p>
            </div>
          </body>
          </html>
        `

        const blob = new Blob([invoiceHTML], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `tazaj-invoice-${order.orderId}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Failed to download invoice:", error)
      setError("Failed to download invoice")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <div className="text-gray-600 font-medium">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tazaj Admin</h1>
                <p className="text-gray-600 text-sm">Fresh Grocery Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              >
                <Refresh className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-green-700 font-medium text-sm">Welcome, {user?.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4">
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 shadow-sm p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-xs text-green-600 font-medium">Active users</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
                  <div className="flex items-center mt-2">
                    <Activity className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-xs text-green-600 font-medium">{stats.availableProducts} available</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Available Products</CardTitle>
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Eye className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.availableProducts}</div>
                  <div className="flex items-center mt-2">
                    <CheckCircle className="h-3 w-3 text-emerald-600 mr-1" />
                    <span className="text-xs text-emerald-600 font-medium">Ready to sell</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
                  <div className="flex items-center mt-2">
                    <DollarSign className="h-3 w-3 text-orange-600 mr-1" />
                    <span className="text-xs text-orange-600 font-medium">All time</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-green-600" />
                      User Management
                    </CardTitle>
                    <CardDescription className="text-gray-600">Manage user accounts and permissions</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                          <Badge
                            variant={user.userType === "admin" ? "default" : "secondary"}
                            className={
                              user.userType === "admin"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {user.userType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${user.isActive ? "text-green-600" : "text-gray-500"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => toggleUserStatus(user._id, checked)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-green-600" />
                      Product Management
                    </CardTitle>
                    <CardDescription className="text-gray-600">Manage fresh products and inventory</CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsAddingProduct(!isAddingProduct)}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {isAddingProduct && (
                  <div className="p-6 bg-green-50 rounded-lg border border-green-200 space-y-6">
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-600 p-2 rounded-lg">
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Add New Product</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 font-medium">
                          Product Name *
                        </Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          placeholder="Enter product name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-gray-700 font-medium">
                          Price (BHD) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-gray-700 font-medium">
                          Category
                        </Label>
                        <Select
                          value={productForm.category}
                          onValueChange={(value) => {
                            setProductForm({ ...productForm, category: value })
                            setSelectedCategory(value)
                          }}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="Fruits">🍎 Fruits</SelectItem>
                            <SelectItem value="Vegetables">🥬 Vegetables</SelectItem>
                            <SelectItem value="Dairy">🥛 Dairy</SelectItem>
                            <SelectItem value="Grains">🌾 Grains</SelectItem>
                            <SelectItem value="Meat">🥩 Meat</SelectItem>
                            <SelectItem value="Seafood">🐟 Seafood</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-gray-700 font-medium">
                          Quantity *
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={productForm.quantity}
                          onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          placeholder="Enter quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-gray-700 font-medium">
                          Unit
                        </Label>
                        <Select
                          value={productForm.unit}
                          onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="g">Gram (g)</SelectItem>
                            <SelectItem value="lb">Pound (lb)</SelectItem>
                            <SelectItem value="oz">Ounce (oz)</SelectItem>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="pack">Pack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discount" className="text-gray-700 font-medium">
                          Discount (%)
                        </Label>
                        <Input
                          id="discount"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={productForm.discountPercent}
                          onChange={(e) => setProductForm({ ...productForm, discountPercent: e.target.value })}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax" className="text-gray-700 font-medium">
                          Tax (%)
                        </Label>
                        <Input
                          id="tax"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={productForm.taxPercent}
                          onChange={(e) => setProductForm({ ...productForm, taxPercent: e.target.value })}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center space-x-3 pt-6">
                        <Switch
                          id="vat"
                          checked={productForm.applyVAT}
                          onCheckedChange={(checked) => setProductForm({ ...productForm, applyVAT: checked })}
                          className="data-[state=checked]:bg-green-600"
                        />
                        <Label htmlFor="vat" className="text-gray-700 font-medium">
                          Apply VAT
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-gray-700 font-medium">Product Image</Label>

                      {/* Image selection mode tabs */}
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={imageSelectionMode === "predefined" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setImageSelectionMode("predefined")}
                          className={
                            imageSelectionMode === "predefined"
                              ? "bg-green-600 hover:bg-green-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }
                        >
                          Choose from Gallery
                        </Button>
                        <Button
                          type="button"
                          variant={imageSelectionMode === "url" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setImageSelectionMode("url")}
                          className={
                            imageSelectionMode === "url"
                              ? "bg-green-600 hover:bg-green-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }
                        >
                          Custom URL
                        </Button>
                        
                      </div>

                      {/* Predefined images selection */}
                      {imageSelectionMode === "predefined" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-4 bg-white rounded-lg border border-gray-200">
                            {GroceryItems.getItemsByCategory(selectedCategory).map((imageName) => {
                              const imageUrl = GroceryItems.getImageUrl(imageName)
                              const isSelected = selectedPredefinedItem === imageName

                              return (
                                <div
                                  key={imageName}
                                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:shadow-md ${
                                    isSelected
                                      ? "border-green-500 ring-2 ring-green-200"
                                      : "border-gray-200 hover:border-green-300"
                                  }`}
                                  onClick={() => handlePredefinedImageSelect(imageName)}
                                >
                                  <img
                                    src={imageUrl || "/placeholder.svg"}
                                    alt={imageName}
                                    className="w-full h-16 object-cover"
                                  />
                                  <div className="p-2 bg-gray-50">
                                    <div className="text-xs text-gray-700 text-center truncate font-medium">
                                      {imageName}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom URL input */}
                      {imageSelectionMode === "url" && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                            value={productForm.imageUrl}
                            onChange={(e) => handleCustomUrlChange(e.target.value)}
                            className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                          />
                        </div>
                      )}

                      {/* File upload */}
                      {imageSelectionMode === "upload" && (
                        <div className="flex items-center space-x-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="border-gray-300 focus:border-green-500 focus:ring-green-500 file:bg-green-600 file:text-white file:border-0 file:rounded file:px-4 file:py-2 file:mr-4"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      )}

                      {/* Image preview */}
                      {productForm.imageUrl && (
                        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
                          <div className="text-gray-700 text-sm font-medium">Preview:</div>
                          <img
                            src={productForm.imageUrl || "/placeholder.svg"}
                            alt="Product preview"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              console.log("[v0] Image failed to load:", productForm.imageUrl)
                              e.currentTarget.src = "/placeholder.svg?key=35rlu"
                            }}
                          />
                          <div className="text-xs text-gray-500 max-w-xs truncate">{productForm.imageUrl}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-700 font-medium">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                        placeholder="Enter product description..."
                        rows={3}
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button onClick={addProduct} className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingProduct(false)
                          setSelectedImage(null)
                          setSelectedPredefinedItem(null)
                          setImageSelectionMode("predefined")
                          setProductForm({
                            name: "",
                            description: "",
                            price: "",
                            category: "Fruits",
                            quantity: "",
                            unit: "kg",
                            imageUrl: "",
                            discountPercent: "",
                            taxPercent: "",
                            applyVAT: false,
                          })
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.description}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium text-green-600">BHD {product.price}</span> | {product.quantity}{" "}
                            {product.unit} | {product.category}
                          </div>
                          <div className="text-sm text-gray-500">Seller: {product.sellerName}</div>
                          <div className="text-sm text-gray-500">
                            Discount: {product.discountPercent}% | Tax: {product.taxPercent}% | VAT:{" "}
                            {product.applyVAT ? "Yes" : "No"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={product.isAvailable ? "default" : "secondary"}
                          className={
                            product.isAvailable ? "bg-green-600 hover:bg-green-700" : "bg-gray-100 text-gray-700"
                          }
                        >
                          {product.isAvailable ? "Visible" : "Hidden"}
                        </Badge>
                        <Switch
                          checked={product.isAvailable}
                          onCheckedChange={(checked) => toggleProductStatus(product._id, checked)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2 text-green-600" />
                      Order Management
                    </CardTitle>
                    <CardDescription className="text-gray-600">View and manage customer orders</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order._id} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Order #{order.orderId}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant="outline"
                            className={`border-gray-300 ${
                              order.orderStatus === "delivered"
                                ? "text-green-700 bg-green-50 border-green-200"
                                : order.orderStatus === "pending"
                                  ? "text-orange-700 bg-orange-50 border-orange-200"
                                  : "text-gray-700 bg-gray-50"
                            }`}
                          >
                            {order.orderStatus === "delivered" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {order.orderStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {order.orderStatus === "shipped" && <Truck className="h-3 w-3 mr-1" />}
                            {order.orderStatus}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`border-gray-300 ${
                              order.paymentStatus === "paid"
                                ? "text-green-700 bg-green-50 border-green-200"
                                : order.paymentStatus === "pending"
                                  ? "text-orange-700 bg-orange-50 border-orange-200"
                                  : "text-red-700 bg-red-50 border-red-200"
                            }`}
                          >
                            {order.paymentStatus}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => downloadInvoice(order)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Invoice
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                          <div className="text-gray-500 font-medium">Customer Information</div>
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="font-medium text-gray-900">{order.address.name}</div>
                            <div className="text-gray-600">{order.address.phone}</div>
                            <div className="text-gray-600 text-xs mt-1">
                              {order.address.address}, {order.address.city}, {order.address.state} -{" "}
                              {order.address.pincode}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-gray-500 font-medium">Order Summary</div>
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Amount:</span>
                              <span className="font-semibold text-gray-900">BHD {order.totalAmount}</span>
                            </div>
                            <div className="text-gray-600 text-sm mt-1">
                              Payment: {order.paymentMethod.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {order.specialRequests && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Bell className="h-4 w-4 text-amber-600" />
                            <div className="text-amber-800 text-sm font-medium">Special Requests:</div>
                          </div>
                          <div className="text-amber-700 text-sm">{order.specialRequests}</div>
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="text-gray-500 text-sm font-medium mb-3">Order Items</div>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="divide-y divide-gray-100">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex justify-between items-center p-3">
                                <div className="flex items-center space-x-3">
                                  <div className="bg-green-100 p-1 rounded">
                                    <Package className="h-3 w-3 text-green-600" />
                                  </div>
                                  <span className="text-gray-900 font-medium">{item.name}</span>
                                  <span className="text-gray-500 text-sm">× {item.quantity}</span>
                                </div>
                                <span className="font-medium text-gray-900">
                                  BHD {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

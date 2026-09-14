import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { tableService } from '@/services/tableService'
import { categoryService } from '@/services/categoryService'
import { productService } from '@/services/productService'
import { orderService } from '@/services/orderService'
import { ToastContainer, LoadingSpinner, EmptyState, Modal } from '@/components/ui'
import { formatCurrency, removeVietnameseTones } from '@/utils/helpers'
import type { CoffeeTable, Category, Product, Order, OrderItem, CartItem, ToppingOption } from '@/types'
import {
  Coffee,
  Minus,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  X,
  ShoppingBag,
  Check,
  Percent,
  Printer,
  Search,
  Edit3,
  Sparkles,
} from 'lucide-react'
import { printerService } from '@/services/printerService'
import { printReceipt, type PrintableOrder } from '@/utils/printer'

const ICE_OPTIONS = [
  '100% Đá (chuẩn)',
  'Ít đá (50%)',
  'Không đá',
  'Đá riêng',
  'Uống nóng',
]

const SUGAR_OPTIONS = [
  '100% Đường (chuẩn)',
  '70% Đường',
  '50% Đường (ít ngọt)',
  '30% Đường',
  'Không đường',
]

const EXTRA_OPTIONS = [
  'Nhiều sữa',
  'Ít sữa',
  'Đậm cà phê',
  'Mang về (ly giấy)',
  'Uống tại bàn',
]

const POPULAR_TOPPINGS: ToppingOption[] = [
  { id: 'pop-tc-den', name: 'Trân châu đen', price: 5000 },
  { id: 'pop-tc-trang', name: 'Trân châu trắng', price: 5000 },
  { id: 'pop-kem-cheese', name: 'Kem cheese', price: 5000 },
  { id: 'pop-nha-dam', name: 'Nha đam', price: 5000 },
  { id: 'pop-hat-chia', name: 'Hạt chia', price: 5000 },
  { id: 'pop-thach-dao', name: 'Thạch đào', price: 5000 },
]

export default function PosPage() {
  const { user, profile } = useAuth()
  const { toasts, success, error: toastError, removeToast } = useToast()

  const [tables, setTables] = useState<CoffeeTable[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Current POS state
  const [selectedTable, setSelectedTable] = useState<CoffeeTable | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [showPayment, setShowPayment] = useState(false)
  const [openOrders, setOpenOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Edit Item on Bill (sửa giá, thêm topping, ghi chú) Modal state
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null)
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0)
  const [editBasePrice, setEditBasePrice] = useState<number>(0)
  const [selectedIce, setSelectedIce] = useState<string>('100% Đá (chuẩn)')
  const [selectedSugar, setSelectedSugar] = useState<string>('100% Đường (chuẩn)')
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([])
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [customNoteText, setCustomNoteText] = useState<string>('')
  const [editQuantity, setEditQuantity] = useState<number>(1)

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [t, c, p, openOrds] = await Promise.all([
        tableService.getActive(),
        categoryService.getActive(),
        productService.getActive(),
        orderService.getAll({ status: 'OPEN' }),
      ])
      setTables(t)
      setCategories(c)
      setProducts(p)
      setOpenOrders(openOrds)
    } catch {
      toastError('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Select table → load or create order
  const handleSelectTable = async (table: CoffeeTable) => {
    if (table.status === 'DISABLED') return
    setSelectedTable(table)
    setActiveCategory('all')
    setSearchQuery('')

    try {
      const existing = await orderService.getOpenByTable(table.id)
      if (existing) {
        setCurrentOrder(existing)
        setOrderItems(existing.items ?? [])
        setDiscount(existing.discount)
      } else {
        // Create new order
        if (!user) return
        const newOrder = await orderService.create(table.id, user.id)
        setCurrentOrder(newOrder)
        setOrderItems([])
        setDiscount(0)
        // Refresh tables
        loadData()
      }
    } catch {
      toastError('Không thể mở order')
    }
  }

  // Dynamic available toppings (DB products + popular fallbacks)
  const availableToppings: ToppingOption[] = (() => {
    const toppingCat = categories.find((c) => c.name.toLowerCase().includes('topping'))
    const dbTops: ToppingOption[] = products
      .filter((p) => toppingCat && p.category_id === toppingCat.id)
      .map((p) => ({ id: p.id, name: p.name, price: p.price }))

    const result = [...dbTops]
    POPULAR_TOPPINGS.forEach((pop) => {
      if (!result.some((t) => t.name.toLowerCase() === pop.name.toLowerCase())) {
        result.push(pop)
      }
    })
    return result
  })()

  // Identify drinks vs snacks
  const isDrinkCategory = (categoryId?: string) => {
    if (!categoryId) return true
    const cat = categories.find((c) => c.id === categoryId)
    if (!cat) return true
    const name = cat.name.toLowerCase()
    return !name.includes('vặt') && !name.includes('nhanh') && !name.includes('topping')
  }

  // Build clean note text
  const buildNote = (
    ice: string,
    sugar: string,
    extras: string[],
    toppings: ToppingOption[],
    customText: string,
    isDrink: boolean
  ): string => {
    const parts: string[] = []

    if (toppings.length > 0) {
      const topStr = toppings.map((t) => `+ ${t.name} (+${formatCurrency(t.price)})`).join(', ')
      parts.push(topStr)
    }

    if (isDrink) {
      if (ice && !ice.startsWith('100% Đá')) {
        parts.push(ice)
      }
      if (sugar && !sugar.startsWith('100% Đường')) {
        parts.push(sugar)
      }
    }

    if (extras.length > 0) {
      parts.push(extras.join(', '))
    }

    if (customText.trim()) {
      parts.push(customText.trim())
    }

    return parts.join(' • ')
  }

  // Open modal to edit existing item directly from the bill
  const handleOpenEditModal = (item: OrderItem) => {
    const prod = products.find((p) => p.id === item.product_id)
    const base = prod?.price ?? item.unit_price

    setEditingOrderItem(item)
    setEditBasePrice(base)
    setEditUnitPrice(item.unit_price)
    setEditQuantity(item.quantity)

    const note = item.note || ''
    const foundIce = ICE_OPTIONS.find((o) => note.includes(o)) || '100% Đá (chuẩn)'
    const foundSugar = SUGAR_OPTIONS.find((o) => note.includes(o)) || '100% Đường (chuẩn)'
    const foundExtras = EXTRA_OPTIONS.filter((e) => note.includes(e))
    const foundToppings = availableToppings.filter((t) => note.toLowerCase().includes(t.name.toLowerCase()))

    setSelectedIce(foundIce)
    setSelectedSugar(foundSugar)
    setSelectedExtras(foundExtras)
    setSelectedToppings(foundToppings)

    let cleaned = note
    ICE_OPTIONS.forEach((o) => { cleaned = cleaned.replace(o, '') })
    SUGAR_OPTIONS.forEach((o) => { cleaned = cleaned.replace(o, '') })
    EXTRA_OPTIONS.forEach((o) => { cleaned = cleaned.replace(o, '') })
    availableToppings.forEach((t) => {
      cleaned = cleaned.replace(new RegExp(`\\+?\\s*${t.name}\\s*(\\(\\+[^)]+\\))?`, 'gi'), '')
    })
    cleaned = cleaned.replace(/[•|]/g, ' ').replace(/\s+/g, ' ').trim()
    setCustomNoteText(cleaned)
  }

  // Toggle topping in edit modal: updates toppings and adjusts editUnitPrice
  const toggleTopping = (top: ToppingOption) => {
    const isSelected = selectedToppings.some(
      (t) => t.name.toLowerCase() === top.name.toLowerCase()
    )
    if (isSelected) {
      setSelectedToppings(selectedToppings.filter((t) => t.name.toLowerCase() !== top.name.toLowerCase()))
      setEditUnitPrice((prev) => Math.max(0, prev - top.price))
    } else {
      setSelectedToppings([...selectedToppings, top])
      setEditUnitPrice((prev) => prev + top.price)
    }
  }

  const toggleExtra = (extra: string) => {
    if (selectedExtras.includes(extra)) {
      setSelectedExtras(selectedExtras.filter((e) => e !== extra))
    } else {
      setSelectedExtras([...selectedExtras, extra])
    }
  }

  // Save changes from modal back to order item on the bill
  const handleSaveItemEdit = async () => {
    if (!editingOrderItem || !currentOrder) return

    const prod = products.find((p) => p.id === editingOrderItem.product_id)
    const isDrink = isDrinkCategory(prod?.category_id)
    const note = buildNote(
      selectedIce,
      selectedSugar,
      selectedExtras,
      selectedToppings,
      customNoteText,
      isDrink
    )

    try {
      await orderService.updateItemDetails(
        editingOrderItem.id,
        currentOrder.id,
        note,
        editUnitPrice,
        editQuantity,
        editingOrderItem.product_name
      )
      success(`Đã cập nhật ${editingOrderItem.product_name}`)

      const updated = await orderService.getOpenByTable(currentOrder.table_id)
      if (updated) {
        setCurrentOrder(updated)
        setOrderItems(updated.items ?? [])
      }

      setEditingOrderItem(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu món'
      toastError(msg)
    }
  }

  // Add product to order directly (standard 1 qty)
  const handleAddProduct = async (product: Product) => {
    if (!selectedTable) {
      toastError('Vui lòng bấm chọn một bàn (ở cột bên trái) trước khi chọn món!')
      return
    }
    if (!currentOrder) {
      toastError('Chưa mở được order cho bàn này, vui lòng bấm chọn lại bàn')
      return
    }
    try {
      const cartItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: 1,
        subtotal: product.price,
      }
      await orderService.addItem(currentOrder.id, cartItem)
      // Refresh order
      const updated = await orderService.getOpenByTable(currentOrder.table_id)
      if (updated) {
        setCurrentOrder(updated)
        setOrderItems(updated.items ?? [])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm món'
      toastError(msg)
    }
  }

  // Update quantity
  const handleQtyChange = async (item: OrderItem, delta: number) => {
    if (!currentOrder) return
    const newQty = item.quantity + delta
    try {
      await orderService.updateItemQuantity(item.id, currentOrder.id, newQty)
      const updated = await orderService.getOpenByTable(currentOrder.table_id)
      if (updated) {
        setCurrentOrder(updated)
        setOrderItems(updated.items ?? [])
      }
    } catch {
      toastError('Không thể cập nhật')
    }
  }

  // Remove item
  const handleRemoveItem = async (item: OrderItem) => {
    if (!currentOrder) return
    try {
      await orderService.removeItem(item.id, currentOrder.id)
      const updated = await orderService.getOpenByTable(currentOrder.table_id)
      if (updated) {
        setCurrentOrder(updated)
        setOrderItems(updated.items ?? [])
      }
    } catch {
      toastError('Không thể xóa món')
    }
  }

  // Set discount
  const handleSetDiscount = async () => {
    if (!currentOrder) return
    try {
      await orderService.setDiscount(currentOrder.id, discount)
      const updated = await orderService.getOpenByTable(currentOrder.table_id)
      if (updated) {
        setCurrentOrder(updated)
      }
      success('Đã áp dụng giảm giá')
    } catch {
      toastError('Lỗi khi giảm giá')
    }
  }

  // Pay
  const handlePay = async (method: 'CASH' | 'BANK_TRANSFER') => {
    if (!currentOrder || !user) return
    try {
      await orderService.pay(currentOrder.id, method, currentOrder.total, user.id)

      const paidData: PrintableOrder = {
        invoice_number: currentOrder.invoice_number,
        table_name: selectedTable?.name ?? 'Mang về',
        cashier_name: profile?.name ?? 'Thu ngân',
        created_at: new Date().toISOString(),
        items: orderItems.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
          note: i.note,
        })),
        subtotal: currentOrder.subtotal,
        discount: currentOrder.discount,
        total: currentOrder.total,
        payment_method: method,
      }

      setShowPayment(false)

      const settings = printerService.getSettings()
      if (settings.autoPrintOnPay) {
        printReceipt(paidData, settings, false)
      }

      // Trở về thẳng màn hình chọn bàn, không hiện thông báo/modal rườm rà
      setSelectedTable(null)
      setCurrentOrder(null)
      setOrderItems([])
      setDiscount(0)
      loadData()
      success(`Đã thanh toán ${formatCurrency(paidData.total)} (${method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})`)
    } catch {
      toastError('Thanh toán thất bại')
    }
  }

  // Print pre-bill (phiếu tạm tính)
  const handlePrintPreBill = () => {
    if (!currentOrder || orderItems.length === 0) return
    const preBillData: PrintableOrder = {
      invoice_number: currentOrder.invoice_number,
      table_name: selectedTable?.name ?? 'Mang về',
      cashier_name: profile?.name ?? 'Thu ngân',
      created_at: new Date().toISOString(),
      items: orderItems.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        note: i.note,
      })),
      subtotal,
      discount,
      total,
    }
    printReceipt(preBillData, undefined, true)
    success('Đã gửi lệnh in tạm tính')
  }

  // Back to table selection (bấm dấu X)
  const handleBack = async () => {
    if (currentOrder && selectedTable) {
      if (orderItems.length === 0) {
        // Bấm nhầm vào bàn trống thực sự không có khách -> tự động thành bàn trống
        try {
          await orderService.cancelEmptyOrder(currentOrder.id, selectedTable.id)
        } catch {
          // ignore
        }
      } else {
        // Nếu có món trong đó -> hiển thị tổng số món và tổng tiền cần thanh toán
        const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0)
        success(`${selectedTable.name}: ${totalQty} món • ${formatCurrency(total)} (chưa thanh toán)`)
      }
    }

    setSelectedTable(null)
    setCurrentOrder(null)
    setOrderItems([])
    setDiscount(0)
    setSearchQuery('')
    setActiveCategory('all')
    loadData()
  }

  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const qNoTone = removeVietnameseTones(q)
      const name = p.name.toLowerCase()
      const nameNoTone = removeVietnameseTones(p.name)

      const matchesSearch = name.includes(q) || nameNoTone.includes(qNoTone)
      if (!matchesSearch) return false

      if (activeCategory !== 'all' && p.category_id !== activeCategory) {
        return false
      }
      return true
    }

    return activeCategory === 'all' ? true : p.category_id === activeCategory
  })

  const subtotal = currentOrder?.subtotal ?? orderItems.reduce((s, i) => s + i.subtotal, 0)
  const total = Math.max(0, subtotal - discount)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <LoadingSpinner size={32} />
      </div>
    )
  }

  // ── TABLE SELECTION VIEW ────────────────────────────────────
  if (!selectedTable) {
    return (
      <div className="animate-fade-in">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <div className="page-header">
          <h1 className="page-title">Bán hàng</h1>
          <p className="page-subtitle">Chọn bàn để bắt đầu order</p>
        </div>

        <div
          className="stagger-children"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          {tables.map((table) => {
            const openOrder = openOrders.find((o) => o.table_id === table.id)
            const openItemsCount = (openOrder?.items ?? []).reduce((s, i) => s + i.quantity, 0)
            const openTotalAmount = openOrder?.total ?? 0

            return (
              <button
                key={table.id}
                onClick={() => handleSelectTable(table)}
                disabled={table.status === 'DISABLED'}
                className={`glass-card ${
                  table.status === 'AVAILABLE'
                    ? 'table-available'
                    : table.status === 'OCCUPIED'
                    ? 'table-occupied'
                    : 'table-disabled'
                }`}
                style={{
                  padding: '1.25rem',
                  cursor: table.status === 'DISABLED' ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  border: '2px solid',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {table.name}
                </div>
                <span
                  className={`badge ${
                    table.status === 'AVAILABLE'
                      ? 'badge-success'
                      : table.status === 'OCCUPIED'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                >
                  {table.status === 'AVAILABLE' ? 'Trống' : table.status === 'OCCUPIED' ? 'Đang dùng' : 'Tắt'}
                </span>

                {/* Show items count and total amount if occupied */}
                {table.status === 'OCCUPIED' && openItemsCount > 0 && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.375rem',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--color-coffee-300)',
                    }}
                  >
                    {openItemsCount} món • {formatCurrency(openTotalAmount)}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {tables.length === 0 && (
          <EmptyState
            icon={<Coffee size={48} />}
            title="Chưa có bàn nào"
            description="Vui lòng thêm bàn trong mục Quản lý bàn"
          />
        )}
      </div>
    )
  }

  // ── ORDER VIEW ──────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 3rem)' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* LEFT: Menu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleBack}>
            <X size={18} />
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            {selectedTable.name}
          </h2>
          <span className="badge badge-coffee">{currentOrder?.invoice_number}</span>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm món nhanh (ví dụ: bạc xỉu, đen, trà đào...)"
            style={{
              paddingLeft: '2.25rem',
              paddingRight: searchQuery ? '2.25rem' : '0.875rem',
              height: 38,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-lg)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn-ghost"
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                color: 'var(--color-text-muted)',
              }}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => setActiveCategory('all')}
            className={`btn btn-sm ${activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn btn-sm ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '0.75rem',
            alignContent: 'start',
          }}
        >
          {filteredProducts.map((product) => {
            const cat = categories.find((c) => c.id === product.category_id)
            return (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="glass-card"
                style={{
                  padding: '0.875rem 1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  border: '1px solid var(--color-border)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{product.name}</div>
                {cat && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    {cat.name}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', color: 'var(--color-coffee-400)', fontWeight: 600, marginTop: 'auto' }}>
                  {formatCurrency(product.price)}
                </div>
              </button>
            )
          })}

          {filteredProducts.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '2rem' }}>
              <Coffee size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: 600, margin: 0 }}>
                {searchQuery
                  ? `Không tìm thấy món nào với từ khóa "${searchQuery}"`
                  : 'Chưa có món trong danh mục này'}
              </p>
              {searchQuery && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {activeCategory !== 'all' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveCategory('all')}>
                      Tìm trong tất cả danh mục
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setSearchQuery('')}>
                    Xóa tìm kiếm
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Order Summary */}
      <div
        className="glass-card"
        style={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingBag size={18} color="var(--color-coffee-400)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Đơn hàng</h3>
          <span className="badge badge-coffee" style={{ marginLeft: 'auto' }}>
            {orderItems.length} món
          </span>
        </div>

        {/* Order Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {orderItems.length === 0 ? (
            <EmptyState title="Chưa có món" description="Chọn món từ menu bên trái" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    padding: '0.75rem',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border-light)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Clickable row to open edit modal */}
                  <div
                    onClick={() => handleOpenEditModal(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                    title="Bấm vào đây để sửa giá, thêm topping hoặc ghi chú"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.product_name}</span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--color-coffee-300)',
                            background: 'rgba(217, 119, 6, 0.12)',
                            padding: '0.125rem 0.375rem',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.125rem',
                            fontWeight: 500,
                          }}
                        >
                          <Edit3 size={11} /> Sửa giá / Note
                        </span>
                      </div>

                      {/* Linked Note & Toppings */}
                      {item.note && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-coffee-300)',
                            background: 'rgba(217, 119, 6, 0.08)',
                            border: '1px dashed rgba(217, 119, 6, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.2rem 0.4rem',
                            marginTop: '0.25rem',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.note}
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        {formatCurrency(item.unit_price)}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', color: 'var(--color-coffee-300)', flexShrink: 0 }}>
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>

                  {/* Quantity and Delete row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.25rem',
                      borderTop: '1px dashed var(--color-border-light)',
                      paddingTop: '0.375rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleQtyChange(item, -1)} style={{ padding: '0.25rem' }}>
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleQtyChange(item, 1)} style={{ padding: '0.25rem' }}>
                        <Plus size={14} />
                      </button>
                    </div>

                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveItem(item)} style={{ padding: '0.25rem', color: 'var(--color-danger)' }} title="Xóa món">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Percent size={14} color="var(--color-text-muted)" />
            <input
              className="input"
              type="number"
              placeholder="Giảm giá (VNĐ)"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              style={{ flex: 1, fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleSetDiscount}>
              <Check size={14} />
            </button>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Tạm tính</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                <span>Giảm giá</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <hr className="divider" style={{ margin: '0.25rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem' }}>
              <span>Tổng cộng</span>
              <span style={{ color: 'var(--color-coffee-300)' }}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Pre-bill & Pay Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {printerService.getSettings().printPreBill && orderItems.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrintPreBill}
                title="In phiếu tạm tính cho khách kiểm tra trước khi tính tiền"
              >
                <Printer size={16} />
                In tạm tính (Pre-bill)
              </button>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={orderItems.length === 0}
              onClick={() => setShowPayment(true)}
            >
              Thanh toán
            </button>
          </div>
        </div>
      </div>

      {/* Edit Order Item (Sửa giá, thêm topping, ghi chú) Modal */}
      <Modal
        open={!!editingOrderItem}
        onClose={() => setEditingOrderItem(null)}
        title={`Chỉnh sửa món: ${editingOrderItem?.product_name ?? ''}`}
        wide
      >
        {editingOrderItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top row: Price editing */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>
                  💰 Đơn giá món (VNĐ)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Giá gốc niêm yết: {formatCurrency(editBasePrice)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  className="input"
                  value={editUnitPrice || ''}
                  onChange={(e) => setEditUnitPrice(Number(e.target.value) || 0)}
                  placeholder="Nhập giá mới..."
                  style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-coffee-300)', flex: 1 }}
                />
                {editUnitPrice !== editBasePrice && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const toppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0)
                      setEditUnitPrice(editBasePrice + toppingTotal)
                    }}
                    title="Khôi phục giá chuẩn theo menu + topping"
                  >
                    Đặt lại giá
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                * Bạn có thể tự do gõ sửa giá này (giảm giá riêng hoặc phụ thu cho khách).
              </div>
            </div>

            {/* Topping selection */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                <Sparkles size={16} color="var(--color-coffee-400)" />
                <span>Chọn thêm Topping (+ tiền tự động)</span>
                {selectedToppings.length > 0 && (
                  <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                    Đã chọn {selectedToppings.length}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                {availableToppings.map((top) => {
                  const isSelected = selectedToppings.some(
                    (t) => t.name.toLowerCase() === top.name.toLowerCase()
                  )
                  return (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => toggleTopping(top)}
                      style={{
                        padding: '0.625rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '2px solid var(--color-coffee-400)'
                          : '1px solid var(--color-border)',
                        background: isSelected ? 'rgba(217, 119, 6, 0.15)' : 'var(--color-surface)',
                        color: isSelected ? 'var(--color-coffee-200)' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500 }}>
                          {top.name}
                        </span>
                        {isSelected && <Check size={14} color="var(--color-coffee-400)" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isSelected ? 'var(--color-coffee-300)' : 'var(--color-text-muted)' }}>
                        +{formatCurrency(top.price)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Ice & Sugar (for drinks) */}
            {(() => {
              const prod = products.find((p) => p.id === editingOrderItem.product_id)
              const isDrink = isDrinkCategory(prod?.category_id)
              if (!isDrink) return null
              return (
                <>
                  {/* Mức đá */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🧊 Mức đá
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {ICE_OPTIONS.map((ice) => {
                        const isSelected = selectedIce === ice
                        return (
                          <button
                            key={ice}
                            type="button"
                            onClick={() => setSelectedIce(ice)}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.8125rem' }}
                          >
                            {ice}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Mức đường */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      🍬 Mức đường / ngọt
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {SUGAR_OPTIONS.map((sugar) => {
                        const isSelected = selectedSugar === sugar
                        return (
                          <button
                            key={sugar}
                            type="button"
                            onClick={() => setSelectedSugar(sugar)}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.8125rem' }}
                          >
                            {sugar}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Yêu cầu thêm */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      ⚡ Yêu cầu thêm
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {EXTRA_OPTIONS.map((extra) => {
                        const isSelected = selectedExtras.includes(extra)
                        return (
                          <button
                            key={extra}
                            type="button"
                            onClick={() => toggleExtra(extra)}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.8125rem' }}
                          >
                            {isSelected && <Check size={12} style={{ marginRight: 4 }} />}
                            {extra}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Custom Note input */}
            <div>
              <label className="input-label" style={{ marginBottom: '0.375rem' }}>
                📝 Ghi chú riêng cho món (nếu có)
              </label>
              <input
                type="text"
                className="input"
                value={customNoteText}
                onChange={(e) => setCustomNoteText(e.target.value)}
                placeholder="Ví dụ: ít ngọt hơn nữa, cho 2 ống hút, mang đi ngay..."
                style={{ fontSize: '0.875rem', width: '100%' }}
              />
            </div>

            {/* Quantity Selector & Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Số lượng</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                    style={{ width: 28, height: 28, padding: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                    {editQuantity}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditQuantity(editQuantity + 1)}
                    style={{ width: 28, height: 28, padding: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Price Calculation preview */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Đơn giá: {formatCurrency(editUnitPrice)} x {editQuantity}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-coffee-300)' }}>
                  {formatCurrency(editUnitPrice * editQuantity)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setEditingOrderItem(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleSaveItemEdit}
              >
                Lưu thay đổi ({formatCurrency(editUnitPrice * editQuantity)})
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Chọn phương thức thanh toán">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Tổng thanh toán</div>
            <div className="stat-value">{formatCurrency(total)}</div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => handlePay('CASH')}
            style={{ width: '100%' }}
          >
            <Banknote size={20} />
            Tiền mặt
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => handlePay('BANK_TRANSFER')}
            style={{ width: '100%' }}
          >
            <CreditCard size={20} />
            Chuyển khoản
          </button>
        </div>
      </Modal>
    </div>
  )
}

import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, CartItem, PaymentMethod } from '@/types'
import { generateInvoiceNumber } from '@/utils/helpers'

export const orderService = {
  async getOpenByTable(tableId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*), table:tables(*), cashier:profiles!cashier_id(*)')
      .eq('table_id', tableId)
      .eq('status', 'OPEN')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  async create(tableId: string, cashierId: string): Promise<Order> {
    // Ensure profile exists for cashier
    const { data: prof } = await supabase.from('profiles').select('id').eq('id', cashierId).maybeSingle()
    if (!prof) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        await supabase.from('profiles').upsert({
          id: cashierId,
          name: authData.user.email?.split('@')[0] || 'Chủ quán',
          email: authData.user.email,
          role: 'OWNER',
          status: 'active',
        })
      }
    }

    // Get today's order count for invoice number
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
    
    const invoiceNumber = generateInvoiceNumber((count ?? 0) + 1)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        table_id: tableId,
        cashier_id: cashierId,
        invoice_number: invoiceNumber,
        status: 'OPEN',
        subtotal: 0,
        discount: 0,
        total: 0,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Set table to OCCUPIED
    await supabase.from('tables').update({ status: 'OCCUPIED' }).eq('id', tableId)

    return data
  },

  async cancelEmptyOrder(orderId: string, tableId: string): Promise<void> {
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)

    if (!count || count === 0) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) {
        await supabase
          .from('orders')
          .update({ status: 'CANCELLED', cancel_reason: 'Bàn trống không gọi món' })
          .eq('id', orderId)
      }
      await supabase.from('tables').update({ status: 'AVAILABLE' }).eq('id', tableId)
    }
  },

  async addItem(orderId: string, item: CartItem): Promise<OrderItem> {
    // Check if item with SAME product_id AND SAME note already exists in order
    const { data: existingList } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .eq('product_id', item.product_id)

    const existing = existingList && existingList.length > 0
      ? existingList.find((e) => (e.note || '') === (item.note || ''))
      : null

    if (existing) {
      const newQty = existing.quantity + item.quantity
      const { data, error } = await supabase
        .from('order_items')
        .update({ quantity: newQty, subtotal: newQty * existing.unit_price })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      await this.recalculate(orderId)
      return data
    }

    const insertPayload: Record<string, unknown> = {
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }
    if (item.note) {
      insertPayload.note = item.note
    }

    let { data, error } = await supabase
      .from('order_items')
      .insert(insertPayload)
      .select()
      .single()

    // Fallback nếu cột note chưa được tạo trong CSDL Supabase
    if (error && error.message && error.message.includes('note')) {
      delete insertPayload.note
      if (item.note) {
        insertPayload.product_name = `${item.product_name} (${item.note})`
      }
      const retry = await supabase
        .from('order_items')
        .insert(insertPayload)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw new Error(error.message)
    await this.recalculate(orderId)
    return data
  },

  async updateItemDetails(
    itemId: string,
    orderId: string,
    note: string,
    unitPrice: number,
    quantity: number,
    baseProductName?: string
  ): Promise<void> {
    const subtotal = unitPrice * quantity
    const updatePayload: Record<string, unknown> = {
      unit_price: unitPrice,
      quantity,
      subtotal,
      note,
    }

    let { error } = await supabase
      .from('order_items')
      .update(updatePayload)
      .eq('id', itemId)

    if (error && error.message && error.message.includes('note')) {
      delete updatePayload.note
      if (baseProductName) {
        updatePayload.product_name = note ? `${baseProductName} (${note})` : baseProductName
      }
      const { error: retryErr } = await supabase
        .from('order_items')
        .update(updatePayload)
        .eq('id', itemId)
      if (retryErr) throw new Error(retryErr.message)
    } else if (error) {
      throw new Error(error.message)
    }

    await this.recalculate(orderId)
  },

  async updateItemQuantity(itemId: string, orderId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(itemId, orderId)
      return
    }
    const { data: item } = await supabase
      .from('order_items')
      .select('unit_price')
      .eq('id', itemId)
      .single()
    if (!item) return

    await supabase
      .from('order_items')
      .update({ quantity, subtotal: quantity * item.unit_price })
      .eq('id', itemId)
    await this.recalculate(orderId)
  },

  async removeItem(itemId: string, orderId: string): Promise<void> {
    await supabase.from('order_items').delete().eq('id', itemId)
    await this.recalculate(orderId)
  },

  async recalculate(orderId: string): Promise<void> {
    const { data: items } = await supabase
      .from('order_items')
      .select('subtotal')
      .eq('order_id', orderId)

    const subtotal = (items ?? []).reduce((sum, i) => sum + i.subtotal, 0)
    const { data: order } = await supabase
      .from('orders')
      .select('discount')
      .eq('id', orderId)
      .single()

    const discount = order?.discount ?? 0
    const total = Math.max(0, subtotal - discount)

    await supabase
      .from('orders')
      .update({ subtotal, total })
      .eq('id', orderId)
  },

  async setDiscount(orderId: string, discount: number): Promise<void> {
    const { data: order } = await supabase
      .from('orders')
      .select('subtotal')
      .eq('id', orderId)
      .single()
    if (!order) return

    const total = Math.max(0, order.subtotal - discount)
    await supabase
      .from('orders')
      .update({ discount, total })
      .eq('id', orderId)
  },

  async pay(orderId: string, method: PaymentMethod, amount: number, cashierId: string): Promise<void> {
    const now = new Date().toISOString()

    // Create payment record
    const { error: payErr } = await supabase.from('payments').insert({
      order_id: orderId,
      method,
      amount,
      paid_at: now,
      cashier_id: cashierId,
    })
    if (payErr) throw new Error(payErr.message)

    // Update order status
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'PAID', paid_at: now })
      .eq('id', orderId)
      .select('table_id')
      .single()
    if (orderErr) throw new Error(orderErr.message)

    // Release table
    if (order?.table_id) {
      await supabase.from('tables').update({ status: 'AVAILABLE' }).eq('id', order.table_id)
    }
  },

  async getAll(filters?: {
    status?: string
    from?: string
    to?: string
    search?: string
  }): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*, items:order_items(*), table:tables(*), cashier:profiles!cashier_id(*), payment:payments(*)')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.from) query = query.gte('created_at', filters.from)
    if (filters?.to) query = query.lte('created_at', filters.to)
    if (filters?.search) query = query.ilike('invoice_number', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*), table:tables(*), cashier:profiles!cashier_id(*), payment:payments(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  async cancel(orderId: string, userId: string, reason: string): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        cancelled_at: now,
        cancelled_by: userId,
        cancel_reason: reason,
      })
      .eq('id', orderId)
    if (error) throw new Error(error.message)

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'CANCEL_ORDER',
      entity_type: 'order',
      entity_id: orderId,
      details: reason,
    })
  },
}

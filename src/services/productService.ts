import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getActive(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('category_id', categoryId)
      .eq('active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async create(product: { name: string; price: number; category_id: string }): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, updates: Partial<Pick<Product, 'name' | 'price' | 'category_id' | 'active'>>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
}

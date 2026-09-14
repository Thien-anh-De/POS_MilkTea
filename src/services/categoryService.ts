import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getActive(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async create(name: string, sort_order: number): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, sort_order, active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, updates: Partial<Pick<Category, 'name' | 'sort_order' | 'active'>>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },
}

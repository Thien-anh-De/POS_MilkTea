import { supabase } from '@/lib/supabase'
import type { CoffeeTable, TableStatus } from '@/types'

export const tableService = {
  async getAll(): Promise<CoffeeTable[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getActive(): Promise<CoffeeTable[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async create(name: string, sort_order: number): Promise<CoffeeTable> {
    const { data, error } = await supabase
      .from('tables')
      .insert({ name, sort_order, status: 'AVAILABLE' as TableStatus, active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, updates: Partial<Pick<CoffeeTable, 'name' | 'sort_order' | 'active' | 'status'>>): Promise<CoffeeTable> {
    const { data, error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async setStatus(id: string, status: TableStatus): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}

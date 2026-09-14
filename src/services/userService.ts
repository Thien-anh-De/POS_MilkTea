import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export const userService = {
  async getAll(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async update(id: string, updates: Partial<Pick<Profile, 'name' | 'role' | 'status'>>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async createUser(email: string, password: string, name: string, role: UserRole): Promise<void> {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (password.length < 6) {
      throw new Error('Mật khẩu phải có tối thiểu 6 ký tự')
    }

    // Use isolated client with persistSession: false so admin session is never disturbed
    const authClient = (await import('@supabase/supabase-js')).createClient(
      (await import('@/lib/supabase')).supabaseUrl,
      (await import('@/lib/supabase')).supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )

    const { data, error } = await authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: cleanName, role },
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || error.status === 429) {
        throw new Error(
          'Đã vượt quá giới hạn gửi mail của Supabase. Vui lòng vào Supabase Dashboard tắt tính năng "Confirm email" để tạo nhân viên không bị giới hạn.'
        )
      }
      if (msg.includes('invalid') || msg.includes('validate email')) {
        throw new Error(
          'Email không hợp lệ hoặc đuôi tên miền chưa có máy chủ thư. Hãy tắt "Confirm email" trong Supabase Dashboard để dùng email nội bộ.'
        )
      }
      if (msg.includes('already registered') || msg.includes('already exists')) {
        throw new Error('Email này đã được sử dụng cho một tài khoản khác.')
      }
      throw new Error(error.message)
    }

    // Upsert profile entry safely
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        role,
        status: 'active',
      })
      if (profileErr) throw new Error(profileErr.message)
    }
  },

  async toggleStatus(id: string, currentStatus: string): Promise<void> {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deleteUser(id: string): Promise<void> {
    // 1. Thử gọi hàm RPC delete_user (xóa cả auth và profiles)
    const { error: rpcError } = await supabase.rpc('delete_user', { user_id: id })
    if (!rpcError) return

    // 2. Nếu chưa chạy migration 003_delete_user.sql, fallback xóa trực tiếp profile
    const msg = (rpcError.message || '').toLowerCase()
    if (msg.includes('function') && (msg.includes('delete_user') || msg.includes('does not exist'))) {
      const { error: delError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (delError) {
        if (delError.message.includes('violates foreign key constraint') || delError.code === '23503') {
          throw new Error('Nhân viên này đã có lịch sử tạo hóa đơn. Hãy dùng chức năng "Khóa tài khoản" để bảo toàn dữ liệu sổ sách!')
        }
        throw new Error(delError.message)
      }
      return
    }

    throw new Error(rpcError.message)
  },
}

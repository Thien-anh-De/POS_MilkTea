import { createClient } from '@supabase/supabase-js'

// Vite embed env vars at BUILD TIME. Cloudflare Workers vars are runtime-only
// and NOT available to Vite. We fallback to hardcoded values for production.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kxxswuuiqlmiynwyklxd.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Dz7r4uQeb9rSCSkuq6Idmw_vtykVqzC'

export const supabaseUrl = SUPABASE_URL
export const supabaseAnonKey = SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Coffee, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setRetrying(false)
    setLoading(true)

    const { error: err } = await signIn(email, password)
    if (err) {
      if (err.toLowerCase().includes('invalid login credentials')) {
        setError('Email hoặc mật khẩu không chính xác')
      } else if (err === 'Failed to fetch' || err.toLowerCase().includes('network')) {
        setError('Không thể kết nối tới máy chủ. Kiểm tra mạng và thử lại.')
      } else {
        setError(err)
      }
      setRetrying(false)
      setLoading(false)
      return
    }

    navigate('/pos')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(163, 83, 34, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 50%, rgba(212, 132, 50, 0.1) 0%, transparent 50%),
          var(--color-surface)
        `,
        padding: '1rem',
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-2xl)',
              background: 'linear-gradient(135deg, var(--color-coffee-500), var(--color-coffee-800))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 0 30px rgba(212, 132, 50, 0.3)',
            }}
          >
            <Coffee size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--color-coffee-300)' }}>
            Molliee
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Point of Sale System
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.625rem 0.875rem',
                  marginBottom: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (retrying ? 'Đang thử lại...' : 'Đang đăng nhập...') : 'Đăng nhập'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
          © 2026 Molliee · POS System
        </p>
      </div>
    </div>
  )
}

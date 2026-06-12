import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(localStorage.getItem('solis_user_role') || 'business')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error.message)
      } else {
        localStorage.setItem('solis_user_role', role)
        navigate(role === 'customer' ? '/explore' : '/dashboard')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '80px', width: 'auto' }} />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <div style={{
          display: 'flex', borderRadius: '10px', overflow: 'hidden',
          border: '1px solid var(--border)', marginBottom: '20px',
        }}>
          <button
            type="button"
            onClick={() => setRole('business')}
            style={{
              flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: role === 'business' ? 'var(--accent, #f59e0b)' : 'transparent',
              color: role === 'business' ? '#fff' : 'var(--text-secondary, #6b7280)',
            }}
          >
            I'm a Business
          </button>
          <button
            type="button"
            onClick={() => setRole('customer')}
            style={{
              flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              borderLeft: '1px solid var(--border)',
              background: role === 'customer' ? 'var(--accent, #f59e0b)' : 'transparent',
              color: role === 'customer' ? '#fff' : 'var(--text-secondary, #6b7280)',
            }}
          >
            I'm a Customer
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '12px' }}>
            <Link to="/forgot-password" className="auth-link" style={{ fontSize: '13px' }}>Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  )
}

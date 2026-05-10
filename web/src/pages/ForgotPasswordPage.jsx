import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)

    if (isSupabaseConfigured() && supabase) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <img src="/logo-full.png" alt="Solis OS" style={{ height: '130px', width: 'auto' }} />
          </div>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📧</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a password reset link to<br />
            <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: '1.5' }}>
            Click the link in the email to reset your password. If you don't see it, check your spam folder.
          </p>
          <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-block', marginTop: '24px', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '130px', width: 'auto' }} />
        </div>
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

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
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

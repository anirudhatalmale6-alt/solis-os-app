import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('email')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    try {
      const resp = await fetch('https://api.solis-os.com/api/pos/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error || 'No account found with this email.'); setLoading(false); return }
      setStep('code')
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!code) { setError('Please enter the code from your email'); return }
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const resp = await fetch('https://api.solis-os.com/api/pos/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), code, newPassword }),
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error || 'Reset failed. Check your code and try again.'); setLoading(false); return }
      setSuccess(true)
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <img src="/logo-full.png" alt="Solis OS" style={{ height: '80px', width: 'auto' }} />
          </div>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="auth-title">Password Reset!</h1>
          <p className="auth-subtitle">Your password has been changed successfully. You can now sign in with your new password.</p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '24px', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/logo-full.png" alt="Solis OS" style={{ height: '80px', width: 'auto' }} />
          </div>
          <h1 className="auth-title">Enter Reset Code</h1>
          <p className="auth-subtitle">
            We sent a code to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Reset Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter the code from your email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
            Didn't get the code? Check your spam folder or{' '}
            <span className="auth-link" style={{ cursor: 'pointer' }} onClick={() => { setStep('email'); setError('') }}>try again</span>
          </p>

          <p className="auth-footer">
            Remember your password?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '80px', width: 'auto' }} />
        </div>
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset code</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSendCode}>
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
            {loading ? 'Sending...' : 'Send Reset Code'}
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

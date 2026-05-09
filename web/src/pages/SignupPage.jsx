import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
    try {
      const result = await signUp(email, password, fullName)
      if (result.error) {
        setError(result.error.message)
      } else {
        navigate('/verify-email')
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
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '130px', width: 'auto' }} />
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start managing your business in minutes</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ marginTop: '3px', accentColor: 'var(--accent)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="agree-terms" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.4' }}>
              I agree to the{' '}
              <span className="auth-link" onClick={(e) => { e.preventDefault(); setShowTerms(true) }} style={{ cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span className="auth-link" onClick={(e) => { e.preventDefault(); setShowTerms(true) }} style={{ cursor: 'pointer' }}>Privacy Policy</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !agreeTerms} style={{ opacity: agreeTerms ? 1 : 0.6 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowTerms(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '32px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '20px' }}>Terms of Service & Privacy Policy</h2>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>1. Terms of Service</h3>
              <p>By creating an account on Solis OS, you agree to these terms. Solis OS provides business management tools including booking, scheduling, customer management, and analytics.</p>
              <p style={{ marginTop: '8px' }}>You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the service for any unlawful purposes.</p>

              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>2. Data Usage</h3>
              <p>We collect and store information you provide (name, email, business details) to operate the service. Your business data (bookings, customers, services) is stored securely and belongs to you.</p>

              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>3. Privacy Policy</h3>
              <p>We do not sell your personal information to third parties. We use industry-standard security measures to protect your data. You may request deletion of your account and data at any time.</p>

              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>4. Service Availability</h3>
              <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We reserve the right to modify or discontinue features with reasonable notice.</p>

              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>5. Intellectual Property</h3>
              <p>Solis OS and its original content, features, and functionality are owned by Solis OS. Your business data remains your property.</p>

              <h3 style={{ color: 'var(--text)', fontSize: '15px', margin: '16px 0 8px' }}>6. Limitation of Liability</h3>
              <p>Solis OS shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

              <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>Last updated: May 2026. All rights reserved.</p>
            </div>

            <button className="btn btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={() => { setAgreeTerms(true); setShowTerms(false) }}>
              I Agree
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

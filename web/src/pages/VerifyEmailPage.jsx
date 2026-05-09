import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function VerifyEmailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const inputRefs = useRef([])

  const storedCode = useRef('')

  useEffect(() => {
    const digits = Math.floor(100000 + Math.random() * 900000).toString()
    storedCode.current = digits
    const data = JSON.parse(localStorage.getItem('solis_os_data') || '{}')
    if (user) {
      data._verification = { userId: user.id, code: digits, created: Date.now() }
      localStorage.setItem('solis_os_data', JSON.stringify(data))
    }
  }, [user])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleInput = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[index] = value.slice(-1)
    setCode(next)
    setError('')
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const entered = code.join('')
    if (entered.length !== 6) {
      setError('Please enter the full 6-digit code')
      return
    }

    setVerifying(true)
    await new Promise(r => setTimeout(r, 1000))

    const data = JSON.parse(localStorage.getItem('solis_os_data') || '{}')
    const v = data._verification
    if (v && v.code === entered && v.userId === user?.id) {
      const userIdx = (data.users || []).findIndex(u => u.id === user.id)
      if (userIdx !== -1) {
        data.users[userIdx].email_verified = true
        data.users[userIdx].verified_at = new Date().toISOString()
      }
      delete data._verification
      localStorage.setItem('solis_os_data', JSON.stringify(data))

      setVerified(true)
      setVerifying(false)
      setTimeout(() => {
        window.location.href = '/setup'
      }, 1500)
    } else {
      setError('Invalid code. Please try again.')
      setVerifying(false)
    }
  }

  const handleResend = () => {
    const digits = Math.floor(100000 + Math.random() * 900000).toString()
    storedCode.current = digits
    const data = JSON.parse(localStorage.getItem('solis_os_data') || '{}')
    if (user) {
      data._verification = { userId: user.id, code: digits, created: Date.now() }
      localStorage.setItem('solis_os_data', JSON.stringify(data))
    }
    setResent(true)
    setCountdown(30)
    setCode(['', '', '', '', '', ''])
    setError('')
    inputRefs.current[0]?.focus()
    setTimeout(() => setResent(false), 3000)
  }

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
    : ''

  if (verified) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✓</div>
          <h1 className="auth-title">Email Verified</h1>
          <p className="auth-subtitle">Redirecting to setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '130px', width: 'auto' }} />
        </div>

        <div style={{ fontSize: '48px', marginBottom: '8px' }}>✉️</div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a 6-digit verification code to<br />
          <strong style={{ color: 'var(--text)' }}>{maskedEmail}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center',
          margin: '24px 0'
        }}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: '48px', height: '56px',
                textAlign: 'center', fontSize: '22px', fontWeight: '600',
                background: 'var(--bg-input)',
                border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
        }}>
          Preview mode — your code is: <strong style={{ color: 'var(--accent)', letterSpacing: '2px' }}>{storedCode.current}</strong>
          <br />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Real email verification activates when the backend is connected.
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleVerify}
          disabled={verifying || code.join('').length !== 6}
          style={{ width: '100%' }}
        >
          {verifying ? 'Verifying...' : 'Verify Email'}
        </button>

        <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Didn't receive the code?{' '}
          {countdown > 0 ? (
            <span>Resend in {countdown}s</span>
          ) : (
            <span
              className="auth-link"
              onClick={handleResend}
              style={{ cursor: 'pointer' }}
            >
              Resend Code
            </span>
          )}
        </p>

        {resent && (
          <p style={{ fontSize: '13px', color: 'var(--accent)' }}>
            New code sent!
          </p>
        )}
      </div>
    </div>
  )
}

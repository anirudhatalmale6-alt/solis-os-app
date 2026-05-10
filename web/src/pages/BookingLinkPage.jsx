import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

export default function BookingLinkPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  useEffect(() => {
    if (!user) return
    dataStore.getBusiness(user.id).then(biz => {
      if (biz) setBusiness(biz)
    })
  }, [user])

  const bookingUrl = business ? `${window.location.origin}/book/${business.slug || business.id}` : ''
  const shareText = business ? `Book your appointment with ${business.name} here: ${bookingUrl}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      const input = document.querySelector('.booking-link-input')
      if (input) {
        input.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    })
  }

  const showFeedback = (msg) => {
    setShareFeedback(msg)
    setTimeout(() => setShareFeedback(''), 2500)
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  const handleSocialCopy = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      showFeedback('Link copied! Paste it in your Instagram, TikTok, or Facebook bio.')
    }).catch(() => {
      showFeedback('Could not copy. Use the Copy Link button above.')
    })
  }

  const handleGoogleBusiness = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      showFeedback('Link copied! Go to business.google.com and paste it in your booking URL field.')
    }).catch(() => {
      showFeedback('Could not copy. Use the Copy Link button above.')
    })
  }

  const handleQRCode = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bookingUrl)}`
    window.open(qrUrl, '_blank')
    showFeedback('QR code opened! Right-click to save the image.')
  }

  if (!business) return null

  const shareItemStyle = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
    border: '1px solid var(--border)', transition: 'background 0.15s',
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Booking Link</h1>
        <p className="page-subtitle">Share your booking page with customers</p>
      </div>

      <div className="card">
        <div className="card-title">Your Public Booking Link</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Anyone with this link can view your services and book an appointment online.
        </p>
        <div className="booking-link-box">
          <input type="text" className="booking-link-input" value={bookingUrl} readOnly />
          <button className="btn btn-primary btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Share Your Link</div>
        {shareFeedback && (
          <div style={{ fontSize: '13px', color: 'var(--green, #22c55e)', marginBottom: '12px', padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
            {shareFeedback}
          </div>
        )}
        <div style={{ display: 'grid', gap: '10px', marginTop: '8px' }}>
          <div style={shareItemStyle} onClick={handleWhatsApp} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 211, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>&#128172;</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>WhatsApp & SMS</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Open WhatsApp with your booking link ready to send</div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '20px' }}>&rsaquo;</div>
          </div>

          <div style={shareItemStyle} onClick={handleSocialCopy} onMouseEnter={e => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>&#128247;</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Instagram & Social Media</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Copy link to paste in your bio</div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '20px' }}>&rsaquo;</div>
          </div>

          <div style={shareItemStyle} onClick={handleGoogleBusiness} onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>&#127760;</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Google Business Profile</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Copy link for your Google Business booking URL</div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '20px' }}>&rsaquo;</div>
          </div>

          <div style={shareItemStyle} onClick={handleQRCode} onMouseEnter={e => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>&#9783;</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>QR Code</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Generate a QR code for your counter, cards, or flyers</div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '20px' }}>&rsaquo;</div>
          </div>
        </div>
      </div>
    </>
  )
}

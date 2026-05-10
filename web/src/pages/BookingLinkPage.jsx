import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

export default function BookingLinkPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    dataStore.getBusiness(user.id).then(biz => {
      if (biz) setBusiness(biz)
    })
  }, [user])

  const bookingUrl = business ? `${window.location.origin}/book/${business.slug || business.id}` : ''

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

  if (!business) return null

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
        <div className="card-title">Where to Share</div>
        <div style={{ display: 'grid', gap: '16px', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>&#128241;</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>WhatsApp & SMS</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Send the link directly to customers or add it to your WhatsApp status</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>&#128247;</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Instagram & Social Media</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add the link to your bio so followers can book directly</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>&#127760;</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Google Business Profile</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add as your booking URL so customers find you on Google</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>&#9783;</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>QR Code & Print</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Print as a QR code for your counter, business cards, or flyers</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

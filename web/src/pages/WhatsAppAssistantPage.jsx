import { useEffect, useState } from 'react'
import { MessageCircle, Wifi, WifiOff, Loader2, QrCode } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const WA_API = import.meta.env.VITE_WHATSAPP_API_URL || 'https://wa.solis-os.com'

export default function WhatsAppAssistantPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [waStatus, setWaStatus] = useState('disconnected')
  const [waQR, setWaQR] = useState(null)
  const [waPhone, setWaPhone] = useState(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const waPollingRef = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        try {
          const resp = await fetch(`${WA_API}/api/whatsapp/status/${biz.id}`)
          if (resp.ok) {
            const data = await resp.json()
            setWaStatus(data.status || 'disconnected')
            if (data.phone) setWaPhone(data.phone)
          }
        } catch {}
      }
    }
    load()
  }, [user])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">AI WhatsApp Assistant</h1>
        <p className="page-subtitle">Connect your WhatsApp Business number to get a 24/7 AI receptionist</p>
      </div>

      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={18} style={{ color: '#25D366' }} />
            <span>Connection Status</span>
          </div>
          <span className={`badge ${waStatus === 'connected' ? 'badge-green' : waStatus === 'connecting' || waStatus === 'waiting_scan' ? 'badge-amber' : 'badge-red'}`}>
            {waStatus === 'connected' ? 'Connected' : waStatus === 'waiting_scan' ? 'Scan QR' : waStatus === 'connecting' || waStatus === 'reconnecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Connect your WhatsApp Business number to get a 24/7 AI receptionist. It handles customer messages, confirms bookings, answers questions about your services and prices — automatically.
        </p>

        {waStatus === 'connected' && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Wifi size={18} style={{ color: '#25D366' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#25D366' }}>WhatsApp Connected</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {waPhone && <>Connected as <b>+{waPhone}</b>. </>}
              Your AI assistant is active and handling customer messages automatically.
            </div>
          </div>
        )}

        {waStatus === 'waiting_scan' && waQR && (
          <div style={{
            padding: '24px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <QrCode size={18} style={{ color: 'var(--accent-bright)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Scan with WhatsApp</span>
            </div>
            <img src={waQR} alt="QR Code" style={{
              width: '220px', height: '220px', margin: '0 auto', borderRadius: '12px',
              background: '#fff', padding: '8px',
            }} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.6' }}>
              Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device
            </div>
          </div>
        )}

        {(waStatus === 'connecting' || waStatus === 'reconnecting') && !waQR && (
          <div style={{
            padding: '24px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: '16px',
          }}>
            <Loader2 size={24} style={{ color: 'var(--accent-bright)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Preparing connection...
            </div>
          </div>
        )}

        {waStatus === 'disconnected' && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <WifiOff size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Not connected</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Connect your WhatsApp to activate the AI assistant. Your customers will be able to book appointments and get answers via WhatsApp automatically.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {waStatus !== 'connected' && (
            <button
              className="btn btn-primary btn-sm"
              disabled={waConnecting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366' }}
              onClick={async () => {
                if (!business) return
                setWaConnecting(true)
                setWaQR(null)
                try {
                  await fetch(`${WA_API}/api/whatsapp/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: business.id }),
                  })
                  setWaStatus('connecting')
                  const pollQR = setInterval(async () => {
                    try {
                      const resp = await fetch(`${WA_API}/api/whatsapp/qr/${business.id}`)
                      if (resp.ok) {
                        const data = await resp.json()
                        if (data.qr) {
                          setWaQR(data.qr)
                          setWaStatus('waiting_scan')
                        }
                        if (data.status === 'connected') {
                          clearInterval(pollQR)
                          setWaQR(null)
                          setWaStatus('connected')
                          setWaConnecting(false)
                          const statusResp = await fetch(`${WA_API}/api/whatsapp/status/${business.id}`)
                          if (statusResp.ok) {
                            const sd = await statusResp.json()
                            if (sd.phone) setWaPhone(sd.phone)
                          }
                        }
                      }
                    } catch {}
                  }, 2000)
                  waPollingRef[1](pollQR)
                  setTimeout(() => {
                    clearInterval(pollQR)
                    setWaConnecting(false)
                  }, 120000)
                } catch {
                  setWaConnecting(false)
                }
              }}
            >
              <MessageCircle size={14} />
              {waConnecting ? 'Connecting...' : 'Connect WhatsApp'}
            </button>
          )}
          {waStatus === 'connected' && (
            <button
              className="btn btn-danger btn-sm"
              style={{ opacity: 0.8 }}
              onClick={async () => {
                if (!business || !confirm('Disconnect your WhatsApp AI assistant?')) return
                try {
                  await fetch(`${WA_API}/api/whatsapp/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: business.id }),
                  })
                  setWaStatus('disconnected')
                  setWaPhone(null)
                } catch {}
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        <div style={{
          marginTop: '20px', padding: '14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg)', border: '1px solid var(--border)',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>What your AI assistant does:</div>
          <div>&#x2705; Greets customers and answers questions about your services</div>
          <div>&#x2705; Shares your prices, opening hours, and location</div>
          <div>&#x2705; Helps customers book appointments</div>
          <div>&#x2705; Works 24/7 in multiple languages</div>
        </div>
      </div>
    </>
  )
}

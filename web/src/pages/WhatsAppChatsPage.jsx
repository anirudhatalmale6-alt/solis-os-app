import { useEffect, useState, useRef } from 'react'
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Send,
  User,
  Bot,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const WA_API = import.meta.env.VITE_WHATSAPP_API_URL || 'https://wa.solis-os.com'

function formatPhone(phone) {
  const clean = phone.replace(/\D/g, '')
  if (clean.length >= 10) {
    return '+' + clean.slice(0, -10) + ' ' + clean.slice(-10, -7) + ' ' + clean.slice(-7, -4) + ' ' + clean.slice(-4)
  }
  return '+' + clean
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 2) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatTimestamp(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function WhatsAppChatsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendText, setSendText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        await fetchMessages(biz.id)
      }
      setLoading(false)
    }
    loadData()
  }, [user])

  const fetchMessages = async (bizId) => {
    try {
      const resp = await fetch(`${WA_API}/api/whatsapp/messages/${bizId}`)
      if (resp.ok) {
        const data = await resp.json()
        setMessages(data)
      }
    } catch {}
  }

  useEffect(() => {
    if (!business) return
    const interval = setInterval(() => fetchMessages(business.id), 15000)
    return () => clearInterval(interval)
  }, [business])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedPhone, messages])

  const conversations = {}
  messages.forEach(m => {
    if (!conversations[m.phone]) {
      conversations[m.phone] = { phone: m.phone, messages: [], lastMessage: null, lastTime: null }
    }
    conversations[m.phone].messages.push(m)
    if (!conversations[m.phone].lastTime || m.timestamp > conversations[m.phone].lastTime) {
      conversations[m.phone].lastMessage = m
      conversations[m.phone].lastTime = m.timestamp
    }
  })

  const sortedConversations = Object.values(conversations)
    .sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''))
    .filter(c => {
      if (!searchQuery) return true
      return c.phone.includes(searchQuery) ||
        c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    })

  const selectedConv = selectedPhone ? conversations[selectedPhone] : null

  const handleSend = async () => {
    if (!sendText.trim() || !selectedPhone || !business || sending) return
    setSending(true)
    try {
      await fetch(`${WA_API}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          phone: selectedPhone,
          message: sendText.trim(),
        }),
      })
      setSendText('')
      setTimeout(() => fetchMessages(business.id), 1000)
    } catch {}
    setSending(false)
  }

  const totalConversations = sortedConversations.length
  const todayMessages = messages.filter(m => {
    const today = new Date().toISOString().split('T')[0]
    return m.timestamp?.startsWith(today)
  }).length

  if (selectedPhone && selectedConv) {
    return (
      <>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSelectedPhone(null)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title" style={{ marginBottom: '2px' }}>{formatPhone(selectedPhone)}</h1>
              <p className="page-subtitle">{selectedConv.messages.length} messages</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ height: '500px', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedConv.messages.map((m, i) => (
              <div
                key={m.id || i}
                style={{
                  display: 'flex',
                  justifyContent: m.direction === 'inbound' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: m.direction === 'outbound' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  background: m.direction === 'outbound' ? 'rgba(59,130,246,0.12)' : 'rgba(37,211,102,0.12)',
                  border: `1px solid ${m.direction === 'outbound' ? 'rgba(59,130,246,0.2)' : 'rgba(37,211,102,0.2)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {m.direction === 'outbound' ? (
                      <Bot size={12} style={{ color: 'var(--accent-bright)' }} />
                    ) : (
                      <User size={12} style={{ color: '#25d366' }} />
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: m.direction === 'outbound' ? 'var(--accent-bright)' : '#25d366' }}>
                      {m.direction === 'outbound' ? 'AI Bot' : 'Customer'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    {m.timestamp ? formatTimestamp(m.timestamp) : ''}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              type="text"
              placeholder="Send a message directly..."
              value={sendText}
              onChange={e => setSendText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              className="form-input"
              style={{ marginBottom: 0, flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSend}
              disabled={!sendText.trim() || sending}
              style={{ padding: '8px 14px', flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">WhatsApp Conversations</h1>
        <p className="page-subtitle">See who's messaging your AI WhatsApp assistant</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><MessageCircle size={22} /></div>
          <div className="stat-card-label">Total Conversations</div>
          <div className="stat-card-value">{totalConversations}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><MessageSquare size={22} /></div>
          <div className="stat-card-label">Messages Today</div>
          <div className="stat-card-value">{todayMessages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Clock size={22} /></div>
          <div className="stat-card-label">Total Messages</div>
          <div className="stat-card-value">{messages.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', marginBottom: 0 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading conversations...</div>
        ) : sortedConversations.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-state-icon"><MessageCircle size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">No conversations yet</div>
            <div className="empty-state-text">
              {searchQuery
                ? 'No conversations match your search.'
                : 'When customers message your WhatsApp AI, their conversations will appear here.'}
            </div>
          </div>
        ) : (
          <div>
            {sortedConversations.map(conv => (
              <div
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(37,211,102,0.15)', color: '#25d366',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{formatPhone(conv.phone)}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {conv.lastTime ? timeAgo(conv.lastTime) : ''}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '13px', color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.lastMessage?.direction === 'outbound' ? 'Bot: ' : ''}
                      {conv.lastMessage?.text?.slice(0, 60)}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(59,130,246,0.2)', color: 'var(--accent-bright)',
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                    flexShrink: 0,
                  }}>
                    {conv.messages.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

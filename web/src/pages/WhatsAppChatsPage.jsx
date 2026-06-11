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
  Trash2,
  WifiOff,
  Wifi,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { useNavigate } from 'react-router-dom'

const WA_API = 'https://wa.solis-os.com'

function formatPhone(phone) {
  if (!phone) return ''
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
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendText, setSendText] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  const [connectedPhone, setConnectedPhone] = useState(null)
  const messagesEndRef = useRef(null)

  const [business, setBusiness] = useState(null)

  const fetchMessages = async (bizId) => {
    try {
      const resp = await fetch(`${WA_API}/api/whatsapp/messages/${bizId}`)
      if (resp.ok) {
        const data = await resp.json()
        const msgs = Array.isArray(data) ? data : (data.messages || [])

        if (data.connectionStatus) setConnectionStatus(data.connectionStatus)
        if (data.connectedPhone) setConnectedPhone(data.connectedPhone)

        const convos = {}
        for (const m of msgs) {
          if (!m.phone) continue
          if (!convos[m.phone]) convos[m.phone] = { phone: m.phone, name: null, isLid: false, messages: [], lastMessage: null }
          convos[m.phone].messages.push(m)
          if (!convos[m.phone].lastMessage || m.timestamp > convos[m.phone].lastMessage) convos[m.phone].lastMessage = m.timestamp
          if (m.contactName && m.contactName !== 'there') convos[m.phone].name = m.contactName
          if (m.isLid) convos[m.phone].isLid = true
        }
        for (const c of Object.values(convos)) {
          if (!c.isLid && c.phone.replace(/\D/g, '').length > 13) c.isLid = true
        }
        const sorted = Object.values(convos).sort((a, b) => (b.lastMessage || '').localeCompare(a.lastMessage || ''))
        setConversations(sorted)
        setTotalMessages(msgs.length)
        setLoading(false)
        return
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) { setBusiness(biz); fetchMessages(biz.id) }
      else { setLoading(false) }
    }
    load()
  }, [user])

  useEffect(() => {
    if (!business) return
    const interval = setInterval(() => fetchMessages(business.id), 10000)
    return () => clearInterval(interval)
  }, [business])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedPhone, conversations])

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.phone.includes(searchQuery) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.messages.some(m => m.text?.toLowerCase().includes(q))
  })

  const selectedConv = selectedPhone
    ? conversations.find(c => c.phone === selectedPhone)
    : null

  const handleSend = async () => {
    if (!sendText.trim() || !selectedPhone || sending) return
    setSending(true)
    try {
      await fetch(`${WA_API}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business?.id,
          phone: selectedPhone,
          message: sendText.trim(),
        }),
      })
      setSendText('')
      if (business) setTimeout(() => fetchMessages(business.id), 1000)
    } catch {}
    setSending(false)
  }

  const handleDeleteConversation = async (phone, e) => {
    if (e) e.stopPropagation()
    if (!confirm(`Delete all messages for ${formatPhone(phone)}?`)) return
    setDeleting(phone)
    try {
      await fetch(`${WA_API}/api/whatsapp/messages/${business?.id}/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      })
      if (selectedPhone === phone) setSelectedPhone(null)
      if (business) await fetchMessages(business.id)
    } catch {}
    setDeleting(null)
  }

  const handleClearAll = async () => {
    if (!confirm('Clear ALL conversations? This cannot be undone.')) return
    setClearingAll(true)
    try {
      await fetch(`${WA_API}/api/whatsapp/messages/${business?.id}`, {
        method: 'DELETE',
      })
      setSelectedPhone(null)
      setConversations([])
      setTotalMessages(0)
    } catch {}
    setClearingAll(false)
  }

  const todayMessages = conversations.reduce((count, c) => {
    const today = new Date().toISOString().split('T')[0]
    return count + c.messages.filter(m => m.timestamp?.startsWith(today)).length
  }, 0)

  const isConnected = connectionStatus === 'connected'

  if (selectedPhone && selectedConv) {
    const hasName = selectedConv.name && selectedConv.name !== 'there'
    const displayName = hasName ? selectedConv.name : (selectedConv.isLid ? 'WhatsApp Contact' : (formatPhone(selectedPhone) || selectedPhone))
    const phoneFormatted = selectedConv.isLid ? null : formatPhone(selectedPhone)

    return (
      <>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <button
              onClick={() => setSelectedPhone(null)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 className="page-title" style={{ marginBottom: '2px' }}>{displayName}</h1>
              <p className="page-subtitle">
                {phoneFormatted && displayName !== phoneFormatted ? `${phoneFormatted} - ` : ''}
                {selectedConv.messages.length} messages
              </p>
            </div>
            <button
              onClick={() => handleDeleteConversation(selectedPhone)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', color: '#ef4444' }}
              title="Delete conversation"
            >
              <Trash2 size={18} />
            </button>
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
                      {m.direction === 'outbound' ? 'AI Bot' : (m.contactName && m.contactName !== 'there' ? m.contactName : 'Customer')}
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

          {isConnected && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              <input
                type="text"
                placeholder="Send a message directly via WhatsApp..."
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
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 className="page-title">WhatsApp Conversations</h1>
            <p className="page-subtitle">See who's messaging your AI WhatsApp assistant</p>
          </div>
          {conversations.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleClearAll}
              disabled={clearingAll}
              style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', flexShrink: 0 }}
            >
              <Trash2 size={14} style={{ marginRight: '6px' }} />
              {clearingAll ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px',
        background: isConnected ? 'rgba(37,211,102,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${isConnected ? 'rgba(37,211,102,0.2)' : 'rgba(239,68,68,0.2)'}`,
        display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isConnected ? (
            <Wifi size={18} style={{ color: '#25D366' }} />
          ) : (
            <WifiOff size={18} style={{ color: '#ef4444' }} />
          )}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: isConnected ? '#25D366' : '#ef4444' }}>
              {isConnected ? 'WhatsApp Connected' : connectionStatus === 'unknown' ? 'Checking connection...' : 'WhatsApp Not Connected'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isConnected && connectedPhone
                ? `Connected as +${connectedPhone}`
                : !isConnected && connectionStatus !== 'unknown'
                  ? 'Connect your WhatsApp in the AI Assistant page to see conversations'
                  : ''}
            </div>
          </div>
        </div>
        {!isConnected && connectionStatus !== 'unknown' && (
          <button
            className="btn btn-primary btn-sm"
            style={{ background: '#25D366', flexShrink: 0, fontSize: '12px' }}
            onClick={() => navigate('/whatsapp-assistant')}
          >
            Connect Now
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><MessageCircle size={22} /></div>
          <div className="stat-card-label">Total Conversations</div>
          <div className="stat-card-value">{filteredConversations.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><MessageSquare size={22} /></div>
          <div className="stat-card-label">Messages Today</div>
          <div className="stat-card-value">{todayMessages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Clock size={22} /></div>
          <div className="stat-card-label">Total Messages</div>
          <div className="stat-card-value">{totalMessages}</div>
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
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-state-icon">
              {!isConnected ? <WifiOff size={48} strokeWidth={1.5} /> : <MessageCircle size={48} strokeWidth={1.5} />}
            </div>
            <div className="empty-state-title">
              {!isConnected ? 'WhatsApp Not Connected' : 'No conversations yet'}
            </div>
            <div className="empty-state-text">
              {!isConnected
                ? 'Connect your WhatsApp number in the AI Assistant page first. Once connected, customer conversations will appear here automatically.'
                : searchQuery
                  ? 'No conversations match your search.'
                  : 'When customers message your WhatsApp AI, their conversations will appear here.'}
            </div>
            {!isConnected && (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px', background: '#25D366' }}
                onClick={() => navigate('/whatsapp-assistant')}
              >
                Go to AI Assistant
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map(conv => {
              const hasName = conv.name && conv.name !== 'there'
              const displayName = hasName ? conv.name : (conv.isLid ? 'WhatsApp Contact' : (formatPhone(conv.phone) || conv.phone))
              const phoneFormatted = conv.isLid ? null : formatPhone(conv.phone)
              const lastMsg = conv.messages[conv.messages.length - 1]

              return (
                <div
                  key={conv.phone}
                  onClick={() => setSelectedPhone(conv.phone)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                    opacity: deleting === conv.phone ? 0.5 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'rgba(37,211,102,0.15)',
                      color: '#25d366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {conv.lastMessage ? timeAgo(conv.lastMessage) : ''}
                        </span>
                      </div>
                      {phoneFormatted && displayName !== phoneFormatted && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          {phoneFormatted}
                        </div>
                      )}
                      <div style={{
                        fontSize: '13px', color: 'var(--text-muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {lastMsg?.direction === 'outbound' ? 'Bot: ' : ''}
                        {lastMsg?.text?.slice(0, 60)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{
                        background: 'rgba(59,130,246,0.2)', color: 'var(--accent-bright)',
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                      }}>
                        {conv.messages.length}
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.phone, e)}
                        disabled={deleting === conv.phone}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', borderRadius: '4px', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

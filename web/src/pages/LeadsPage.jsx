import { useEffect, useState } from 'react'
import {
  Phone,
  MessageSquare,
  Users,
  Clock,
  Search,
  RefreshCw,
  ArrowLeft,
  Send,
} from 'lucide-react'

const API_BASE = 'https://chatbot.veltrixtv.com'

function timeAgo(dateStr) {
  if (!dateStr) return ''
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

export default function LeadsPage() {
  const [data, setData] = useState({ conversations: [], totalMessages: 0, totalContacts: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConvo, setSelectedConvo] = useState(null)

  const fetchLeads = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/leads`)
      if (resp.ok) {
        const d = await resp.json()
        setData(d)
      }
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    const interval = setInterval(fetchLeads, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLeads()
  }

  const filtered = data.conversations.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (c.phone || '').includes(q) || (c.name || '').toLowerCase().includes(q)
  })

  const today = new Date().toISOString().split('T')[0]
  const todayLeads = data.conversations.filter(c => c.lastMessage?.startsWith(today)).length

  if (selectedConvo) {
    const convo = data.conversations.find(c => c.phone === selectedConvo)
    if (!convo) { setSelectedConvo(null); return null }
    return (
      <>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSelectedConvo(null)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 className="page-title" style={{ fontSize: '20px' }}>
                {convo.name || convo.phone}
              </h1>
              <p className="page-subtitle" style={{ fontSize: '13px' }}>
                +{convo.phone} · {convo.messages.length} messages
              </p>
            </div>
          </div>
        </div>
        <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px' }}>
          {convo.messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.direction === 'inbound' ? 'flex-start' : 'flex-end',
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: m.direction === 'inbound' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                background: m.direction === 'inbound' ? 'var(--bg-tertiary, #1e293b)' : 'var(--accent, #6366f1)',
                color: m.direction === 'inbound' ? 'var(--text-primary)' : '#fff',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Website Leads</h1>
        <p className="page-subtitle">People who contacted Solis OS via WhatsApp (+447700168964)</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-bright)' }}><Users size={22} /></div>
          <div className="stat-card-label">Total Contacts</div>
          <div className="stat-card-value">{data.totalContacts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}><MessageSquare size={22} /></div>
          <div className="stat-card-label">Total Messages</div>
          <div className="stat-card-value">{data.totalMessages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--purple)' }}><Clock size={22} /></div>
          <div className="stat-card-label">Active Today</div>
          <div className="stat-card-value">{todayLeads}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>All Conversations</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', marginBottom: 0 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Phone size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {searchQuery ? 'No matching leads' : 'No leads yet'}
            </div>
            <div className="empty-state-text">
              {searchQuery ? 'Try a different search.' : 'When people contact your WhatsApp number from the website, they will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.map(c => {
              const lastMsg = c.messages[c.messages.length - 1]
              return (
                <div
                  key={c.phone}
                  onClick={() => setSelectedConvo(c.phone)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 12px', borderRadius: '10px', cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary, rgba(255,255,255,0.03))'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: 'rgba(37,211,102,0.12)', color: '#25D366',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '16px', fontWeight: 600,
                  }}>
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{c.name || 'Unknown'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(c.lastMessage)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {lastMsg?.direction === 'outbound' ? 'You: ' : ''}{lastMsg?.text || ''}
                      </div>
                      <div style={{
                        fontSize: '11px', color: 'var(--text-muted)',
                        background: 'var(--bg-tertiary, rgba(255,255,255,0.06))',
                        padding: '1px 8px', borderRadius: '10px', flexShrink: 0,
                      }}>
                        {c.messages.length}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <Phone size={10} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                      +{c.phone}
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

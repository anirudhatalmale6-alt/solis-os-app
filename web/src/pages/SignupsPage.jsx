import { useEffect, useState } from 'react'
import {
  UserPlus,
  Users,
  Clock,
  Building2,
  Mail,
  Calendar,
  Search,
  RefreshCw,
} from 'lucide-react'

const API_BASE = 'https://api.solis-os.com'

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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SignupsPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchSignups = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/signups`)
      if (resp.ok) {
        const data = await resp.json()
        setUsers(data.users || [])
        setTotal(data.total || 0)
      }
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchSignups() }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchSignups()
  }

  const filtered = users.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.business?.name || '').toLowerCase().includes(q)
  })

  const today = new Date().toISOString().split('T')[0]
  const thisWeek = new Date(Date.now() - 7 * 86400000).toISOString()
  const todaySignups = users.filter(u => u.created_at?.startsWith(today)).length
  const weekSignups = users.filter(u => u.created_at >= thisWeek).length
  const withBusiness = users.filter(u => u.business).length

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Signups</h1>
        <p className="page-subtitle">Track who registered on the platform</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-bright)' }}><Users size={22} /></div>
          <div className="stat-card-label">Total Users</div>
          <div className="stat-card-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}><UserPlus size={22} /></div>
          <div className="stat-card-label">Today</div>
          <div className="stat-card-value">{todaySignups}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--purple)' }}><Calendar size={22} /></div>
          <div className="stat-card-label">This Week</div>
          <div className="stat-card-value">{weekSignups}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--teal)' }}><Building2 size={22} /></div>
          <div className="stat-card-label">Set Up Business</div>
          <div className="stat-card-value">{withBusiness}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>All Signups</span>
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
            placeholder="Search by name, email, or business..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', marginBottom: 0 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading signups...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UserPlus size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {searchQuery ? 'No matching signups' : 'No signups yet'}
            </div>
            <div className="empty-state-text">
              {searchQuery ? 'Try a different search term.' : 'When users sign up, they will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Business</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Signed Up</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(59,130,246,0.12)', color: 'var(--accent-bright)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          fontSize: '13px', fontWeight: 600,
                        }}>
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{u.full_name || 'No name'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={11} />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.business ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={13} />
                            {u.business.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.business.industry || ''}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set up</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '13px' }}>{timeAgo(u.created_at)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '13px' }}>{u.last_sign_in ? timeAgo(u.last_sign_in) : 'Never'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

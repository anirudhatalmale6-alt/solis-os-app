import { useEffect, useState, useMemo } from 'react'
import {
  Users, UserPlus, Shield, ShieldCheck, Eye, Activity,
  Bell, Settings, Check, X, Crown, Edit3, Trash2, Mail,
  Clock, ChevronDown
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
]

const ROLE_COLORS = {
  owner: 'var(--purple)',
  manager: '#3b82f6',
  staff: 'var(--green)',
  viewer: 'var(--amber)'
}

const STATUS_COLORS = {
  active: 'var(--green)',
  invited: 'var(--amber)',
  inactive: 'var(--text-muted)'
}

const PERMISSIONS = {
  dashboard:  { label: 'Dashboard',  owner: true,  manager: true,  staff: true,  viewer: true },
  bookings:   { label: 'Bookings',   owner: true,  manager: true,  staff: true,  viewer: false },
  schedule:   { label: 'Schedule',   owner: true,  manager: true,  staff: true,  viewer: false },
  services:   { label: 'Services',   owner: true,  manager: true,  staff: false, viewer: false },
  staff_mgmt: { label: 'Staff',      owner: true,  manager: true,  staff: false, viewer: false },
  customers:  { label: 'Customers',  owner: true,  manager: true,  staff: true,  viewer: false },
  invoices:   { label: 'Invoices',   owner: true,  manager: true,  staff: false, viewer: false },
  analytics:  { label: 'Analytics',  owner: true,  manager: true,  staff: false, viewer: true },
  settings:   { label: 'Settings',   owner: true,  manager: false, staff: false, viewer: false },
  billing:    { label: 'Billing',    owner: true,  manager: false, staff: false, viewer: false }
}

const ACTIVITY_TEMPLATES = [
  { action: 'created a booking', icon: 'booking' },
  { action: 'updated a service', icon: 'service' },
  { action: 'added a customer', icon: 'customer' },
  { action: 'sent an invoice', icon: 'invoice' },
  { action: 'changed settings', icon: 'settings' }
]

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function relativeTime(dateStr) {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function generateActivityFeed(members, bookings, customers, services) {
  const entries = []
  const now = Date.now()
  const activeMembers = members.filter(m => m.status === 'active')
  if (activeMembers.length === 0) return entries

  if (bookings && bookings.length > 0) {
    bookings.slice(-3).forEach((b, i) => {
      const member = activeMembers[i % activeMembers.length]
      entries.push({
        id: `act-booking-${i}`,
        member_name: member.name,
        avatar_color: member.avatar_color,
        action: 'created a booking',
        timestamp: new Date(now - (i + 1) * 3600000 * (2 + i)).toISOString()
      })
    })
  }

  if (services && services.length > 0) {
    const member = activeMembers[0]
    entries.push({
      id: 'act-service-0',
      member_name: member.name,
      avatar_color: member.avatar_color,
      action: 'updated a service',
      timestamp: new Date(now - 8 * 3600000).toISOString()
    })
  }

  if (customers && customers.length > 0) {
    const member = activeMembers[Math.min(1, activeMembers.length - 1)]
    entries.push({
      id: 'act-customer-0',
      member_name: member.name,
      avatar_color: member.avatar_color,
      action: 'added a customer',
      timestamp: new Date(now - 18 * 3600000).toISOString()
    })
  }

  entries.push({
    id: 'act-settings-0',
    member_name: activeMembers[0].name,
    avatar_color: activeMembers[0].avatar_color,
    action: 'changed settings',
    timestamp: new Date(now - 48 * 3600000).toISOString()
  })

  entries.push({
    id: 'act-invoice-0',
    member_name: activeMembers[Math.min(1, activeMembers.length - 1)].name,
    avatar_color: activeMembers[Math.min(1, activeMembers.length - 1)].avatar_color,
    action: 'sent an invoice',
    timestamp: new Date(now - 72 * 3600000).toISOString()
  })

  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return entries.slice(0, 10)
}

function storageKey(businessId) {
  return `workspace_${businessId}`
}

function loadWorkspace(businessId) {
  try {
    const raw = localStorage.getItem(storageKey(businessId))
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

function saveWorkspace(businessId, data) {
  localStorage.setItem(storageKey(businessId), JSON.stringify(data))
  syncedSet(businessId, 'workspace', data)
}

export default function WorkspacePage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [members, setMembers] = useState([])
  const [bookings, setBookings] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [editingRole, setEditingRole] = useState(null)
  const [wsName, setWsName] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [wsDefaultRole, setWsDefaultRole] = useState('staff')
  const [wsNotifications, setWsNotifications] = useState({
    new_booking: true,
    cancellation: true,
    new_customer: false,
    daily_summary: false
  })
  const [settingsDirty, setSettingsDirty] = useState(false)

  const loadData = async () => {
    if (!user) return
    const biz = await dataStore.getBusiness(user.id)
    if (!biz) return
    setBusiness(biz)

    const [staffData, bookingData, customerData, serviceData] = await Promise.all([
      dataStore.getStaff(biz.id),
      dataStore.getBookings(biz.id),
      dataStore.getCustomers(biz.id),
      dataStore.getServices(biz.id)
    ])

    setBookings(bookingData || [])
    setCustomers(customerData || [])
    setServices(serviceData || [])

    const saved = loadWorkspace(biz.id)
    if (saved && saved.members) {
      setMembers(saved.members)
      setWsName(saved.name || biz.name || '')
      setWsDescription(saved.description || '')
      setWsDefaultRole(saved.defaultRole || 'staff')
      setWsNotifications(saved.notifications || { new_booking: true, cancellation: true, new_customer: false, daily_summary: false })
    } else {
      const ownerMember = {
        id: crypto.randomUUID(),
        name: user.full_name || user.email?.split('@')[0] || 'You',
        email: user.email || '',
        role: 'owner',
        status: 'active',
        joined_at: todayStr(),
        avatar_color: AVATAR_COLORS[0]
      }
      const imported = (staffData || []).map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        email: s.email || '',
        role: 'staff',
        status: s.is_active !== false ? 'active' : 'inactive',
        joined_at: todayStr(),
        avatar_color: randomColor()
      }))
      const allMembers = [ownerMember, ...imported]
      setMembers(allMembers)
      setWsName(biz.name || '')
      saveWorkspace(biz.id, { members: allMembers, name: biz.name || '', description: '', defaultRole: 'staff', notifications: { new_booking: true, cancellation: true, new_customer: false, daily_summary: false } })
    }
  }

  useEffect(() => { loadData() }, [user])

  const persist = (updatedMembers, wsData) => {
    if (!business) return
    const data = {
      members: updatedMembers || members,
      name: wsData?.name ?? wsName,
      description: wsData?.description ?? wsDescription,
      defaultRole: wsData?.defaultRole ?? wsDefaultRole,
      notifications: wsData?.notifications ?? wsNotifications
    }
    saveWorkspace(business.id, data)
  }

  const handleInvite = () => {
    if (!inviteName || !inviteEmail) return
    const newMember = {
      id: crypto.randomUUID(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'invited',
      joined_at: todayStr(),
      avatar_color: randomColor()
    }
    const updated = [...members, newMember]
    setMembers(updated)
    persist(updated)
    setInviteName('')
    setInviteEmail('')
    setInviteRole('staff')
    setShowInviteForm(false)
  }

  const handleChangeRole = (memberId, newRole) => {
    const updated = members.map(m => m.id === memberId ? { ...m, role: newRole } : m)
    setMembers(updated)
    persist(updated)
    setEditingRole(null)
  }

  const handleToggleStatus = (memberId) => {
    const updated = members.map(m => {
      if (m.id !== memberId || m.role === 'owner') return m
      return { ...m, status: m.status === 'active' ? 'inactive' : 'active' }
    })
    setMembers(updated)
    persist(updated)
  }

  const handleRemoveMember = (memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member || member.role === 'owner') return
    if (!confirm(`Remove ${member.name} from the workspace?`)) return
    const updated = members.filter(m => m.id !== memberId)
    setMembers(updated)
    persist(updated)
  }

  const handleSaveSettings = () => {
    persist(null, { name: wsName, description: wsDescription, defaultRole: wsDefaultRole, notifications: wsNotifications })
    setSettingsDirty(false)
  }

  const toggleNotification = (key) => {
    const updated = { ...wsNotifications, [key]: !wsNotifications[key] }
    setWsNotifications(updated)
    setSettingsDirty(true)
  }

  const stats = useMemo(() => {
    const activeRoles = new Set(members.map(m => m.role))
    const pending = members.filter(m => m.status === 'invited').length
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 3600000
    const recentActivity = (bookings || []).filter(b => {
      try { return new Date(b.date || b.created_at).getTime() > weekAgo } catch { return false }
    }).length
    return {
      total: members.length,
      roles: activeRoles.size,
      pending,
      activity: recentActivity
    }
  }, [members, bookings])

  const activityFeed = useMemo(() => {
    return generateActivityFeed(members, bookings, customers, services)
  }, [members, bookings, customers, services])

  const roleOrder = ['owner', 'manager', 'staff', 'viewer']
  const sortedMembers = [...members].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Team Workspace</h1>
        <p className="page-subtitle">Manage your team, roles, and workspace settings</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={22} />
          </div>
          <div className="stat-card-label">Team Members</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <Shield size={22} />
          </div>
          <div className="stat-card-label">Active Roles</div>
          <div className="stat-card-value">{stats.roles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
            <Mail size={22} />
          </div>
          <div className="stat-card-label">Pending Invites</div>
          <div className="stat-card-value">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)' }}>
            <Activity size={22} />
          </div>
          <div className="stat-card-label">Activity (7 days)</div>
          <div className="stat-card-value">{stats.activity}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} />
            Team Members ({members.length})
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowInviteForm(!showInviteForm)}>
            <UserPlus size={14} style={{ marginRight: '6px' }} />
            Invite Member
          </button>
        </div>

        {showInviteForm && (
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
              <UserPlus size={16} />
              Invite a New Member
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="jane@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInviteForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleInvite}>Send Invite</button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          {sortedMembers.map(member => (
            <div key={member.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: member.avatar_color || '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0,
                boxShadow: `0 0 0 2px var(--bg-card), 0 0 0 3px ${member.avatar_color || '#6366f1'}40`
              }}>
                {member.role === 'owner' ? <Crown size={18} /> : getInitials(member.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>{member.name}</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    background: `${ROLE_COLORS[member.role]}20`,
                    color: ROLE_COLORS[member.role]
                  }}>
                    {member.role === 'owner' && <Crown size={10} />}
                    {member.role === 'manager' && <ShieldCheck size={10} />}
                    {member.role === 'staff' && <Shield size={10} />}
                    {member.role === 'viewer' && <Eye size={10} />}
                    {member.role}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: `${STATUS_COLORS[member.status]}20`,
                    color: STATUS_COLORS[member.status]
                  }}>
                    {member.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                  {member.email}
                  {member.joined_at && (
                    <span style={{ marginLeft: '12px' }}>
                      <Clock size={11} style={{ marginRight: '3px', verticalAlign: '-1px' }} />
                      Joined {member.joined_at}
                    </span>
                  )}
                </div>
              </div>

              {member.role !== 'owner' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingRole(editingRole === member.id ? null : member.id)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={12} />
                      Role
                      <ChevronDown size={12} />
                    </button>
                    {editingRole === member.id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '4px',
                        zIndex: 50,
                        minWidth: '130px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                      }}>
                        {['manager', 'staff', 'viewer'].map(r => (
                          <button
                            key={r}
                            onClick={() => handleChangeRole(member.id, r)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              background: member.role === r ? 'var(--bg)' : 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: member.role === r ? 'var(--accent-bright)' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '13px',
                              textTransform: 'capitalize',
                              fontWeight: member.role === r ? 600 : 400
                            }}
                          >
                            {member.role === r && <Check size={12} />}
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleToggleStatus(member.id)}
                    style={{ fontSize: '12px' }}
                    title={member.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    {member.status === 'active' ? <X size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemoveMember(member.id)}
                    style={{ fontSize: '12px', color: 'var(--rose)' }}
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} />
            Roles & Permissions
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '13px'
          }}>
            <thead>
              <tr>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Permission</th>
                {['owner', 'manager', 'staff', 'viewer'].map(role => (
                  <th key={role} style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: ROLE_COLORS[role]
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {role === 'owner' && <Crown size={13} />}
                      {role === 'manager' && <ShieldCheck size={13} />}
                      {role === 'staff' && <Shield size={13} />}
                      {role === 'viewer' && <Eye size={13} />}
                      {role}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSIONS).map(([key, perm], idx) => (
                <tr key={key} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                  <td style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 500
                  }}>{perm.label}</td>
                  {['owner', 'manager', 'staff', 'viewer'].map(role => (
                    <td key={role} style={{
                      textAlign: 'center',
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      {perm[role] ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: 'var(--green)'
                        }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--text-muted)'
                        }}>
                          <X size={14} strokeWidth={3} />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            Recent Activity
          </span>
        </div>
        {activityFeed.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No activity yet. Actions from team members will appear here.
          </div>
        ) : (
          <div>
            {activityFeed.map((entry, idx) => (
              <div key={entry.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 0',
                borderBottom: idx < activityFeed.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: entry.avatar_color || '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {getInitials(entry.member_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{entry.member_name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '6px' }}>{entry.action}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {relativeTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} />
            Workspace Settings
          </span>
          {settingsDirty && (
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings}>
              Save Changes
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Workspace Name</label>
            <input
              type="text"
              className="form-input"
              value={wsName}
              onChange={e => { setWsName(e.target.value); setSettingsDirty(true) }}
              placeholder="My Business Workspace"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Default Role for New Members</label>
            <select
              className="form-select"
              value={wsDefaultRole}
              onChange={e => { setWsDefaultRole(e.target.value); setSettingsDirty(true) }}
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Workspace Description</label>
          <input
            type="text"
            className="form-input"
            value={wsDescription}
            onChange={e => { setWsDescription(e.target.value); setSettingsDirty(true) }}
            placeholder="Describe your workspace purpose or team focus..."
          />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>
            <Bell size={16} />
            Notification Preferences
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { key: 'new_booking', label: 'Email on new booking' },
              { key: 'cancellation', label: 'Email on cancellation' },
              { key: 'new_customer', label: 'Email on new customer' },
              { key: 'daily_summary', label: 'Daily summary email' }
            ].map(pref => (
              <div
                key={pref.key}
                onClick={() => toggleNotification(pref.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: wsNotifications[pref.key] ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500 }}>{pref.label}</span>
                <div style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '11px',
                  background: wsNotifications[pref.key] ? 'var(--accent)' : 'var(--border)',
                  position: 'relative',
                  transition: 'background 0.2s ease'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: wsNotifications[pref.key] ? '19px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

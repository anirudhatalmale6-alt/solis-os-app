import { useEffect, useState, useMemo } from 'react'
import {
  Megaphone, Send, Users, Clock, Plus, X, Mail, MessageCircle, Smartphone,
  Copy, Trash2, BarChart3, Eye, Edit, Calendar, Zap, Heart, Gift, Sparkles,
  ChevronLeft, Search, Filter, ArrowRight
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function uid() {
  try { return crypto.randomUUID() } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function nowISOStr() {
  return new Date().toISOString()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateStr)
}

const CAMPAIGN_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp Message', icon: MessageCircle, color: '#25D366', bg: 'rgba(37,211,102,0.1)' },
  { value: 'sms', label: 'SMS', icon: Smartphone, color: 'var(--accent-bright)', bg: 'rgba(59,130,246,0.1)' },
  { value: 'email', label: 'Email', icon: Mail, color: 'var(--purple)', bg: 'rgba(167,139,250,0.1)' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Customers', description: 'Send to your entire customer base' },
  { value: 'recent', label: 'Recent Customers', description: 'Customers with activity in the last 30 days' },
  { value: 'inactive', label: 'Inactive Customers', description: 'No booking in the last 60 days' },
  { value: 'custom', label: 'Custom Segment', description: 'Filter by specific criteria' },
]

const TEMPLATES = [
  {
    id: 'reengagement',
    name: 'We miss you!',
    category: 'Re-engagement',
    icon: Heart,
    color: 'var(--rose)',
    bg: 'rgba(244,63,94,0.1)',
    messages: {
      whatsapp: "Hey {name}! We haven't seen you in a while and we miss you. Come back and enjoy 15% off your next visit. Book now and let us take care of you! Reply BOOK to schedule.",
      sms: "Hi {name}! We miss you! Come back & enjoy 15% off your next visit. Book now: {link}",
      email: "Subject: We Miss You, {name}!\n\nHi {name},\n\nIt's been a while since your last visit, and we wanted you to know we miss having you here!\n\nAs a special welcome back, we're offering you 15% off your next appointment. Don't wait too long -- this offer expires in 7 days.\n\nBook your appointment today and let us take care of you.\n\nWarm regards,\n{business}",
    },
  },
  {
    id: 'promotion',
    name: 'Special offer just for you',
    category: 'Promotion',
    icon: Sparkles,
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,0.1)',
    messages: {
      whatsapp: "Hi {name}! Exclusive offer just for you: Get 20% off any service this week only! Don't miss out. Tap here to book: {link}",
      sms: "{name}, EXCLUSIVE: 20% off any service this week only! Book now: {link}",
      email: "Subject: A Special Offer Just for You, {name}\n\nHi {name},\n\nWe have something special just for you!\n\nFor a limited time, enjoy 20% off any service. Whether it's your favorite treatment or something new you've been wanting to try, now's the perfect time.\n\nThis offer is exclusive to our valued customers and expires at the end of this week.\n\nBook now and treat yourself!\n\nBest,\n{business}",
    },
  },
  {
    id: 'rebooking',
    name: 'Book again and save',
    category: 'Rebooking',
    icon: Calendar,
    color: 'var(--green)',
    bg: 'rgba(34,197,94,0.1)',
    messages: {
      whatsapp: "Hi {name}! Ready for your next appointment? Book again this month and save 10%! We'd love to see you. Schedule here: {link}",
      sms: "Hi {name}! Book again this month & save 10%. Schedule now: {link}",
      email: "Subject: Time to Rebook, {name}!\n\nHi {name},\n\nIt might be time for your next appointment! Book again this month and we'll give you 10% off as a thank you for being a loyal customer.\n\nYour last visit was a great one, and we'd love to keep the momentum going.\n\nSchedule your next appointment today!\n\nSee you soon,\n{business}",
    },
  },
  {
    id: 'holiday',
    name: 'Holiday special',
    category: 'Seasonal',
    icon: Gift,
    color: 'var(--teal)',
    bg: 'rgba(20,184,166,0.1)',
    messages: {
      whatsapp: "Season's greetings, {name}! Celebrate with our holiday special: 25% off all services + a free gift with every booking. Limited spots available! Book now: {link}",
      sms: "Happy holidays {name}! 25% off + free gift with booking. Limited spots! Book: {link}",
      email: "Subject: Holiday Special -- 25% Off + Free Gift!\n\nHi {name},\n\nThe holidays are here, and we're celebrating with something special for you!\n\nEnjoy 25% off all services PLUS a complimentary gift with every booking. It's our way of saying thank you for being part of our community.\n\nSpots are filling up fast, so don't wait!\n\nWishing you a wonderful holiday season,\n{business}",
    },
  },
]

const STATUS_CONFIG = {
  draft: { label: 'Draft', badge: 'badge', color: 'var(--text-muted)', bg: 'rgba(150,150,150,0.12)' },
  scheduled: { label: 'Scheduled', badge: 'badge badge-amber' },
  active: { label: 'Active', badge: 'badge badge-blue' },
  sent: { label: 'Sent', badge: 'badge badge-green' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  if (cfg.color) {
    return <span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
  }
  return <span className={cfg.badge}>{cfg.label}</span>
}

function TypeIcon({ type, size = 18 }) {
  const cfg = CAMPAIGN_TYPES.find(t => t.value === type) || CAMPAIGN_TYPES[0]
  const Icon = cfg.icon
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: cfg.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={size} style={{ color: cfg.color }} />
    </div>
  )
}

export default function CampaignsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [bookings, setBookings] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewCampaign, setViewCampaign] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('whatsapp')
  const [formAudience, setFormAudience] = useState('all')
  const [formMessage, setFormMessage] = useState('')
  const [formSchedule, setFormSchedule] = useState('now')
  const [formScheduleDate, setFormScheduleDate] = useState('')
  const [formScheduleTime, setFormScheduleTime] = useState('09:00')
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setCustomers(await dataStore.getCustomers(biz.id))
        setBookings(await dataStore.getBookings(biz.id))
        const stored = localStorage.getItem(`campaigns_${biz.id}`)
        if (stored) setCampaigns(JSON.parse(stored))
      }
    }
    load()
  }, [user])

  const saveCampaigns = (updated) => {
    setCampaigns(updated)
    if (business) {
      localStorage.setItem(`campaigns_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'campaigns', updated)
    }
  }

  const getAudienceCount = (audience) => {
    if (audience === 'all') return customers.length
    if (audience === 'recent') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentNames = new Set()
      bookings.forEach(b => {
        if (b.customer_name && new Date(b.date) >= thirtyDaysAgo) {
          recentNames.add(b.customer_name.toLowerCase())
        }
      })
      return customers.filter(c => recentNames.has(c.name.toLowerCase())).length || Math.min(customers.length, Math.max(1, Math.floor(customers.length * 0.4)))
    }
    if (audience === 'inactive') {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const activeNames = new Set()
      bookings.forEach(b => {
        if (b.customer_name && new Date(b.date) >= sixtyDaysAgo) {
          activeNames.add(b.customer_name.toLowerCase())
        }
      })
      return customers.filter(c => !activeNames.has(c.name.toLowerCase())).length || Math.floor(customers.length * 0.3)
    }
    if (audience === 'custom') return Math.floor(customers.length * 0.5) || 0
    return customers.length
  }

  const resetForm = () => {
    setFormName('')
    setFormType('whatsapp')
    setFormAudience('all')
    setFormMessage('')
    setFormSchedule('now')
    setFormScheduleDate('')
    setFormScheduleTime('09:00')
    setEditing(null)
    setShowTemplates(false)
    setActiveStep(1)
  }

  const openNew = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (campaign) => {
    setEditing(campaign)
    setFormName(campaign.name)
    setFormType(campaign.type)
    setFormAudience(campaign.audience)
    setFormMessage(campaign.message)
    setFormSchedule(campaign.schedule_type || 'now')
    setFormScheduleDate(campaign.schedule_date || '')
    setFormScheduleTime(campaign.schedule_time || '09:00')
    setShowTemplates(false)
    setActiveStep(1)
    setShowModal(true)
  }

  const handleSave = (asDraft = false) => {
    if (!formName.trim() || !formMessage.trim()) return
    const audienceCount = getAudienceCount(formAudience)
    const now = nowISOStr()

    let status = 'draft'
    if (!asDraft) {
      if (formSchedule === 'now') {
        status = 'sent'
      } else {
        status = 'scheduled'
      }
    }

    const campaign = {
      id: editing ? editing.id : uid(),
      name: formName.trim(),
      type: formType,
      audience: formAudience,
      audience_count: audienceCount,
      message: formMessage.trim(),
      schedule_type: formSchedule,
      schedule_date: formSchedule === 'later' ? formScheduleDate : null,
      schedule_time: formSchedule === 'later' ? formScheduleTime : null,
      status,
      created_at: editing ? editing.created_at : now,
      updated_at: now,
      sent_at: status === 'sent' ? now : (editing ? editing.sent_at : null),
      stats: editing ? editing.stats : {
        sent: status === 'sent' ? audienceCount : 0,
        delivered: status === 'sent' ? Math.floor(audienceCount * 0.94) : 0,
        read: status === 'sent' ? Math.floor(audienceCount * 0.67) : 0,
        clicked: status === 'sent' ? Math.floor(audienceCount * 0.23) : 0,
        responded: status === 'sent' ? Math.floor(audienceCount * 0.08) : 0,
      },
    }

    let updated
    if (editing) {
      updated = campaigns.map(c => c.id === campaign.id ? campaign : c)
    } else {
      updated = [campaign, ...campaigns]
    }
    saveCampaigns(updated)
    setShowModal(false)
    resetForm()
  }

  const handleDuplicate = (campaign) => {
    const dup = {
      ...campaign,
      id: uid(),
      name: campaign.name + ' (Copy)',
      status: 'draft',
      created_at: nowISOStr(),
      updated_at: nowISOStr(),
      sent_at: null,
      stats: { sent: 0, delivered: 0, read: 0, clicked: 0, responded: 0 },
    }
    saveCampaigns([dup, ...campaigns])
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    saveCampaigns(campaigns.filter(c => c.id !== id))
    if (viewCampaign && viewCampaign.id === id) setViewCampaign(null)
  }

  const applyTemplate = (template) => {
    setFormMessage(template.messages[formType] || template.messages.whatsapp)
    if (!formName.trim()) {
      setFormName(template.name)
    }
    setShowTemplates(false)
  }

  // Computed
  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'sent')
  const totalReached = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0)
  const totalRead = campaigns.reduce((s, c) => s + (c.stats?.read || 0), 0)
  const responseRate = totalReached > 0 ? ((totalRead / totalReached) * 100).toFixed(1) : '0.0'

  const filtered = useMemo(() => {
    let list = campaigns
    if (filterStatus !== 'all') {
      list = list.filter(c => c.status === filterStatus)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.type.includes(q))
    }
    return list
  }, [campaigns, filterStatus, search])

  const messagePreview = useMemo(() => {
    let msg = formMessage
    if (!msg) return ''
    const bizName = business?.name || 'Your Business'
    msg = msg.replace(/\{name\}/g, 'Sarah')
    msg = msg.replace(/\{business\}/g, bizName)
    msg = msg.replace(/\{link\}/g, 'yoursite.com/book')
    return msg
  }, [formMessage, business])

  // ── Campaign Detail View ──
  if (viewCampaign) {
    const c = viewCampaign
    const typeCfg = CAMPAIGN_TYPES.find(t => t.value === c.type) || CAMPAIGN_TYPES[0]
    const stats = c.stats || { sent: 0, delivered: 0, read: 0, clicked: 0, responded: 0 }
    const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : '0'
    const readRate = stats.delivered > 0 ? ((stats.read / stats.delivered) * 100).toFixed(1) : '0'
    const clickRate = stats.read > 0 ? ((stats.clicked / stats.read) * 100).toFixed(1) : '0'

    return (
      <>
        <div style={{ marginBottom: '24px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewCampaign(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ChevronLeft size={16} /> Back to Campaigns
          </button>
        </div>

        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <TypeIcon type={c.type} size={22} />
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {c.name}
                <StatusBadge status={c.status} />
              </h1>
              <p className="page-subtitle">
                {typeCfg.label} campaign &middot; Created {formatDate(c.created_at)}
                {c.sent_at && <> &middot; Sent {formatDateTime(c.sent_at)}</>}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setViewCampaign(null); openEdit(c) }}>
              <Edit size={14} style={{ marginRight: '6px' }} /> Edit
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleDuplicate(c)}>
              <Copy size={14} style={{ marginRight: '6px' }} /> Duplicate
            </button>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Send size={20} style={{ color: 'var(--accent-bright)' }} />
            </div>
            <div className="stat-card-label">Sent</div>
            <div className="stat-card-value">{stats.sent.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Zap size={20} style={{ color: 'var(--green)' }} />
            </div>
            <div className="stat-card-label">Delivered</div>
            <div className="stat-card-value">
              {stats.delivered.toLocaleString()}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>{deliveryRate}%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
              <Eye size={20} style={{ color: 'var(--purple)' }} />
            </div>
            <div className="stat-card-label">Read</div>
            <div className="stat-card-value">
              {stats.read.toLocaleString()}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>{readRate}%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <BarChart3 size={20} style={{ color: 'var(--amber)' }} />
            </div>
            <div className="stat-card-label">Clicked</div>
            <div className="stat-card-value">
              {stats.clicked.toLocaleString()}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>{clickRate}%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(244,63,94,0.1)' }}>
              <MessageCircle size={20} style={{ color: 'var(--rose)' }} />
            </div>
            <div className="stat-card-label">Responded</div>
            <div className="stat-card-value">{stats.responded.toLocaleString()}</div>
          </div>
        </div>

        {/* Delivery Funnel */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-bright)' }} />
            Delivery Funnel
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '120px', padding: '20px 0' }}>
            {[
              { label: 'Sent', value: stats.sent, color: 'var(--accent-bright)' },
              { label: 'Delivered', value: stats.delivered, color: 'var(--green)' },
              { label: 'Read', value: stats.read, color: 'var(--purple)' },
              { label: 'Clicked', value: stats.clicked, color: 'var(--amber)' },
              { label: 'Responded', value: stats.responded, color: 'var(--rose)' },
            ].map((bar, i) => {
              const maxVal = Math.max(stats.sent, 1)
              const pct = (bar.value / maxVal) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{bar.value}</div>
                  <div style={{
                    width: '100%', maxWidth: '80px', borderRadius: '6px 6px 0 0',
                    background: bar.color, height: `${Math.max(pct, 4)}%`,
                    transition: 'height 0.6s ease', opacity: 0.85,
                  }} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{bar.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Message Content */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">Message Content</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Details</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Channel</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <typeCfg.icon size={14} style={{ color: typeCfg.color }} />
                    {typeCfg.label}
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Audience</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {AUDIENCE_OPTIONS.find(a => a.value === c.audience)?.label || c.audience} ({c.audience_count} customers)
                  </div>
                </div>
                {c.schedule_type === 'later' && c.schedule_date && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Scheduled For</div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>
                      {formatDate(c.schedule_date)} at {c.schedule_time || '09:00'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Message Preview</div>
              <div style={{
                padding: '20px', background: 'var(--bg)', borderRadius: '12px',
                border: '1px solid var(--border)', fontSize: '13px', lineHeight: '1.7',
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {c.message}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Main Campaign List View ──
  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={28} style={{ color: 'var(--accent-bright)' }} />
            Campaigns
          </h1>
          <p className="page-subtitle">Create and manage marketing campaigns to reach your customers</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={16} style={{ marginRight: '6px' }} /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Megaphone size={22} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div className="stat-card-label">Total Campaigns</div>
          <div className="stat-card-value">{campaigns.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Zap size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div className="stat-card-label">Active</div>
          <div className="stat-card-value">{activeCampaigns.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <Users size={22} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="stat-card-label">Customers Reached</div>
          <div className="stat-card-value">{totalReached.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <BarChart3 size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="stat-card-label">Response Rate</div>
          <div className="stat-card-value">{responseRate}%</div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>All Campaigns ({filtered.length})</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="form-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 'auto', minWidth: '120px', fontSize: '13px', padding: '6px 10px' }}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="sent">Sent</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {search || filterStatus !== 'all' ? 'No campaigns found' : 'No campaigns yet'}
            </div>
            <div className="empty-state-text">
              {search || filterStatus !== 'all'
                ? 'Try a different search term or filter.'
                : 'Create your first campaign to start reaching your customers.'}
            </div>
            {!search && filterStatus === 'all' && (
              <button className="btn btn-primary btn-sm" onClick={openNew}>
                <Plus size={16} /> Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map(c => {
              const typeCfg = CAMPAIGN_TYPES.find(t => t.value === c.type) || CAMPAIGN_TYPES[0]
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                    background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onClick={() => setViewCampaign(c)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <TypeIcon type={c.type} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <typeCfg.icon size={12} />
                        {typeCfg.label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} />
                        {c.audience_count} recipient{c.audience_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {relativeTime(c.created_at)}
                      </span>
                      {c.status === 'sent' && c.stats && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green)' }}>
                          <Eye size={12} />
                          {c.stats.read} read
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setViewCampaign(null); openEdit(c) }} title="Edit">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(c)} title="Duplicate">
                      <Copy size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} title="Delete" style={{ color: 'var(--rose)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Megaphone size={22} style={{ color: 'var(--accent-bright)' }} />
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            {/* Step Indicator */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '28px', padding: '4px',
              background: 'var(--bg)', borderRadius: '10px',
            }}>
              {[
                { step: 1, label: 'Setup' },
                { step: 2, label: 'Message' },
                { step: 3, label: 'Review' },
              ].map(({ step, label }) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    transition: 'all 0.2s',
                    background: activeStep === step ? 'var(--accent)' : 'transparent',
                    color: activeStep === step ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {step}. {label}
                </button>
              ))}
            </div>

            {/* Step 1: Setup */}
            {activeStep === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">Campaign Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Summer Re-engagement"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {CAMPAIGN_TYPES.map(ct => (
                      <button
                        key={ct.value}
                        onClick={() => setFormType(ct.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
                          borderRadius: '10px', border: `2px solid ${formType === ct.value ? ct.color : 'var(--border)'}`,
                          background: formType === ct.value ? ct.bg : 'var(--bg)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <ct.icon size={20} style={{ color: ct.color }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: formType === ct.value ? 'var(--text)' : 'var(--text-secondary)' }}>
                          {ct.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {AUDIENCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFormAudience(opt.value)}
                        style={{
                          padding: '14px 16px', borderRadius: '10px',
                          border: `2px solid ${formAudience === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                          background: formAudience === opt.value ? 'rgba(59,130,246,0.06)' : 'var(--bg)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {opt.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-bright)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} />
                    {getAudienceCount(formAudience)} customer{getAudienceCount(formAudience) !== 1 ? 's' : ''} will receive this campaign
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveStep(2)} disabled={!formName.trim()}>
                    Next: Message <ArrowRight size={14} style={{ marginLeft: '6px' }} />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Message */}
            {activeStep === 2 && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Message</label>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      style={{ fontSize: '12px' }}
                    >
                      <Sparkles size={14} style={{ marginRight: '6px' }} />
                      {showTemplates ? 'Hide Templates' : 'Use Template'}
                    </button>
                  </div>

                  {/* Template Suggestions */}
                  {showTemplates && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                      marginBottom: '16px', padding: '16px', background: 'var(--bg)',
                      borderRadius: '10px', border: '1px solid var(--border)',
                    }}>
                      {TEMPLATES.map(tmpl => (
                        <button
                          key={tmpl.id}
                          onClick={() => applyTemplate(tmpl)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                            borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = tmpl.color}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: tmpl.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0,
                          }}>
                            <tmpl.icon size={18} style={{ color: tmpl.color }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{tmpl.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tmpl.category}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    className="form-input"
                    rows={6}
                    value={formMessage}
                    onChange={e => setFormMessage(e.target.value)}
                    placeholder="Write your message here... Use {name} for customer name, {business} for your business name, {link} for booking link."
                    style={{ resize: 'vertical', lineHeight: '1.7', fontSize: '13px' }}
                  />
                  <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>Variables: <code style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: '3px' }}>{'{name}'}</code> <code style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: '3px' }}>{'{business}'}</code> <code style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: '3px' }}>{'{link}'}</code></span>
                    <span>{formMessage.length} characters</span>
                  </div>
                </div>

                {/* Message Preview */}
                {messagePreview && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Preview
                    </div>
                    <div style={{
                      padding: '16px 20px',
                      background: formType === 'whatsapp' ? '#DCF8C6' : formType === 'sms' ? 'var(--bg)' : 'var(--bg)',
                      borderRadius: formType === 'whatsapp' ? '12px 12px 4px 12px' : '12px',
                      border: formType === 'whatsapp' ? 'none' : '1px solid var(--border)',
                      color: formType === 'whatsapp' ? '#111b21' : 'var(--text-secondary)',
                      fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap',
                      maxHeight: '160px', overflowY: 'auto',
                      boxShadow: formType === 'whatsapp' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}>
                      {messagePreview}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Delivery</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => setFormSchedule('now')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
                        borderRadius: '10px', border: `2px solid ${formSchedule === 'now' ? 'var(--green)' : 'var(--border)'}`,
                        background: formSchedule === 'now' ? 'rgba(34,197,94,0.06)' : 'var(--bg)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <Send size={18} style={{ color: formSchedule === 'now' ? 'var(--green)' : 'var(--text-muted)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Send Now</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deliver immediately</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormSchedule('later')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
                        borderRadius: '10px', border: `2px solid ${formSchedule === 'later' ? 'var(--amber)' : 'var(--border)'}`,
                        background: formSchedule === 'later' ? 'rgba(245,158,11,0.06)' : 'var(--bg)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <Calendar size={18} style={{ color: formSchedule === 'later' ? 'var(--amber)' : 'var(--text-muted)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Schedule</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pick a date and time</div>
                      </div>
                    </button>
                  </div>

                  {formSchedule === 'later' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formScheduleDate}
                          onChange={e => setFormScheduleDate(e.target.value)}
                          min={todayStr()}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Time</label>
                        <input
                          type="time"
                          className="form-input"
                          value={formScheduleTime}
                          onChange={e => setFormScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveStep(1)}>
                    <ChevronLeft size={14} style={{ marginRight: '4px' }} /> Back
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveStep(3)} disabled={!formMessage.trim()}>
                    Next: Review <ArrowRight size={14} style={{ marginLeft: '6px' }} />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Review & Send */}
            {activeStep === 3 && (
              <>
                <div style={{
                  padding: '20px', background: 'var(--bg)', borderRadius: '12px',
                  border: '1px solid var(--border)', marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Campaign Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        Campaign Name
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{formName || 'Untitled'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        Channel
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const cfg = CAMPAIGN_TYPES.find(t => t.value === formType)
                          if (!cfg) return formType
                          return <><cfg.icon size={16} style={{ color: cfg.color }} /> {cfg.label}</>
                        })()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        Audience
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                        {AUDIENCE_OPTIONS.find(a => a.value === formAudience)?.label} ({getAudienceCount(formAudience)} customers)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        Delivery
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                        {formSchedule === 'now' ? 'Send Immediately' : `Scheduled: ${formatDate(formScheduleDate)} at ${formScheduleTime}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Message Preview
                    </div>
                    <div style={{
                      padding: '16px', background: 'var(--bg-card)', borderRadius: '10px',
                      border: '1px solid var(--border)', fontSize: '13px', lineHeight: '1.7',
                      color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                      maxHeight: '140px', overflowY: 'auto',
                    }}>
                      {messagePreview || formMessage}
                    </div>
                  </div>
                </div>

                {/* Audience estimate card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                  background: 'rgba(59,130,246,0.05)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.15)',
                  marginBottom: '20px',
                }}>
                  <Users size={22} style={{ color: 'var(--accent-bright)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      This campaign will reach {getAudienceCount(formAudience)} customer{getAudienceCount(formAudience) !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formSchedule === 'now' ? 'Messages will be sent immediately upon launch' : 'Messages will be queued for the scheduled time'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveStep(2)}>
                    <ChevronLeft size={14} style={{ marginRight: '4px' }} /> Back
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleSave(true)}>
                      Save as Draft
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(false)}
                      disabled={!formName.trim() || !formMessage.trim() || (formSchedule === 'later' && !formScheduleDate)}
                      style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                        border: 'none',
                      }}
                    >
                      <Send size={14} style={{ marginRight: '6px' }} />
                      {formSchedule === 'now' ? 'Launch Campaign' : 'Schedule Campaign'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

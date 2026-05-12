import { useEffect, useState, useMemo } from 'react'
import { Award, Gift, Crown, Star, TrendingUp, Plus, X, Edit3, Trash2, ToggleLeft, ToggleRight, Users, Zap, Trophy, Heart, Target } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }

const DEFAULT_TIERS = [
  { id: 't1', name: 'Bronze', min: 0, max: 499, perks: 'Early access to promotions, birthday bonus points', color: '#CD7F32' },
  { id: 't2', name: 'Silver', min: 500, max: 999, perks: '5% bonus points on every booking, priority support', color: '#C0C0C0' },
  { id: 't3', name: 'Gold', min: 1000, max: 2499, perks: '10% bonus points, free service upgrade once per month', color: '#FFD700' },
  { id: 't4', name: 'Platinum', min: 2500, max: null, perks: '15% bonus points, VIP priority booking, exclusive rewards', color: '#E5E4E2' },
]

const DEFAULT_REWARDS = [
  { id: 'r1', name: '10% Off Next Visit', description: 'Get 10% discount on your next booking', points: 200, type: 'discount', active: true, redeemed: 0 },
  { id: 'r2', name: 'Free Add-on Service', description: 'Enjoy a complimentary add-on with any booking', points: 500, type: 'free service', active: true, redeemed: 0 },
  { id: 'r3', name: 'VIP Priority Booking', description: 'Skip the queue with priority scheduling access', points: 1000, type: 'gift', active: true, redeemed: 0 },
]

const DEFAULT_CONFIG = {
  enabled: true,
  points_per_booking: 10,
  points_per_dollar: 1,
  point_value: 0.01,
  welcome_bonus: 50,
  referral_enabled: true,
  referral_bonus: 100,
  tiers: DEFAULT_TIERS,
  rewards: DEFAULT_REWARDS,
}

function uid() {
  try { return crypto.randomUUID() } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function tierGradient(color) {
  if (color === '#CD7F32') return 'linear-gradient(135deg, #CD7F32 0%, #8B5E3C 50%, #CD7F32 100%)'
  if (color === '#C0C0C0') return 'linear-gradient(135deg, #C0C0C0 0%, #8A8A8A 50%, #D8D8D8 100%)'
  if (color === '#FFD700') return 'linear-gradient(135deg, #FFD700 0%, #B8960F 50%, #FFE44D 100%)'
  if (color === '#E5E4E2') return 'linear-gradient(135deg, #E5E4E2 0%, #A8A8A6 30%, #F5F5F3 60%, #C0BFBD 100%)'
  return `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`
}

function tierTextColor(color) {
  if (color === '#FFD700' || color === '#E5E4E2' || color === '#C0C0C0') return '#1a1a1a'
  return '#fff'
}

export default function LoyaltyPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [customers, setCustomers] = useState([])
  const [bookings, setBookings] = useState([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingTiers, setEditingTiers] = useState(false)
  const [tierDraft, setTierDraft] = useState([])
  const [showAddReward, setShowAddReward] = useState(false)
  const [editingReward, setEditingReward] = useState(null)
  const [rewardName, setRewardName] = useState('')
  const [rewardDesc, setRewardDesc] = useState('')
  const [rewardPoints, setRewardPoints] = useState(100)
  const [rewardType, setRewardType] = useState('discount')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`loyalty_${biz.id}`)
        if (stored) setConfig(JSON.parse(stored))
        setCustomers(await dataStore.getCustomers(biz.id))
        setBookings(await dataStore.getBookings(biz.id))
      }
    }
    load()
  }, [user])

  const saveConfig = (updated) => {
    setConfig(updated)
    if (business) {
      localStorage.setItem(`loyalty_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'loyalty', updated)
    }
  }

  const curr = business?.currency || 'USD'
  const sym = CURRENCY_SYMBOLS[curr] || '$'

  const getTier = (points) => {
    const sorted = [...config.tiers].sort((a, b) => b.min - a.min)
    for (const t of sorted) {
      if (points >= t.min) return t
    }
    return config.tiers[0]
  }

  const getNextTier = (points) => {
    const sorted = [...config.tiers].sort((a, b) => a.min - b.min)
    for (const t of sorted) {
      if (points < t.min) return t
    }
    return null
  }

  const customerData = useMemo(() => {
    return customers.map(c => {
      const custBookings = bookings.filter(b => b.customer_id === c.id && b.status === 'completed')
      const totalPoints = (custBookings.length * config.points_per_booking) +
        custBookings.reduce((sum, b) => sum + Math.floor((parseFloat(b.total || b.price || 0)) * config.points_per_dollar), 0) +
        config.welcome_bonus
      const tier = getTier(totalPoints)
      const nextTier = getNextTier(totalPoints)
      const progress = nextTier ? Math.min(100, ((totalPoints - tier.min) / (nextTier.min - tier.min)) * 100) : 100
      return { ...c, totalPoints, tier, nextTier, progress, completedBookings: custBookings.length }
    }).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [customers, bookings, config])

  const totalPointsIssued = customerData.reduce((s, c) => s + c.totalPoints, 0)
  const totalRedeemed = config.rewards.reduce((s, r) => s + (r.redeemed || 0), 0)
  const pointsValue = (totalPointsIssued * config.point_value).toFixed(2)

  const updateSetting = (key, value) => {
    saveConfig({ ...config, [key]: value })
  }

  const startEditTiers = () => {
    setTierDraft(config.tiers.map(t => ({ ...t })))
    setEditingTiers(true)
  }

  const saveTiers = () => {
    saveConfig({ ...config, tiers: tierDraft })
    setEditingTiers(false)
  }

  const updateTierDraft = (idx, field, value) => {
    const updated = tierDraft.map((t, i) => i === idx ? { ...t, [field]: value } : t)
    setTierDraft(updated)
  }

  const resetRewardForm = () => {
    setRewardName('')
    setRewardDesc('')
    setRewardPoints(100)
    setRewardType('discount')
    setEditingReward(null)
  }

  const openAddReward = () => {
    resetRewardForm()
    setShowAddReward(true)
  }

  const openEditReward = (r) => {
    setEditingReward(r)
    setRewardName(r.name)
    setRewardDesc(r.description)
    setRewardPoints(r.points)
    setRewardType(r.type)
    setShowAddReward(true)
  }

  const handleSaveReward = () => {
    if (!rewardName.trim()) return
    let rewards
    if (editingReward) {
      rewards = config.rewards.map(r => r.id === editingReward.id
        ? { ...r, name: rewardName, description: rewardDesc, points: rewardPoints, type: rewardType }
        : r
      )
    } else {
      const newReward = {
        id: uid(),
        name: rewardName,
        description: rewardDesc,
        points: rewardPoints,
        type: rewardType,
        active: true,
        redeemed: 0,
      }
      rewards = [...config.rewards, newReward]
    }
    saveConfig({ ...config, rewards })
    setShowAddReward(false)
    resetRewardForm()
  }

  const toggleReward = (id) => {
    const rewards = config.rewards.map(r => r.id === id ? { ...r, active: !r.active } : r)
    saveConfig({ ...config, rewards })
  }

  const deleteReward = (id) => {
    saveConfig({ ...config, rewards: config.rewards.filter(r => r.id !== id) })
  }

  const typeBadgeClass = (type) => {
    if (type === 'discount') return 'badge badge-green'
    if (type === 'free service') return 'badge badge-blue'
    return 'badge badge-amber'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={28} style={{ color: '#FFD700' }} />
            Loyalty Program
          </h1>
          <p className="page-subtitle">Reward your customers and build lasting relationships</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: config.enabled ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>
            {config.enabled ? 'Program Active' : 'Program Disabled'}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => updateSetting('enabled', !config.enabled)}
            style={{ padding: '4px' }}
          >
            {config.enabled
              ? <ToggleRight size={28} style={{ color: 'var(--green)' }} />
              : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />
            }
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Users size={22} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div className="stat-card-label">Enrolled Customers</div>
          <div className="stat-card-value">{customerData.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <Zap size={22} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="stat-card-label">Total Points Issued</div>
          <div className="stat-card-value">{totalPointsIssued.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Gift size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div className="stat-card-label">Rewards Redeemed</div>
          <div className="stat-card-value">{totalRedeemed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <TrendingUp size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="stat-card-label">Points Value</div>
          <div className="stat-card-value">{sym}{pointsValue}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} style={{ color: 'var(--accent-bright)' }} />
            Program Settings
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </div>
        {settingsOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Points per Booking</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={config.points_per_booking}
                onChange={e => updateSetting('points_per_booking', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Points per {sym}1 Spent</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={config.points_per_dollar}
                onChange={e => updateSetting('points_per_dollar', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Point Value ({sym})</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="0.001"
                value={config.point_value}
                onChange={e => updateSetting('point_value', parseFloat(e.target.value) || 0)}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                100 pts = {sym}{(100 * config.point_value).toFixed(2)}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Welcome Bonus Points</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={config.welcome_bonus}
                onChange={e => updateSetting('welcome_bonus', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Referral Bonus</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => updateSetting('referral_enabled', !config.referral_enabled)}
                  style={{ padding: '2px' }}
                >
                  {config.referral_enabled
                    ? <ToggleRight size={22} style={{ color: 'var(--green)' }} />
                    : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={config.referral_bonus}
                  onChange={e => updateSetting('referral_bonus', parseInt(e.target.value) || 0)}
                  disabled={!config.referral_enabled}
                  style={{ opacity: config.referral_enabled ? 1 : 0.4 }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {config.referral_enabled ? `${config.referral_bonus} pts per referral` : 'Referrals disabled'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} style={{ color: '#FFD700' }} />
            Reward Tiers
          </span>
          {!editingTiers ? (
            <button className="btn btn-secondary btn-sm" onClick={startEditTiers}>
              <Edit3 size={14} style={{ marginRight: '6px' }} /> Edit Tiers
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingTiers(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveTiers}>Save Tiers</button>
            </div>
          )}
        </div>

        {!editingTiers ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {config.tiers.map((tier, idx) => (
              <div key={tier.id} style={{
                borderRadius: '16px',
                background: tierGradient(tier.color),
                padding: '32px 24px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 6px 24px ${tier.color}40`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: `1px solid ${tier.color}44`,
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-10px',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                }} />
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                    {idx === 0 && <Award size={26} style={{ color: tierTextColor(tier.color) }} />}
                    {idx === 1 && <Star size={26} style={{ color: tierTextColor(tier.color) }} />}
                    {idx === 2 && <Trophy size={26} style={{ color: tierTextColor(tier.color) }} />}
                    {idx === 3 && <Crown size={26} style={{ color: tierTextColor(tier.color) }} />}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: tierTextColor(tier.color),
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>{tier.name}</div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: tierTextColor(tier.color),
                    opacity: 0.85,
                    marginBottom: '16px',
                  }}>
                    {tier.max !== null ? `${tier.min.toLocaleString()} – ${tier.max.toLocaleString()} pts` : `${tier.min.toLocaleString()}+ pts`}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: tierTextColor(tier.color),
                    opacity: 0.75,
                    lineHeight: '1.6',
                  }}>{tier.perks}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {tierDraft.map((tier, idx) => (
              <div key={tier.id} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '12px',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}>
                <input
                  type="text"
                  className="form-input"
                  value={tier.name}
                  onChange={e => updateTierDraft(idx, 'name', e.target.value)}
                  placeholder="Tier name"
                />
                <input
                  type="number"
                  className="form-input"
                  value={tier.min}
                  onChange={e => updateTierDraft(idx, 'min', parseInt(e.target.value) || 0)}
                  placeholder="Min pts"
                />
                <input
                  type="number"
                  className="form-input"
                  value={tier.max === null ? '' : tier.max}
                  onChange={e => updateTierDraft(idx, 'max', e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  placeholder="No limit"
                />
                <input
                  type="text"
                  className="form-input"
                  value={tier.perks}
                  onChange={e => updateTierDraft(idx, 'perks', e.target.value)}
                  placeholder="Perks description"
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: tierGradient(tier.color),
                  border: '2px solid var(--border)',
                  flexShrink: 0,
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={18} style={{ color: 'var(--green)' }} />
            Rewards Catalog
          </span>
          <button className="btn btn-primary btn-sm" onClick={openAddReward}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Reward
          </button>
        </div>

        {showAddReward && (
          <div style={{
            margin: '16px 0',
            padding: '20px',
            background: 'var(--bg)',
            borderRadius: '10px',
            border: '1px solid var(--accent)',
            boxShadow: '0 0 20px rgba(59,130,246,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {editingReward ? 'Edit Reward' : 'New Reward'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddReward(false); resetRewardForm() }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Reward Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={rewardName}
                  onChange={e => setRewardName(e.target.value)}
                  placeholder="e.g. 10% Off Next Visit"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={rewardDesc}
                  onChange={e => setRewardDesc(e.target.value)}
                  placeholder="What the customer gets"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Points Cost</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={rewardPoints}
                  onChange={e => setRewardPoints(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reward Type</label>
                <select className="form-select" value={rewardType} onChange={e => setRewardType(e.target.value)}>
                  <option value="discount">Discount</option>
                  <option value="free service">Free Service</option>
                  <option value="gift">Gift</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveReward} disabled={!rewardName.trim()}>
                {editingReward ? 'Update Reward' : 'Add Reward'}
              </button>
            </div>
          </div>
        )}

        {config.rewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No rewards in catalog. Add one to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {config.rewards.map(r => (
              <div key={r.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                background: 'var(--bg)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                opacity: r.active ? 1 : 0.5,
                transition: 'opacity 0.2s',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: r.type === 'discount' ? 'rgba(34,197,94,0.1)' : r.type === 'free service' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {r.type === 'discount' && <Zap size={20} style={{ color: 'var(--green)' }} />}
                  {r.type === 'free service' && <Heart size={20} style={{ color: 'var(--accent-bright)' }} />}
                  {r.type === 'gift' && <Gift size={20} style={{ color: 'var(--amber)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{r.name}</span>
                    <span className="badge badge-rose" style={{ fontSize: '11px', fontWeight: 700 }}>{r.points.toLocaleString()} pts</span>
                    <span className={typeBadgeClass(r.type)} style={{ fontSize: '11px', textTransform: 'capitalize' }}>{r.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>{r.description}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{r.redeemed || 0} redeemed</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleReward(r.id)} title={r.active ? 'Deactivate' : 'Activate'}>
                    {r.active
                      ? <ToggleRight size={18} style={{ color: 'var(--green)' }} />
                      : <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditReward(r)} title="Edit">
                    <Edit3 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteReward(r.id)} title="Delete" style={{ color: 'var(--rose)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} style={{ color: 'var(--amber)' }} />
          Customer Leaderboard
        </div>
        {customerData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No customers enrolled yet. Customers earn points when they complete bookings.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
            {customerData.slice(0, 20).map((c, idx) => {
              const rank = idx + 1
              return (
                <div key={c.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  background: rank <= 3 ? `linear-gradient(90deg, ${c.tier.color}08 0%, transparent 100%)` : 'var(--bg)',
                  borderRadius: '10px',
                  border: `1px solid ${rank <= 3 ? c.tier.color + '30' : 'var(--border)'}`,
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: rank <= 3 ? '14px' : '13px',
                    background: rank === 1 ? 'linear-gradient(135deg, #FFD700, #B8960F)' : rank === 2 ? 'linear-gradient(135deg, #C0C0C0, #8A8A8A)' : rank === 3 ? 'linear-gradient(135deg, #CD7F32, #8B5E3C)' : 'var(--border)',
                    color: rank <= 3 ? '#1a1a1a' : 'var(--text-muted)',
                  }}>
                    {rank}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: '20px',
                        background: tierGradient(c.tier.color),
                        color: tierTextColor(c.tier.color),
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>{c.tier.name}</span>
                      {c.email && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1, maxWidth: '200px' }}>
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'var(--border)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${c.progress}%`,
                            borderRadius: '3px',
                            background: c.nextTier ? `linear-gradient(90deg, ${c.tier.color}, ${c.nextTier.color})` : tierGradient(c.tier.color),
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {c.nextTier ? `${c.nextTier.min - c.totalPoints} pts to ${c.nextTier.name}` : 'Max tier reached'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        Member since {formatDate(c.created_at)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-bright)' }}>
                      {c.totalPoints.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>points</div>
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

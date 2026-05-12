import { useEffect, useState } from 'react'
import {
  MapPin, Plus, X, Building2, Phone, Mail, Clock, Users,
  Star, Edit3, Trash2, ToggleLeft, ToggleRight, Check, Globe,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function defaultHours() {
  const h = {}
  DAYS.forEach(d => {
    h[d] = { open: '09:00', close: '17:00', enabled: d !== 'sat' && d !== 'sun' }
  })
  return h
}

function emptyLocation() {
  return {
    id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    email: '',
    hours: defaultHours(),
    staff_ids: [],
    service_ids: [],
    active: true,
    is_primary: false,
    created_at: todayStr(),
  }
}

function formatTime12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function summarizeHours(hours) {
  if (!hours) return 'Not set'
  const enabledDays = DAYS.filter(d => hours[d]?.enabled)
  if (enabledDays.length === 0) return 'Closed'
  if (enabledDays.length === 7) {
    const allSame = enabledDays.every(d => hours[d].open === hours[enabledDays[0]].open && hours[d].close === hours[enabledDays[0]].close)
    if (allSame) return `Every day ${formatTime12(hours[enabledDays[0]].open)}-${formatTime12(hours[enabledDays[0]].close)}`
  }
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']
  const weekend = ['sat', 'sun']
  const wdEnabled = weekdays.every(d => hours[d]?.enabled)
  const weEnabled = weekend.every(d => hours[d]?.enabled)
  const wdSame = wdEnabled && weekdays.every(d => hours[d].open === hours.mon.open && hours[d].close === hours.mon.close)
  if (wdSame && !weEnabled) return `Mon-Fri ${formatTime12(hours.mon.open)}-${formatTime12(hours.mon.close)}`
  if (wdSame && weEnabled) {
    const weSame = weekend.every(d => hours[d].open === hours.sat.open && hours[d].close === hours.sat.close)
    if (weSame) return `Mon-Fri ${formatTime12(hours.mon.open)}-${formatTime12(hours.mon.close)}, Sat-Sun ${formatTime12(hours.sat.open)}-${formatTime12(hours.sat.close)}`
  }
  return `${enabledDays.length} days/week`
}

export default function LocationsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [locations, setLocations] = useState([])
  const [staff, setStaff] = useState([])
  const [services, setServices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyLocation())

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const [s, svc] = await Promise.all([
          dataStore.getStaff(biz.id),
          dataStore.getServices(biz.id),
        ])
        setStaff(s)
        setServices(svc)
        const stored = localStorage.getItem(`locations_${biz.id}`)
        if (stored) setLocations(JSON.parse(stored))
      }
    }
    load()
  }, [user])

  const saveLocations = (updated) => {
    setLocations(updated)
    if (business) {
      localStorage.setItem(`locations_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'locations', updated)
    }
  }

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const updateHourField = (day, field, value) => {
    setForm(prev => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
    }))
  }

  const toggleStaff = (staffId) => {
    setForm(prev => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(staffId)
        ? prev.staff_ids.filter(id => id !== staffId)
        : [...prev.staff_ids, staffId],
    }))
  }

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }))
  }

  const resetForm = () => {
    setForm(emptyLocation())
    setEditingId(null)
  }

  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (loc) => {
    setForm({ ...loc })
    setEditingId(loc.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editingId) {
      saveLocations(locations.map(l => l.id === editingId ? { ...form } : l))
    } else {
      const newLoc = {
        ...form,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        created_at: todayStr(),
        is_primary: locations.length === 0,
      }
      saveLocations([newLoc, ...locations])
    }
    setShowForm(false)
    resetForm()
  }

  const deleteLocation = (id) => {
    const updated = locations.filter(l => l.id !== id)
    if (updated.length > 0 && !updated.some(l => l.is_primary)) {
      updated[0].is_primary = true
    }
    saveLocations(updated)
  }

  const toggleActive = (id) => {
    saveLocations(locations.map(l => l.id === id ? { ...l, active: !l.active } : l))
  }

  const setPrimary = (id) => {
    saveLocations(locations.map(l => ({ ...l, is_primary: l.id === id })))
  }

  const totalStaff = new Set(locations.flatMap(l => l.staff_ids || [])).size
  const totalServices = new Set(locations.flatMap(l => l.service_ids || [])).size
  const activeCount = locations.filter(l => l.active).length

  const checkboxStyle = (checked) => ({
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: checked ? '2px solid var(--accent-bright)' : '2px solid var(--border)',
    background: checked ? 'var(--accent)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  })

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Manage your business locations, staff assignments, and operating hours</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Location
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Building2 size={22} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div className="stat-card-label">Total Locations</div>
          <div className="stat-card-value">{locations.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <MapPin size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div className="stat-card-label">Active Locations</div>
          <div className="stat-card-value">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <Users size={22} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="stat-card-label">Total Staff</div>
          <div className="stat-card-value">{totalStaff}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Globe size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="stat-card-label">Total Services</div>
          <div className="stat-card-value">{totalServices}</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--accent)', boxShadow: '0 0 20px rgba(59,130,246,0.1)' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{editingId ? 'Edit Location' : 'New Location'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); resetForm() }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location Name *</label>
              <input type="text" className="form-input" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Main Office" />
            </div>
            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input type="text" className="form-input" value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="123 Business Ave" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input type="text" className="form-input" value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="New York" />
            </div>
            <div className="form-group">
              <label className="form-label">State / Province</label>
              <input type="text" className="form-input" value={form.state} onChange={e => updateField('state', e.target.value)} placeholder="NY" />
            </div>
            <div className="form-group">
              <label className="form-label">ZIP / Postal Code</label>
              <input type="text" className="form-input" value={form.zip} onChange={e => updateField('zip', e.target.value)} placeholder="10001" />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input type="text" className="form-input" value={form.country} onChange={e => updateField('country', e.target.value)} placeholder="United States" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="location@business.com" />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} style={{ color: 'var(--text-secondary)' }} /> Operating Hours
            </label>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {DAYS.map((day, i) => (
                <div key={day} style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 40px 1fr',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < DAYS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: form.hours[day].enabled ? 'var(--text)' : 'var(--text-muted)' }}>
                    {DAY_LABELS[day]}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateHourField(day, 'enabled', !form.hours[day].enabled)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {form.hours[day].enabled
                      ? <ToggleRight size={22} style={{ color: 'var(--green)' }} />
                      : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>
                  {form.hours[day].enabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="time" className="form-input" value={form.hours[day].open} onChange={e => updateHourField(day, 'open', e.target.value)} style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                      <input type="time" className="form-input" value={form.hours[day].close} onChange={e => updateHourField(day, 'close', e.target.value)} style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {staff.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} style={{ color: 'var(--text-secondary)' }} /> Assign Staff
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {staff.map(s => {
                  const selected = form.staff_ids.includes(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStaff(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
                      background: selected ? 'rgba(59,130,246,0.1)' : 'var(--bg)',
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease',
                    }}>
                      <div style={checkboxStyle(selected)}>
                        {selected && <Check size={12} style={{ color: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: '13px', color: selected ? 'var(--accent-bright)' : 'var(--text-secondary)' }}>
                        {s.name || s.full_name || s.email}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} style={{ color: 'var(--text-secondary)' }} /> Assign Services
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {services.map(svc => {
                  const selected = form.service_ids.includes(svc.id)
                  return (
                    <button key={svc.id} type="button" onClick={() => toggleService(svc.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
                      background: selected ? 'rgba(167,139,250,0.1)' : 'var(--bg)',
                      border: selected ? '1px solid var(--purple)' : '1px solid var(--border)',
                      borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease',
                    }}>
                      <div style={{ ...checkboxStyle(selected), borderColor: selected ? 'var(--purple)' : 'var(--border)', background: selected ? 'var(--purple)' : 'transparent' }}>
                        {selected && <Check size={12} style={{ color: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: '13px', color: selected ? 'var(--purple)' : 'var(--text-secondary)' }}>
                        {svc.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</span>
              <button type="button" onClick={() => updateField('active', !form.active)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {form.active
                  ? <><ToggleRight size={24} style={{ color: 'var(--green)' }} /><span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>Active</span></>
                  : <><ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} /><span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Inactive</span></>
                }
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? 'Save Changes' : 'Create Location'}
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 && !showForm ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
            <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>No locations yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Add your first business location to manage staff, services, and hours across multiple sites.</div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={14} style={{ marginRight: '4px' }} /> Add Location
            </button>
          </div>
        </div>
      ) : locations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {locations.map(loc => {
            const locStaff = staff.filter(s => (loc.staff_ids || []).includes(s.id))
            const locServices = services.filter(s => (loc.service_ids || []).includes(s.id))
            return (
              <div key={loc.id} className="card" style={{
                position: 'relative',
                opacity: loc.active ? 1 : 0.6,
                border: loc.is_primary ? '1px solid var(--amber)' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}>
                {loc.is_primary && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '20px',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  }}>
                    <Star size={12} style={{ color: 'var(--amber)', fill: 'var(--amber)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary</span>
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: loc.active ? 'rgba(59,130,246,0.1)' : 'rgba(100,100,100,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Building2 size={18} style={{ color: loc.active ? 'var(--accent-bright)' : 'var(--text-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: loc.is_primary ? '90px' : 0 }}>
                        {loc.name}
                      </div>
                      <span className={`badge ${loc.active ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '11px', marginTop: '2px' }}>
                        {loc.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {(loc.address || loc.city) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                    <span>
                      {[loc.address, [loc.city, loc.state].filter(Boolean).join(', '), loc.zip, loc.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {loc.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{loc.phone}</span>
                  </div>
                )}

                {loc.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{loc.email}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>{summarizeHours(loc.hours)}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)',
                  }}>
                    <Users size={13} style={{ color: 'var(--purple)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{locStaff.length} Staff</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)',
                  }}>
                    <Globe size={13} style={{ color: 'var(--amber)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{locServices.length} Services</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(loc)} title="Edit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Edit3 size={14} /> Edit
                  </button>
                  {!loc.is_primary && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setPrimary(loc.id)} title="Set as Primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={14} style={{ color: 'var(--amber)' }} /> Primary
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(loc.id)} title={loc.active ? 'Deactivate' : 'Activate'} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loc.active
                      ? <><ToggleRight size={16} style={{ color: 'var(--green)' }} /><span style={{ fontSize: '12px' }}>On</span></>
                      : <><ToggleLeft size={16} /><span style={{ fontSize: '12px' }}>Off</span></>
                    }
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteLocation(loc.id)} title="Delete" style={{ marginLeft: 'auto', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

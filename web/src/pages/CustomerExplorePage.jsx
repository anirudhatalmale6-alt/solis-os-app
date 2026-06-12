import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, MapPin, Star, Clock, ChevronRight, LogOut, CalendarCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { supabase } from '../lib/supabase'

const INDUSTRY_LABELS = {
  salon: 'Salon', barber: 'Barber Shop', garage: 'Auto Garage', clinic: 'Clinic',
  real_estate: 'Real Estate', lessons: 'Lessons & Tutoring', restaurant: 'Restaurant',
  spa: 'Spa & Wellness', gym: 'Gym & Fitness', photography: 'Photography',
  consulting: 'Consulting', retail: 'Retail', other: 'Business',
}

const INDUSTRY_ICONS = {
  salon: '💇', barber: '💈', garage: '🔧', clinic: '🏥', real_estate: '🏠',
  lessons: '📚', restaurant: '🍽', spa: '💆', gym: '💪', photography: '📷',
  consulting: '💼', retail: '🛍', other: '🏢',
}

export default function CustomerExplorePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [myBookings, setMyBookings] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const all = await dataStore.listAllBusinesses()
        setBusinesses(all.filter(b => b.name))
      } catch {}

      if (user?.email) {
        try {
          const { data } = await supabase
            .from('bookings')
            .select('*, businesses(name)')
            .eq('customer_email', user.email)
            .gte('date', new Date().toISOString().slice(0, 10))
            .order('date', { ascending: true })
            .limit(10)
          if (data) setMyBookings(data)
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [user])

  const filtered = businesses.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (b.name || '').toLowerCase().includes(q) ||
      (b.industry || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.address || '').toLowerCase().includes(q)
  })

  const handleSignOut = async () => {
    localStorage.removeItem('solis_user_role')
    await signOut()
    navigate('/login')
  }

  const switchToBusiness = () => {
    localStorage.setItem('solis_user_role', 'business')
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f7f8fc)' }}>
      <nav style={{
        background: 'var(--bg-card, #fff)', borderBottom: '1px solid var(--border, #e5e7eb)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo-icon.png" alt="Solis" style={{ height: '32px' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Solis OS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={switchToBusiness} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
            color: 'var(--text-secondary, #6b7280)', cursor: 'pointer',
          }}>
            Switch to Business
          </button>
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)',
            color: '#ef4444', cursor: 'pointer',
          }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
            Explore Businesses
          </h1>
          <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: '15px' }}>
            Find and book services from businesses near you
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e5e7eb)',
          borderRadius: '12px', padding: '0 14px', marginBottom: '24px',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted, #9ca3af)' }} />
          <input
            type="text"
            placeholder="Search by name, industry, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'none', padding: '14px 0',
              fontSize: '15px', color: 'var(--text, #1a1d2e)', outline: 'none',
            }}
          />
        </div>

        {myBookings.length > 0 && (
          <div style={{
            background: 'var(--bg-card, #fff)', borderRadius: '14px',
            border: '1px solid var(--border, #e5e7eb)', padding: '20px', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CalendarCheck size={18} style={{ color: 'var(--amber, #f59e0b)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
                My Upcoming Bookings
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myBookings.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  background: 'var(--bg, #f7f8fc)', borderRadius: '10px', fontSize: '13px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--amber, #f59e0b)', minWidth: '80px' }}>
                    {new Date(b.date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--text-muted, #9ca3af)' }}>
                    {b.time ? (() => { const [h, m] = b.time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` })() : ''}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{b.businesses?.name || 'Business'}</span>
                  <span className={`badge ${b.status === 'confirmed' ? 'badge-green' : b.status === 'completed' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '11px' }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #9ca3af)' }}>
            Loading businesses...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #9ca3af)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>
              {search ? 'No businesses found' : 'No businesses registered yet'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {search ? 'Try a different search term' : 'Be the first to register your business!'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filtered.map(biz => (
              <Link key={biz.id} to={`/book/${biz.slug || biz.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px',
                background: 'var(--bg-card, #fff)', borderRadius: '14px',
                border: '1px solid var(--border, #e5e7eb)', textDecoration: 'none',
                color: 'inherit', transition: 'all 0.15s',
              }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                }}>
                  {INDUSTRY_ICONS[biz.industry] || '🏢'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>{biz.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>
                    <span>{INDUSTRY_LABELS[biz.industry] || biz.industry || 'Business'}</span>
                    {biz.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={12} /> {biz.city}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-muted, #9ca3af)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

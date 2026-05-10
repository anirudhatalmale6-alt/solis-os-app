import { useEffect, useState } from 'react'
import { UserRound, Search, Phone, Mail, Calendar, Plus, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

export default function CustomersPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [viewCustomer, setViewCustomer] = useState(null)

  const loadData = async () => {
    if (!user) return
    const biz = await dataStore.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      setCustomers(await dataStore.getCustomers(biz.id))
      setBookings(await dataStore.getBookings(biz.id))
    }
  }

  useEffect(() => { loadData() }, [user])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormNotes('')
    setEditing(null)
  }

  const openAdd = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setFormName(c.name)
    setFormEmail(c.email || '')
    setFormPhone(c.phone || '')
    setFormNotes(c.notes || '')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName) return
    if (editing) {
      await dataStore.updateCustomer(editing.id, {
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        notes: formNotes || null,
      })
    } else {
      await dataStore.addCustomer({
        business_id: business.id,
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        notes: formNotes || null,
      })
    }
    setShowModal(false)
    resetForm()
    await loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return
    await dataStore.deleteCustomer(id)
    setViewCustomer(null)
    await loadData()
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
  })

  const getCustomerBookings = (customerName) => {
    return bookings.filter(b =>
      b.customer_name && b.customer_name.toLowerCase() === customerName.toLowerCase()
    )
  }

  const getCustomerStats = (customerName) => {
    const cb = getCustomerBookings(customerName)
    const total = cb.length
    const completed = cb.filter(b => b.status === 'completed').length
    const lastBooking = cb.length > 0 ? cb[cb.length - 1] : null
    return { total, completed, lastBooking }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <p className="page-subtitle">Manage your customer relationships</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><UserRound size={22} /></div>
          <div className="stat-card-label">Total Customers</div>
          <div className="stat-card-value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Mail size={22} /></div>
          <div className="stat-card-label">With Email</div>
          <div className="stat-card-value">{customers.filter(c => c.email).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Phone size={22} /></div>
          <div className="stat-card-label">With Phone</div>
          <div className="stat-card-value">{customers.filter(c => c.phone).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>All Customers ({filtered.length})</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={16} /> Add Customer
          </button>
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UserRound size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {search ? 'No customers found' : 'No customers yet'}
            </div>
            <div className="empty-state-text">
              {search
                ? 'Try a different search term.'
                : 'Add your first customer to start building your CRM.'}
            </div>
            {!search && (
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <Plus size={16} /> Add Customer
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Bookings</th>
                  <th>Last Visit</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const stats = getCustomerStats(c.name)
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setViewCustomer(c)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
                            color: '#fff', flexShrink: 0
                          }}>
                            {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{c.name}</div>
                            {c.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          {c.email && <div style={{ color: 'var(--text-secondary)' }}>{c.email}</div>}
                          {c.phone && <div style={{ color: 'var(--text-muted)' }}>{c.phone}</div>}
                          {!c.email && !c.phone && <span style={{ color: 'var(--text-muted)' }}>--</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${stats.total > 0 ? 'badge-blue' : 'badge-amber'}`}>
                          {stats.total} booking{stats.total !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {stats.lastBooking ? stats.lastBooking.date : '--'}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Panel */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#fff'
                }}>
                  {viewCustomer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>{viewCustomer.name}</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Customer</div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setViewCustomer(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {viewCustomer.email && (
                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontSize: '13px', color: 'var(--accent-bright)' }}>{viewCustomer.email}</div>
                </div>
              )}
              {viewCustomer.phone && (
                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Phone</div>
                  <div style={{ fontSize: '13px' }}>{viewCustomer.phone}</div>
                </div>
              )}
            </div>

            {viewCustomer.notes && (
              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{viewCustomer.notes}</div>
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Booking History</div>
              {(() => {
                const cb = getCustomerBookings(viewCustomer.name)
                if (cb.length === 0) return (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No bookings yet</div>
                )
                return cb.slice(-5).reverse().map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{b.service_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.date} at {b.time}</div>
                    </div>
                    <span className={`badge ${b.status === 'completed' ? 'badge-green' : b.status === 'confirmed' ? 'badge-blue' : 'badge-rose'}`}>
                      {b.status}
                    </span>
                  </div>
                ))
              })()}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setViewCustomer(null); openEdit(viewCustomer) }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(viewCustomer.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? 'Edit Customer' : 'Add Customer'}</h2>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input type="text" className="form-input" placeholder="e.g. Jane Smith" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="jane@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+1 555 123 4567" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                placeholder="Any notes about this customer..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Save Changes' : 'Add Customer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

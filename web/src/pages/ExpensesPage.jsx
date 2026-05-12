import { useEffect, useState } from 'react'
import { Receipt, Plus, X, DollarSign, TrendingDown, Calendar, Tag, Trash2, Edit, Filter } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const CATEGORIES = [
  'Rent', 'Utilities', 'Supplies', 'Equipment', 'Marketing',
  'Insurance', 'Payroll', 'Software', 'Maintenance', 'Other',
]

const CAT_COLORS = {
  Rent: 'var(--blue2)', Utilities: 'var(--amber)', Supplies: 'var(--green)',
  Equipment: 'var(--purple)', Marketing: 'var(--rose)', Insurance: 'var(--teal)',
  Payroll: 'var(--gold)', Software: 'var(--accent-bright)', Maintenance: 'var(--text-muted)', Other: 'var(--text-secondary)',
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function monthStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function formatCurrency(amount, curr = 'USD') {
  const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }
  return (symbols[curr] || '$') + Number(amount || 0).toFixed(2)
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [editId, setEditId] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterMonth, setFilterMonth] = useState(monthStr())

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Supplies')
  const [date, setDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState('none')

  useEffect(() => {
    if (!user) return
    dataStore.getBusiness(user.id).then(biz => {
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`expenses_${biz.id}`)
        if (stored) setExpenses(JSON.parse(stored))
      }
    })
  }, [user])

  const save = (data) => {
    if (!business) return
    localStorage.setItem(`expenses_${business.id}`, JSON.stringify(data))
    syncedSet(business.id, 'expenses', data)
    setExpenses(data)
  }

  const resetForm = () => {
    setName(''); setAmount(''); setCategory('Supplies')
    setDate(todayStr()); setNotes(''); setRecurring('none')
    setEditId(null); setShowNew(false)
  }

  const handleSave = () => {
    if (!name || !amount) return
    const entry = {
      id: editId || crypto.randomUUID(),
      name, amount: parseFloat(amount), category, date, notes, recurring,
      created: editId ? expenses.find(e => e.id === editId)?.created : new Date().toISOString(),
    }
    let updated
    if (editId) {
      updated = expenses.map(e => e.id === editId ? entry : e)
    } else {
      updated = [entry, ...expenses]
    }
    save(updated)
    resetForm()
  }

  const handleDelete = (id) => {
    save(expenses.filter(e => e.id !== id))
  }

  const handleEdit = (exp) => {
    setEditId(exp.id); setName(exp.name); setAmount(String(exp.amount))
    setCategory(exp.category); setDate(exp.date); setNotes(exp.notes || '')
    setRecurring(exp.recurring || 'none'); setShowNew(true)
  }

  const filtered = expenses.filter(e => {
    if (filterCat !== 'all' && e.category !== filterCat) return false
    if (filterMonth && !e.date.startsWith(filterMonth)) return false
    return true
  }).sort((a, b) => b.date.localeCompare(a.date))

  const totalThisMonth = expenses
    .filter(e => e.date.startsWith(monthStr()))
    .reduce((s, e) => s + e.amount, 0)

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  const catBreakdown = {}
  filtered.forEach(e => {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount
  })
  const maxCat = Math.max(...Object.values(catBreakdown), 1)

  const curr = business?.currency || 'USD'

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowNew(true) }}>
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>{editId ? 'Edit Expense' : 'New Expense'}</h3>
              <button onClick={() => resetForm()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Office supplies, electricity bill..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input className="form-input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Recurring</label>
                <select className="form-select" value={recurring} onChange={e => setRecurring(e.target.value)}>
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." style={{ resize: 'vertical' }} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => resetForm()}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name || !amount}>
                {editId ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><DollarSign size={22} /></div>
          <div className="stat-card-label">This Month</div>
          <div className="stat-card-value" style={{ color: 'var(--rose)' }}>{formatCurrency(totalThisMonth, curr)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Receipt size={22} /></div>
          <div className="stat-card-label">Total Entries</div>
          <div className="stat-card-value">{expenses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><TrendingDown size={22} /></div>
          <div className="stat-card-label">Avg Per Entry</div>
          <div className="stat-card-value">{formatCurrency(expenses.length ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0, curr)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} />
            <span>Filters</span>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''} &middot; {formatCurrency(totalFiltered, curr)}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <select className="form-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Time</option>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() - i)
                const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return <option key={val} value={val}>{label}</option>
              })}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {Object.keys(catBreakdown).length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">Breakdown by Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>{cat}</div>
                <div style={{ flex: 1, height: '24px', background: 'var(--bg)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${(val / maxCat) * 100}%`, height: '100%',
                    background: CAT_COLORS[cat] || 'var(--accent)',
                    borderRadius: '6px', transition: 'width 0.5s ease', opacity: 0.7,
                    minWidth: '2px',
                  }} />
                </div>
                <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{formatCurrency(val, curr)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Receipt size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">No expenses yet</div>
            <div className="empty-state-text">Start tracking your business expenses to see spending patterns and manage your budget.</div>
          </div>
        </div>
      ) : (
        filtered.map(exp => (
          <div key={exp.id} className="card" style={{ marginBottom: '8px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: `${CAT_COLORS[exp.category] || 'var(--accent)'}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Tag size={18} style={{ color: CAT_COLORS[exp.category] || 'var(--accent)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{exp.category}</span>
                    <span>&middot;</span>
                    <span>{new Date(exp.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {exp.recurring && exp.recurring !== 'none' && (
                      <span className="badge" style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(167,139,250,0.1)', color: 'var(--purple)' }}>{exp.recurring}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--rose)' }}>{formatCurrency(exp.amount, curr)}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(exp)} style={{ padding: '6px 8px' }}>
                  <Edit size={14} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.id)} style={{ padding: '6px 8px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {exp.notes && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '54px' }}>{exp.notes}</div>
            )}
          </div>
        ))
      )}
    </>
  )
}

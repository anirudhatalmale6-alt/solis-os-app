import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { store } from '../lib/store'

export default function StaffPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [staff, setStaff] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formActive, setFormActive] = useState(true)

  const loadData = () => {
    if (!user) return
    const biz = store.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      setStaff(store.getStaff(biz.id))
    }
  }

  useEffect(() => { loadData() }, [user])

  const resetForm = () => {
    setFormName('')
    setFormRole('')
    setFormEmail('')
    setFormActive(true)
    setEditing(null)
  }

  const openAdd = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (member) => {
    setEditing(member)
    setFormName(member.name)
    setFormRole(member.role)
    setFormEmail(member.email || '')
    setFormActive(member.is_active !== false)
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formName || !formRole) return

    if (editing) {
      store.updateStaff(editing.id, {
        name: formName,
        role: formRole,
        email: formEmail,
        is_active: formActive,
      })
    } else {
      store.addStaff({
        business_id: business.id,
        name: formName,
        role: formRole,
        email: formEmail,
      })
    }

    setShowModal(false)
    resetForm()
    loadData()
  }

  const handleDelete = (id) => {
    if (!confirm('Remove this staff member?')) return
    store.deleteStaff(id)
    loadData()
  }

  const getInitials = (name) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <p className="page-subtitle">Manage your team members</p>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Team Members ({staff.length})</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            + Add Staff
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No team members yet</div>
            <div className="empty-state-text">
              Add your first staff member to start building your team.
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              + Add Staff
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                          {getInitials(member.name)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                      </div>
                    </td>
                    <td>{member.role}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{member.email || '--'}</td>
                    <td>
                      <span className={`badge ${member.is_active !== false ? 'badge-green' : 'badge-rose'}`}>
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(member)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(member.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? 'Edit Staff Member' : 'Add Staff Member'}</h2>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Smith"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Stylist, Mechanic, Nurse"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                type="email"
                className="form-input"
                placeholder="jane@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            {editing && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormActive(e.target.value === 'active')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editing ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

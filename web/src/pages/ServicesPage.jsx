import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

export default function ServicesPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formActive, setFormActive] = useState(true)

  const loadData = async () => {
    if (!user) return
    const biz = await dataStore.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      setServices(await dataStore.getServices(biz.id))
    }
  }

  useEffect(() => { loadData() }, [user])

  const resetForm = () => {
    setFormName('')
    setFormPrice('')
    setFormDuration('')
    setFormActive(true)
    setEditing(null)
  }

  const openAdd = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (svc) => {
    setEditing(svc)
    setFormName(svc.name)
    setFormPrice(String(svc.price))
    setFormDuration(String(svc.duration))
    setFormActive(svc.is_active !== false)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName || !formPrice || !formDuration) return

    if (editing) {
      await dataStore.updateService(editing.id, {
        name: formName,
        price: parseFloat(formPrice),
        duration: parseInt(formDuration),
        is_active: formActive,
      })
    } else {
      await dataStore.addService({
        business_id: business.id,
        name: formName,
        price: parseFloat(formPrice),
        duration: parseInt(formDuration),
      })
    }

    setShowModal(false)
    resetForm()
    await loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return
    await dataStore.deleteService(id)
    await loadData()
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <p className="page-subtitle">Manage the services your business offers</p>
      </div>

      <div className="card">
        <div className="card-title">
          <span>All Services ({services.length})</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            + Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛠</div>
            <div className="empty-state-title">No services yet</div>
            <div className="empty-state-text">
              Add your first service to start managing your business.
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              + Add Service
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td style={{ fontWeight: 500 }}>{svc.name}</td>
                    <td>${svc.price}</td>
                    <td>{svc.duration} min</td>
                    <td>
                      <span className={`badge ${svc.is_active !== false ? 'badge-green' : 'badge-rose'}`}>
                        {svc.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(svc)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(svc.id)}>
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
            <h2 className="modal-title">{editing ? 'Edit Service' : 'Add Service'}</h2>

            <div className="form-group">
              <label className="form-label">Service Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Haircut"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="35"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                className="form-input"
                placeholder="45"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
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
                {editing ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

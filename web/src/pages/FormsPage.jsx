import { useEffect, useState, useMemo } from 'react'
import { FileText, Plus, X, Type, AlignLeft, Mail, Phone, Hash, Calendar, ChevronDown, ChevronUp, CheckSquare, Circle, Upload, PenTool, LayoutList, Copy, Eye, Edit3, Trash2, Download, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Layers } from 'lucide-react'
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

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const FIELD_TYPES = [
  { value: 'short_text', label: 'Short Text', icon: Type },
  { value: 'long_text', label: 'Long Text', icon: AlignLeft },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'radio', label: 'Radio', icon: Circle },
  { value: 'file_upload', label: 'File Upload', icon: Upload },
  { value: 'signature', label: 'Signature', icon: PenTool },
  { value: 'section_header', label: 'Section Header', icon: LayoutList },
]

const TEMPLATES = [
  {
    name: 'New Client Intake',
    description: 'Collect essential information from new clients before their first appointment.',
    fields: [
      { id: uid(), type: 'short_text', label: 'Full Name', placeholder: 'Enter your full name', required: true, options: [] },
      { id: uid(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true, options: [] },
      { id: uid(), type: 'phone', label: 'Phone Number', placeholder: '(555) 123-4567', required: true, options: [] },
      { id: uid(), type: 'long_text', label: 'Known Allergies', placeholder: 'List any allergies we should be aware of...', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Preferences or Special Requests', placeholder: 'Tell us about your preferences...', required: false, options: [] },
      { id: uid(), type: 'dropdown', label: 'How did you hear about us?', placeholder: 'Select one', required: false, options: ['Google Search', 'Social Media', 'Friend/Family Referral', 'Walk-in', 'Advertisement', 'Other'] },
    ],
  },
  {
    name: 'Medical History',
    description: 'Gather medical background for health and wellness services.',
    fields: [
      { id: uid(), type: 'section_header', label: 'Medical Information', placeholder: '', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Current Medical Conditions', placeholder: 'List any conditions you are currently being treated for...', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Current Medications', placeholder: 'List all medications you are currently taking...', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Allergies', placeholder: 'List any known allergies (medications, foods, materials)...', required: true, options: [] },
      { id: uid(), type: 'section_header', label: 'Emergency Contact', placeholder: '', required: false, options: [] },
      { id: uid(), type: 'short_text', label: 'Emergency Contact Name', placeholder: 'Full name', required: true, options: [] },
      { id: uid(), type: 'phone', label: 'Emergency Contact Phone', placeholder: '(555) 123-4567', required: true, options: [] },
    ],
  },
  {
    name: 'Service Preferences',
    description: 'Understand client preferences for a personalized experience.',
    fields: [
      { id: uid(), type: 'short_text', label: 'Preferred Stylist / Therapist', placeholder: 'Name of your preferred provider', required: false, options: [] },
      { id: uid(), type: 'radio', label: 'Pressure Level', placeholder: '', required: false, options: ['Light', 'Medium', 'Firm', 'Deep'] },
      { id: uid(), type: 'long_text', label: 'Areas of Concern', placeholder: 'Describe any specific areas you would like us to focus on...', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Additional Notes', placeholder: 'Anything else we should know?', required: false, options: [] },
    ],
  },
  {
    name: 'Feedback Survey',
    description: 'Collect post-appointment feedback to improve your services.',
    fields: [
      { id: uid(), type: 'radio', label: 'Overall Rating', placeholder: '', required: true, options: ['1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'] },
      { id: uid(), type: 'long_text', label: 'What did you enjoy most?', placeholder: 'Tell us what stood out...', required: false, options: [] },
      { id: uid(), type: 'long_text', label: 'Suggestions for Improvement', placeholder: 'How can we do better?', required: false, options: [] },
      { id: uid(), type: 'radio', label: 'Would you recommend us to others?', placeholder: '', required: false, options: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'] },
    ],
  },
]

function emptyField(type) {
  return {
    id: uid(),
    type,
    label: '',
    placeholder: '',
    required: false,
    options: [],
  }
}

function emptyForm() {
  return {
    id: uid(),
    name: '',
    description: '',
    fields: [],
    linked_service_id: null,
    status: 'active',
    submissions: [],
    created_at: todayStr(),
  }
}

export default function FormsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [forms, setForms] = useState([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [formDraft, setFormDraft] = useState(emptyForm())
  const [previewMode, setPreviewMode] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [viewSubmissions, setViewSubmissions] = useState(null)
  const [expandedSubmission, setExpandedSubmission] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`forms_${biz.id}`)
        if (stored) setForms(JSON.parse(stored))
        setServices(await dataStore.getServices(biz.id))
      }
    }
    load()
  }, [user])

  const saveForms = (updated) => {
    setForms(updated)
    if (business) {
      localStorage.setItem(`forms_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'forms', updated)
    }
  }

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const totalSubs = forms.reduce((s, f) => s + (f.submissions?.length || 0), 0)
    const monthSubs = forms.reduce((s, f) => s + (f.submissions?.filter(sub => sub.submitted_at?.startsWith(thisMonth)).length || 0), 0)
    return {
      total: forms.length,
      active: forms.filter(f => f.status === 'active').length,
      totalSubs,
      monthSubs,
    }
  }, [forms])

  const openBuilder = (form) => {
    if (form) {
      setEditingForm(form)
      setFormDraft(JSON.parse(JSON.stringify(form)))
    } else {
      setEditingForm(null)
      setFormDraft(emptyForm())
    }
    setPreviewMode(false)
    setShowFieldPicker(false)
    setShowBuilder(true)
  }

  const closeBuilder = () => {
    setShowBuilder(false)
    setEditingForm(null)
    setFormDraft(emptyForm())
    setPreviewMode(false)
  }

  const updateDraft = (key, value) => {
    setFormDraft(prev => ({ ...prev, [key]: value }))
  }

  const addField = (type) => {
    const field = emptyField(type)
    const ft = FIELD_TYPES.find(t => t.value === type)
    if (ft) field.label = ft.label
    if (type === 'dropdown' || type === 'radio') field.options = ['Option 1']
    setFormDraft(prev => ({ ...prev, fields: [...prev.fields, field] }))
    setShowFieldPicker(false)
  }

  const updateField = (fieldId, key, value) => {
    setFormDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f),
    }))
  }

  const removeField = (fieldId) => {
    setFormDraft(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }))
  }

  const moveField = (idx, direction) => {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= formDraft.fields.length) return
    const fields = [...formDraft.fields]
    const tmp = fields[idx]
    fields[idx] = fields[newIdx]
    fields[newIdx] = tmp
    setFormDraft(prev => ({ ...prev, fields }))
  }

  const addOption = (fieldId) => {
    setFormDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id !== fieldId) return f
        return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] }
      }),
    }))
  }

  const updateOption = (fieldId, optIdx, value) => {
    setFormDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id !== fieldId) return f
        const options = [...f.options]
        options[optIdx] = value
        return { ...f, options }
      }),
    }))
  }

  const removeOption = (fieldId, optIdx) => {
    setFormDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id !== fieldId) return f
        return { ...f, options: f.options.filter((_, i) => i !== optIdx) }
      }),
    }))
  }

  const saveForm = () => {
    if (!formDraft.name.trim()) return
    if (editingForm) {
      saveForms(forms.map(f => f.id === editingForm.id ? { ...formDraft } : f))
    } else {
      saveForms([formDraft, ...forms])
    }
    closeBuilder()
  }

  const duplicateForm = (form) => {
    const dup = {
      ...JSON.parse(JSON.stringify(form)),
      id: uid(),
      name: form.name + ' (Copy)',
      submissions: [],
      created_at: todayStr(),
    }
    dup.fields = dup.fields.map(f => ({ ...f, id: uid() }))
    saveForms([dup, ...forms])
  }

  const toggleFormStatus = (formId) => {
    saveForms(forms.map(f => {
      if (f.id !== formId) return f
      const next = f.status === 'active' ? 'draft' : 'active'
      return { ...f, status: next }
    }))
  }

  const archiveForm = (formId) => {
    saveForms(forms.map(f => f.id === formId ? { ...f, status: 'archived' } : f))
  }

  const deleteForm = (formId) => {
    if (!confirm('Delete this form and all its submissions?')) return
    saveForms(forms.filter(f => f.id !== formId))
  }

  const copyLink = (formId) => {
    const url = `${window.location.origin}/form/${formId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(formId)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const markReviewed = (formId, subIdx) => {
    saveForms(forms.map(f => {
      if (f.id !== formId) return f
      const submissions = f.submissions.map((s, i) => i === subIdx ? { ...s, status: 'reviewed' } : s)
      return { ...f, submissions }
    }))
    if (viewSubmissions?.id === formId) {
      setViewSubmissions(prev => {
        const submissions = prev.submissions.map((s, i) => i === subIdx ? { ...s, status: 'reviewed' } : s)
        return { ...prev, submissions }
      })
    }
  }

  const exportCSV = (form) => {
    if (!form.submissions?.length) return
    const fieldLabels = form.fields.filter(f => f.type !== 'section_header').map(f => f.label)
    const headers = ['Date', 'Status', ...fieldLabels]
    const rows = form.submissions.map(sub => {
      const vals = form.fields.filter(f => f.type !== 'section_header').map(f => {
        const val = sub.data?.[f.id] || ''
        return typeof val === 'string' ? val.replace(/"/g, '""') : String(val)
      })
      return [sub.submitted_at || '', sub.status || 'new', ...vals]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name.replace(/[^a-zA-Z0-9]/g, '_')}_submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const useTemplate = (template) => {
    const form = emptyForm()
    form.name = template.name
    form.description = template.description
    form.fields = template.fields.map(f => ({ ...f, id: uid() }))
    setEditingForm(null)
    setFormDraft(form)
    setPreviewMode(false)
    setShowFieldPicker(false)
    setShowBuilder(true)
  }

  const getFieldIcon = (type) => {
    const ft = FIELD_TYPES.find(t => t.value === type)
    return ft ? ft.icon : Type
  }

  const getServiceName = (serviceId) => {
    const svc = services.find(s => s.id === serviceId)
    return svc ? svc.name : null
  }

  const getSubmitterName = (sub, form) => {
    if (!sub.data) return 'Anonymous'
    const nameField = form.fields.find(f => f.label.toLowerCase().includes('name') && f.type === 'short_text')
    if (nameField && sub.data[nameField.id]) return sub.data[nameField.id]
    const emailField = form.fields.find(f => f.type === 'email')
    if (emailField && sub.data[emailField.id]) return sub.data[emailField.id]
    return 'Anonymous'
  }

  const statusBadge = (status) => {
    if (status === 'active') return 'badge badge-green'
    if (status === 'draft') return 'badge badge-amber'
    return 'badge badge-rose'
  }

  const subStatusBadge = (status) => {
    if (status === 'reviewed') return 'badge badge-green'
    return 'badge badge-blue'
  }

  const renderPreviewField = (field) => {
    if (field.type === 'section_header') {
      return (
        <div key={field.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '4px', marginTop: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{field.label || 'Section Title'}</div>
        </div>
      )
    }
    return (
      <div key={field.id} className="form-group" style={{ marginBottom: '16px' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {field.label || 'Untitled Field'}
          {field.required && <span style={{ color: 'var(--rose)', fontSize: '14px' }}>*</span>}
        </label>
        {field.type === 'short_text' && <input className="form-input" placeholder={field.placeholder} disabled />}
        {field.type === 'long_text' && <textarea className="form-input" placeholder={field.placeholder} rows={3} disabled style={{ resize: 'vertical', minHeight: '80px' }} />}
        {field.type === 'email' && <input className="form-input" type="email" placeholder={field.placeholder || 'email@example.com'} disabled />}
        {field.type === 'phone' && <input className="form-input" type="tel" placeholder={field.placeholder || '(555) 123-4567'} disabled />}
        {field.type === 'number' && <input className="form-input" type="number" placeholder={field.placeholder || '0'} disabled />}
        {field.type === 'date' && <input className="form-input" type="date" disabled style={{ colorScheme: 'dark' }} />}
        {field.type === 'dropdown' && (
          <select className="form-select" disabled>
            <option>{field.placeholder || 'Select an option'}</option>
            {field.options.map((opt, i) => <option key={i}>{opt}</option>)}
          </select>
        )}
        {field.type === 'checkbox' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '2px solid var(--border)', background: 'var(--bg)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{field.placeholder || 'I agree'}</span>
          </div>
        )}
        {field.type === 'radio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
            {field.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--border)', background: 'var(--bg)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{opt}</span>
              </div>
            ))}
          </div>
        )}
        {field.type === 'file_upload' && (
          <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Upload size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div>Drag & drop or click to upload</div>
          </div>
        )}
        {field.type === 'signature' && (
          <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg)' }}>
            <PenTool size={20} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <div>Sign here</div>
          </div>
        )}
      </div>
    )
  }

  if (viewSubmissions) {
    const form = viewSubmissions
    return (
      <>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={28} style={{ color: 'var(--accent-bright)' }} />
              {form.name} - Submissions
            </h1>
            <p className="page-subtitle">{form.submissions?.length || 0} total submissions</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(form)} disabled={!form.submissions?.length}>
              <Download size={14} style={{ marginRight: '6px' }} />Export CSV
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setViewSubmissions(null); setExpandedSubmission(null) }}>
              <X size={14} style={{ marginRight: '4px' }} />Close
            </button>
          </div>
        </div>

        {(!form.submissions || form.submissions.length === 0) ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>No submissions yet</div>
              <div style={{ fontSize: '13px' }}>Share your form link to start collecting responses.</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {form.submissions.map((sub, idx) => {
              const expanded = expandedSubmission === idx
              const name = getSubmitterName(sub, form)
              return (
                <div key={idx} style={{ borderBottom: idx < form.submissions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div
                    onClick={() => setExpandedSubmission(expanded ? null : idx)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s',
                      background: expanded ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: '#fff',
                      }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(sub.submitted_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={subStatusBadge(sub.status)}>{sub.status === 'reviewed' ? 'Reviewed' : 'New'}</span>
                      {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ padding: '0 20px 20px 68px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {form.fields.filter(f => f.type !== 'section_header').map(field => (
                          <div key={field.id}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{field.label}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{sub.data?.[field.id] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                          </div>
                        ))}
                      </div>
                      {sub.status !== 'reviewed' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '16px' }}
                          onClick={(e) => { e.stopPropagation(); markReviewed(form.id, idx) }}
                        >
                          <CheckSquare size={14} style={{ marginRight: '6px' }} />Mark as Reviewed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  if (showBuilder) {
    return (
      <>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={28} style={{ color: 'var(--accent-bright)' }} />
              {editingForm ? 'Edit Form' : 'Create Form'}
            </h1>
            <p className="page-subtitle">Build your custom intake form with drag-free field management</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${previewMode ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye size={14} style={{ marginRight: '6px' }} />{previewMode ? 'Edit Mode' : 'Preview'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={closeBuilder}>
              <X size={14} style={{ marginRight: '4px' }} />Cancel
            </button>
          </div>
        </div>

        {previewMode ? (
          <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: '6px' }}>
                {formDraft.name || 'Untitled Form'}
              </div>
              {formDraft.description && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{formDraft.description}</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              {formDraft.fields.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>No fields added yet</div>
              ) : (
                formDraft.fields.map(f => renderPreviewField(f))
              )}
            </div>
            {formDraft.fields.length > 0 && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary btn-sm" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.7 }}>Submit</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Edit3 size={16} style={{ color: 'var(--accent-bright)' }} />
                Form Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Form Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. New Client Intake Form"
                    value={formDraft.name}
                    onChange={e => updateDraft('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    placeholder="Brief description of what this form is for..."
                    value={formDraft.description}
                    onChange={e => updateDraft('description', e.target.value)}
                    rows={2}
                    style={{ resize: 'vertical', minHeight: '60px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Service (optional)</label>
                  <select
                    className="form-select"
                    value={formDraft.linked_service_id || ''}
                    onChange={e => updateDraft('linked_service_id', e.target.value || null)}
                  >
                    <option value="">No linked service</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Auto-show this form when the selected service is booked
                  </span>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['active', 'draft', 'archived'].map(s => (
                    <button
                      key={s}
                      className={`btn btn-sm ${formDraft.status === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateDraft('status', s)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} style={{ color: 'var(--accent-bright)' }} />
                  Form Fields ({formDraft.fields.length})
                </span>
                <div style={{ position: 'relative' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowFieldPicker(!showFieldPicker)}>
                    <Plus size={14} style={{ marginRight: '4px' }} />Add Field
                  </button>
                  {showFieldPicker && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '8px', width: '260px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 50,
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px',
                    }}>
                      {FIELD_TYPES.map(ft => {
                        const Icon = ft.icon
                        return (
                          <button
                            key={ft.value}
                            onClick={() => addField(ft.value)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 10px', borderRadius: '6px', border: 'none',
                              background: 'transparent', color: 'var(--text-secondary)',
                              cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                              transition: 'all 0.15s', textAlign: 'left',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = 'var(--accent-bright)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                          >
                            <Icon size={14} />{ft.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {formDraft.fields.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Layers size={40} strokeWidth={1} style={{ marginBottom: '10px', opacity: 0.3 }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>No fields yet</div>
                  <div style={{ fontSize: '13px' }}>Click "Add Field" to start building your form.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {formDraft.fields.map((field, idx) => {
                    const FieldIcon = getFieldIcon(field.type)
                    const ft = FIELD_TYPES.find(t => t.value === field.type)
                    const hasOptions = field.type === 'dropdown' || field.type === 'radio'
                    const isSectionHeader = field.type === 'section_header'
                    return (
                      <div
                        key={field.id}
                        style={{
                          border: '1px solid var(--border)', borderRadius: '10px',
                          padding: '14px 16px', background: 'var(--bg)',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                              background: 'rgba(59,130,246,0.1)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <FieldIcon size={15} style={{ color: 'var(--accent-bright)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <input
                                className="form-input"
                                placeholder={isSectionHeader ? 'Section title...' : 'Field label...'}
                                value={field.label}
                                onChange={e => updateField(field.id, 'label', e.target.value)}
                                style={{ fontSize: '14px', fontWeight: 600, padding: '6px 10px', marginBottom: '0' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => moveField(idx, -1)}
                              disabled={idx === 0}
                              style={{ padding: '4px', opacity: idx === 0 ? 0.3 : 1 }}
                              title="Move up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => moveField(idx, 1)}
                              disabled={idx === formDraft.fields.length - 1}
                              style={{ padding: '4px', opacity: idx === formDraft.fields.length - 1 ? 0.3 : 1 }}
                              title="Move down"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => removeField(field.id)}
                              style={{ padding: '4px', color: 'var(--rose)' }}
                              title="Remove field"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {!isSectionHeader && (
                          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'center', paddingLeft: '40px' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                className="form-input"
                                placeholder="Placeholder text..."
                                value={field.placeholder}
                                onChange={e => updateField(field.id, 'placeholder', e.target.value)}
                                style={{ fontSize: '12px', padding: '5px 10px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Required</span>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => updateField(field.id, 'required', !field.required)}
                                style={{ padding: '2px' }}
                              >
                                {field.required
                                  ? <ToggleRight size={22} style={{ color: 'var(--green)' }} />
                                  : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                                }
                              </button>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                              {ft?.label}
                            </span>
                          </div>
                        )}

                        {hasOptions && (
                          <div style={{ marginTop: '10px', paddingLeft: '40px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Options</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {field.options.map((opt, optIdx) => (
                                <div key={optIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <div style={{
                                    width: '14px', height: '14px', flexShrink: 0,
                                    borderRadius: field.type === 'radio' ? '50%' : '3px',
                                    border: '2px solid var(--border)',
                                  }} />
                                  <input
                                    className="form-input"
                                    value={opt}
                                    onChange={e => updateOption(field.id, optIdx, e.target.value)}
                                    style={{ fontSize: '12px', padding: '4px 8px', flex: 1 }}
                                  />
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => removeOption(field.id, optIdx)}
                                    style={{ padding: '2px', color: 'var(--rose)', opacity: field.options.length <= 1 ? 0.3 : 1 }}
                                    disabled={field.options.length <= 1}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => addOption(field.id)}
                                style={{ alignSelf: 'flex-start', fontSize: '12px', color: 'var(--accent-bright)', padding: '4px 8px' }}
                              >
                                <Plus size={12} style={{ marginRight: '4px' }} />Add Option
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '20px' }}>
              <button className="btn btn-ghost btn-sm" onClick={closeBuilder}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={saveForm}
                disabled={!formDraft.name.trim()}
                style={{ opacity: formDraft.name.trim() ? 1 : 0.5 }}
              >
                {editingForm ? 'Save Changes' : 'Save Form'}
              </button>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} style={{ color: 'var(--accent-bright)' }} />
            Intake Forms
          </h1>
          <p className="page-subtitle">Build custom forms for clients to fill out before appointments</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openBuilder(null)}>
          <Plus size={14} style={{ marginRight: '6px' }} />Create Form
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <FileText size={22} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div className="stat-card-label">Total Forms</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <ToggleRight size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div className="stat-card-label">Active Forms</div>
          <div className="stat-card-value">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <Layers size={22} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="stat-card-label">Total Submissions</div>
          <div className="stat-card-value">{stats.totalSubs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Calendar size={22} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="stat-card-label">This Month</div>
          <div className="stat-card-value">{stats.monthSubs}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutList size={16} style={{ color: 'var(--accent-bright)' }} />
          My Forms ({forms.length})
        </div>
        {forms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>No forms created yet</div>
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>Create your first form or start with a template below.</div>
            <button className="btn btn-primary btn-sm" onClick={() => openBuilder(null)}>
              <Plus size={14} style={{ marginRight: '6px' }} />Create Your First Form
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginTop: '12px' }}>
            {forms.map(form => {
              const serviceName = getServiceName(form.linked_service_id)
              return (
                <div
                  key={form.id}
                  style={{
                    border: '1px solid var(--border)', borderRadius: '10px',
                    padding: '16px 18px', background: 'var(--bg)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {form.name}
                      </div>
                      {form.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {form.description}
                        </div>
                      )}
                    </div>
                    <span className={statusBadge(form.status)} style={{ flexShrink: 0, marginLeft: '8px', textTransform: 'capitalize' }}>
                      {form.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={12} style={{ opacity: 0.6 }} />{form.fields.length} fields
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} style={{ opacity: 0.6 }} />{form.submissions?.length || 0} submissions
                    </span>
                    {serviceName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-bright)', flexShrink: 0 }} />
                        {serviceName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openBuilder(form)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      <Edit3 size={12} style={{ marginRight: '4px' }} />Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => duplicateForm(form)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      <Copy size={12} style={{ marginRight: '4px' }} />Duplicate
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setViewSubmissions(form); setExpandedSubmission(null) }} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      <Eye size={12} style={{ marginRight: '4px' }} />Submissions
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleFormStatus(form.id)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      {form.status === 'active'
                        ? <><ToggleRight size={12} style={{ marginRight: '4px', color: 'var(--green)' }} />Active</>
                        : <><ToggleLeft size={12} style={{ marginRight: '4px' }} />Activate</>
                      }
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyLink(form.id)}
                      style={{ padding: '4px 8px', fontSize: '11px', color: copied === form.id ? 'var(--green)' : undefined }}
                    >
                      <Copy size={12} style={{ marginRight: '4px' }} />{copied === form.id ? 'Copied!' : 'Link'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteForm(form.id)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--rose)' }}>
                      <Trash2 size={12} style={{ marginRight: '4px' }} />Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} style={{ color: 'var(--purple)' }} />
          Form Templates
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '-4px' }}>
          Get started quickly with a pre-built template. Customize it to fit your needs.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {TEMPLATES.map((tpl, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--border)', borderRadius: '10px',
                padding: '18px', background: 'var(--bg)',
                transition: 'border-color 0.2s',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'rgba(167,139,250,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
              }}>
                <FileText size={18} style={{ color: 'var(--purple)' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px', flex: 1 }}>
                {tpl.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tpl.fields.length} fields</span>
                <button className="btn btn-secondary btn-sm" onClick={() => useTemplate(tpl)} style={{ fontSize: '12px' }}>
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

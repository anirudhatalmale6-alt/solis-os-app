const STORAGE_KEY = 'solis_os_data'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { users: [], businesses: [], services: [], staff: [], customers: [] }
  } catch { return { users: [], businesses: [], services: [], staff: [], customers: [] } }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function uid() {
  return crypto.randomUUID()
}

export const store = {
  signUp(email, password, fullName) {
    const data = load()
    if (data.users.find(u => u.email === email)) {
      return { error: { message: 'An account with this email already exists' } }
    }
    const user = { id: uid(), email, password, full_name: fullName, created_at: new Date().toISOString() }
    data.users.push(user)
    save(data)
    localStorage.setItem('solis_session', JSON.stringify({ user: { id: user.id, email: user.email, full_name: user.full_name } }))
    return { data: { user: { id: user.id, email: user.email, full_name: user.full_name } }, error: null }
  },

  signIn(email, password) {
    const data = load()
    const user = data.users.find(u => u.email === email && u.password === password)
    if (!user) return { error: { message: 'Invalid email or password' } }
    localStorage.setItem('solis_session', JSON.stringify({ user: { id: user.id, email: user.email, full_name: user.full_name } }))
    return { data: { user: { id: user.id, email: user.email, full_name: user.full_name } }, error: null }
  },

  signOut() {
    localStorage.removeItem('solis_session')
    return { error: null }
  },

  getSession() {
    try {
      const raw = localStorage.getItem('solis_session')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },

  getUser() {
    const session = this.getSession()
    if (!session) return null
    const data = load()
    return data.users.find(u => u.id === session.user.id) || null
  },

  createBusiness(biz) {
    const data = load()
    const business = { id: uid(), ...biz, created_at: new Date().toISOString() }
    data.businesses.push(business)
    save(data)
    return { data: business, error: null }
  },

  getBusiness(userId) {
    const data = load()
    return data.businesses.find(b => b.owner_id === userId) || null
  },

  updateBusiness(id, updates) {
    const data = load()
    const idx = data.businesses.findIndex(b => b.id === id)
    if (idx === -1) return { error: { message: 'Business not found' } }
    data.businesses[idx] = { ...data.businesses[idx], ...updates }
    save(data)
    return { data: data.businesses[idx], error: null }
  },

  addService(service) {
    const data = load()
    const svc = { id: uid(), ...service, is_active: true, created_at: new Date().toISOString() }
    data.services.push(svc)
    save(data)
    return { data: svc, error: null }
  },

  getServices(businessId) {
    const data = load()
    return data.services.filter(s => s.business_id === businessId)
  },

  updateService(id, updates) {
    const data = load()
    const idx = data.services.findIndex(s => s.id === id)
    if (idx === -1) return { error: { message: 'Service not found' } }
    data.services[idx] = { ...data.services[idx], ...updates }
    save(data)
    return { data: data.services[idx], error: null }
  },

  deleteService(id) {
    const data = load()
    data.services = data.services.filter(s => s.id !== id)
    save(data)
    return { error: null }
  },

  addStaff(member) {
    const data = load()
    const s = { id: uid(), ...member, is_active: true, created_at: new Date().toISOString() }
    data.staff.push(s)
    save(data)
    return { data: s, error: null }
  },

  getStaff(businessId) {
    const data = load()
    return data.staff.filter(s => s.business_id === businessId)
  },

  updateStaff(id, updates) {
    const data = load()
    const idx = data.staff.findIndex(s => s.id === id)
    if (idx === -1) return { error: { message: 'Staff not found' } }
    data.staff[idx] = { ...data.staff[idx], ...updates }
    save(data)
    return { data: data.staff[idx], error: null }
  },

  deleteStaff(id) {
    const data = load()
    data.staff = data.staff.filter(s => s.id !== id)
    save(data)
    return { error: null }
  },

  addCustomer(customer) {
    const data = load()
    const c = { id: uid(), ...customer, visits: 0, total_spent: 0, created_at: new Date().toISOString() }
    data.customers.push(c)
    save(data)
    return { data: c, error: null }
  },

  getCustomers(businessId) {
    const data = load()
    return data.customers.filter(c => c.business_id === businessId)
  },

  deleteCustomer(id) {
    const data = load()
    data.customers = data.customers.filter(c => c.id !== id)
    save(data)
    return { error: null }
  }
}

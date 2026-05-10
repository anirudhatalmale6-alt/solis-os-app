import { supabase } from './supabase'

export const supabaseStore = {
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) return { error: { message: error.message } }
    if (data.session) {
      return { data: { user: { id: data.user.id, email: data.user.email, full_name: fullName } }, error: null }
    }
    return { data: null, error: null, confirmEmail: true }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: { message: error.message } }
    return { data: { user: { id: data.user.id, email: data.user.email, full_name: data.user.user_metadata?.full_name } }, error: null }
  },

  async signOut() {
    await supabase.auth.signOut()
    return { error: null }
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    const user = data.session.user
    return { user: { id: user.id, email: user.email, full_name: user.user_metadata?.full_name } }
  },

  async createBusiness(biz) {
    const { data, error } = await supabase.from('businesses').insert(biz).select().single()
    if (error) {
      if (error.message && error.message.includes('slug')) {
        const { slug, ...bizWithoutSlug } = biz
        const { data: d2, error: e2 } = await supabase.from('businesses').insert(bizWithoutSlug).select().single()
        if (e2) return { error: { message: e2.message } }
        return { data: d2, error: null }
      }
      return { error: { message: error.message } }
    }
    return { data, error: null }
  },

  async getBusiness(userId) {
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', userId).single()
    return data || null
  },

  async getBusinessById(id) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isUUID) {
      const { data } = await supabase.from('businesses').select('*').eq('id', id).single()
      return data || null
    }
    try {
      const { data } = await supabase.from('businesses').select('*').eq('slug', id).single()
      return data || null
    } catch {
      return null
    }
  },

  async updateBusiness(id, updates) {
    const { data, error } = await supabase.from('businesses').update(updates).eq('id', id).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async addService(service) {
    const { data, error } = await supabase.from('services').insert(service).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async getServices(businessId) {
    const { data } = await supabase.from('services').select('*').eq('business_id', businessId)
    return data || []
  },

  async updateService(id, updates) {
    const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async deleteService(id) {
    await supabase.from('services').delete().eq('id', id)
    return { error: null }
  },

  async addStaff(member) {
    const { data, error } = await supabase.from('staff').insert(member).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async getStaff(businessId) {
    const { data } = await supabase.from('staff').select('*').eq('business_id', businessId)
    return data || []
  },

  async updateStaff(id, updates) {
    const { data, error } = await supabase.from('staff').update(updates).eq('id', id).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async deleteStaff(id) {
    await supabase.from('staff').delete().eq('id', id)
    return { error: null }
  },

  async addCustomer(customer) {
    const { data, error } = await supabase.from('customers').insert(customer).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async getCustomers(businessId) {
    const { data } = await supabase.from('customers').select('*').eq('business_id', businessId)
    return data || []
  },

  async updateCustomer(id, updates) {
    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async deleteCustomer(id) {
    await supabase.from('customers').delete().eq('id', id)
    return { error: null }
  },

  async setSchedule(businessId, schedule) {
    const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } = schedule
    const payload = { business_id: businessId, monday, tuesday, wednesday, thursday, friday, saturday, sunday }
    const { data: existing } = await supabase.from('schedules').select('id').eq('business_id', businessId).single()
    if (existing) {
      await supabase.from('schedules').update(payload).eq('business_id', businessId)
    } else {
      await supabase.from('schedules').insert(payload)
    }
  },

  async getSchedule(businessId) {
    const { data } = await supabase.from('schedules').select('*').eq('business_id', businessId).single()
    if (data) return data
    return {
      business_id: businessId,
      monday: { open: '09:00', close: '17:00', enabled: true },
      tuesday: { open: '09:00', close: '17:00', enabled: true },
      wednesday: { open: '09:00', close: '17:00', enabled: true },
      thursday: { open: '09:00', close: '17:00', enabled: true },
      friday: { open: '09:00', close: '17:00', enabled: true },
      saturday: { open: '09:00', close: '17:00', enabled: false },
      sunday: { open: '09:00', close: '17:00', enabled: false },
    }
  },

  async addBooking(booking) {
    const { data, error } = await supabase.from('bookings').insert(booking).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async getBookings(businessId) {
    const { data } = await supabase.from('bookings').select('*').eq('business_id', businessId).order('date', { ascending: true }).order('time', { ascending: true })
    return data || []
  },

  async updateBooking(id, updates) {
    const { data, error } = await supabase.from('bookings').update(updates).eq('id', id).select().single()
    if (error) return { error: { message: error.message } }
    return { data, error: null }
  },

  async cancelBooking(id) {
    return this.updateBooking(id, { status: 'cancelled' })
  },

  async getBookingsByDate(businessId, date) {
    const { data } = await supabase.from('bookings').select('*').eq('business_id', businessId).eq('date', date).order('time', { ascending: true })
    return data || []
  }
}

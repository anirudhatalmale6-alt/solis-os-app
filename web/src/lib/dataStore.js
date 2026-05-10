import { isSupabaseConfigured } from './supabase'
import { store as localStore } from './store'
import { supabaseStore } from './supabaseStore'

function wrapSync(fn) {
  return async (...args) => fn(...args)
}

const wrappedLocalStore = {}
for (const key of Object.keys(localStore)) {
  if (typeof localStore[key] === 'function') {
    wrappedLocalStore[key] = wrapSync(localStore[key].bind(localStore))
  }
}

const supabaseConfigured = isSupabaseConfigured()

const activeStore = supabaseConfigured ? supabaseStore : wrappedLocalStore

export const dataStore = activeStore
export const useSupabase = supabaseConfigured

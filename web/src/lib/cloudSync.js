const SUPABASE_URL = 'https://joeklgpncbrhnujzdzsp.supabase.co'
const STORAGE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZWtsZ3BuY2JyaG51anpkenNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM1MDU4OSwiZXhwIjoyMDkzOTI2NTg5fQ.qSjr5JCxcw0wzl3_IypMMxWQhFl5FJ4IskiH04YPmiI'
const BUCKET = 'business-data'

const SYNC_KEYS = [
  'invoices', 'biz_logo', 'promos', 'reviews', 'loyalty',
  'giftcards', 'locations', 'workspace', 'waitlist',
  'waitlist_settings', 'forms', 'reminders', 'expenses', 'campaigns', 'subscription'
]

function storageKeyFor(prefix, bizId) {
  return `${prefix}_${bizId}`
}

async function cloudGet(bizId, key) {
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${bizId}/${key}.json`,
      { headers: { 'Authorization': `Bearer ${STORAGE_KEY}` } }
    )
    if (!resp.ok) return null
    const text = await resp.text()
    return text || null
  } catch { return null }
}

async function cloudPut(bizId, key, data) {
  try {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${bizId}/${key}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${STORAGE_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: typeof data === 'string' ? data : JSON.stringify(data),
      }
    )
  } catch {}
}

export async function fetchFromCloud(bizId, key) {
  const raw = await cloudGet(bizId, key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return raw }
}

export function syncedGet(bizId, key) {
  const localKey = storageKeyFor(key, bizId)
  return localStorage.getItem(localKey)
}

export function syncedSet(bizId, key, value) {
  const localKey = storageKeyFor(key, bizId)
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  localStorage.setItem(localKey, raw)
  cloudPut(bizId, key, raw)
}

export async function pullFromCloud(bizId) {
  const results = {}
  const fetches = SYNC_KEYS.map(async (key) => {
    const data = await cloudGet(bizId, key)
    if (data !== null) {
      const localKey = storageKeyFor(key, bizId)
      const existing = localStorage.getItem(localKey)
      if (!existing) {
        localStorage.setItem(localKey, data)
      }
      results[key] = true
    }
  })
  await Promise.all(fetches)
  return results
}

export async function pushToCloud(bizId) {
  const pushes = SYNC_KEYS.map(async (key) => {
    const localKey = storageKeyFor(key, bizId)
    const data = localStorage.getItem(localKey)
    if (data) {
      await cloudPut(bizId, key, data)
    }
  })
  await Promise.all(pushes)
}

export async function fullSync(bizId) {
  const pulls = SYNC_KEYS.map(async (key) => {
    const localKey = storageKeyFor(key, bizId)
    const local = localStorage.getItem(localKey)
    const cloud = await cloudGet(bizId, key)

    if (cloud && !local) {
      localStorage.setItem(localKey, cloud)
    } else if (local && !cloud) {
      await cloudPut(bizId, key, local)
    } else if (local && cloud) {
      try {
        const localObj = JSON.parse(local)
        const cloudObj = JSON.parse(cloud)
        const localLen = Array.isArray(localObj) ? localObj.length : Object.keys(localObj).length
        const cloudLen = Array.isArray(cloudObj) ? cloudObj.length : Object.keys(cloudObj).length
        if (cloudLen > localLen) {
          localStorage.setItem(localKey, cloud)
        } else if (localLen > cloudLen) {
          await cloudPut(bizId, key, local)
        }
      } catch {
        if (local.length >= cloud.length) {
          await cloudPut(bizId, key, local)
        } else {
          localStorage.setItem(localKey, cloud)
        }
      }
    }
  })
  await Promise.all(pulls)
}

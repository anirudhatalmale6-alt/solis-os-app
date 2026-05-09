import { createContext, useContext, useState, useEffect } from 'react'
import { dataStore, useSupabase } from '../lib/dataStore'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const session = await dataStore.getSession()
      if (session) setUser(session.user)
      setLoading(false)
    }
    init()

    if (useSupabase && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email, full_name: session.user.user_metadata?.full_name })
        } else {
          setUser(null)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    const result = await dataStore.signUp(email, password, fullName)
    if (result.data) setUser(result.data.user)
    return result
  }

  const signIn = async (email, password) => {
    const result = await dataStore.signIn(email, password)
    if (result.data) setUser(result.data.user)
    return result
  }

  const signOut = async () => {
    await dataStore.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

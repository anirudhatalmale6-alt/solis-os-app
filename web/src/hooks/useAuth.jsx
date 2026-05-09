import { createContext, useContext, useState, useEffect } from 'react'
import { store } from '../lib/store'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = store.getSession()
    if (session) setUser(session.user)
    setLoading(false)
  }, [])

  const signUp = async (email, password, fullName) => {
    const result = store.signUp(email, password, fullName)
    if (result.data) setUser(result.data.user)
    return result
  }

  const signIn = async (email, password) => {
    const result = store.signIn(email, password)
    if (result.data) setUser(result.data.user)
    return result
  }

  const signOut = async () => {
    store.signOut()
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

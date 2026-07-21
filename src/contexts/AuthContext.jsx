import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()
const GENERIC_LOGIN_ERROR = 'Unable to sign in with those credentials'
const ADMIN_ACCESS_ERROR = 'This account does not have administrator access'

const roleLabel = (role) => (role === 'super_admin' ? 'Super Administrator' : 'Administrator')

async function loadAdminUser(authUser) {
  if (!authUser) return null

  const { data: profile, error } = await supabase
    .from('admin_profiles')
    .select('display_name, role, avatar_url')
    .eq('user_id', authUser.id)
    .single()

  if (error || !profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error(ADMIN_ACCESS_ERROR)
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: profile.display_name,
    role: profile.role,
    roleLabel: roleLabel(profile.role),
    avatar: profile.avatar_url || null
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const syncSession = async (session) => {
      try {
        const adminUser = session?.user ? await loadAdminUser(session.user) : null
        if (active) setUser(adminUser)
      } catch {
        if (active) setUser(null)
        await supabase.auth.signOut()
      } finally {
        if (active) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => syncSession(data.session))

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => syncSession(session), 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (error || !data.user) {
        throw new Error(GENERIC_LOGIN_ERROR)
      }

      const adminUser = await loadAdminUser(data.user)
      setUser(adminUser)
      return adminUser
    } catch (error) {
      await supabase.auth.signOut()
      if (error.message === ADMIN_ACCESS_ERROR) throw error
      throw new Error(GENERIC_LOGIN_ERROR)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('You must be signed in')

    setLoading(true)
    try {
      if (updates.currentPassword && updates.newPassword) {
        const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: updates.currentPassword
        })
        if (reauthenticationError) {
          throw new Error('Current password could not be verified')
        }

        const { error } = await supabase.auth.updateUser({ password: updates.newPassword })
        if (error) throw new Error('Password could not be updated')
      }

      if (updates.newEmail) {
        const { error } = await supabase.auth.updateUser({ email: updates.newEmail.trim() })
        if (error) throw new Error('Email address could not be updated')
      }

      if (updates.displayName) {
        const { error } = await supabase
          .from('admin_profiles')
          .update({ display_name: updates.displayName.trim(), updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
        if (error) throw new Error('Profile could not be updated')
      }

      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) throw new Error('Profile could not be refreshed')
      const updatedUser = await loadAdminUser(data.user)
      setUser(updatedUser)
      return updatedUser
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    login,
    logout,
    updateProfile,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user && ['admin', 'super_admin'].includes(user.role)),
    isSuperAdmin: user?.role === 'super_admin'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

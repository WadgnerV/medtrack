import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data, error }
    const profileData = await fetchProfile(data.user.id)
    if (profileData?.is_active === false) {
      await supabase.auth.signOut()
      return { data: null, error: { message: 'Esta cuenta ha sido desactivada. Contactá al administrador.' } }
    }
    return { data, error, role: profileData?.role }
  }

  async function signUp({
    email, password, firstName, lastName, role = 'patient',
    idNumber, phone, birthDate, sex, province, canton, heightCm
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name:  lastName,
          role,
          id_number:  idNumber  || '',
          phone:      phone     || '',
          birth_date: birthDate || '',
          sex:        sex       || '',
          province:   province  || '',
          canton:     canton    || '',
          height_cm:  heightCm  ? String(heightCm) : '',
        }
      }
    })
    if (error) return { data, error }

    const userId = data.user?.id
    if (!userId || role !== 'patient') return { data, error: null }

    // Esperar a que el trigger cree el profile y luego insertar/actualizar patients
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 600))
      const { data: profileData } = await supabase
        .from('profiles').select('id').eq('id', userId).single()
      if (profileData?.id) break
    }

    await supabase.from('patients').upsert({
      profile_id: userId,
      status:     'pending',
      id_number:  idNumber  || null,
      phone:      phone     || null,
      birth_date: birthDate || null,
      sex:        sex       || null,
      province:   province  || null,
      canton:     canton    || null,
      height_cm:  heightCm  ? parseInt(heightCm) : null,
    }, { onConflict: 'profile_id' })

    return { data, error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

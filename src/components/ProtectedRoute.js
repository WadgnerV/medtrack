import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'system-ui', color: '#1D9E75', fontSize: 14
    }}>
      Cargando...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'superadmin') return <Navigate to="/superadmin" replace />
    if (profile.role === 'receptionist') return <Navigate to="/recepcion" replace />
    if (profile.role === 'admin')      return <Navigate to="/admin" replace />
    if (profile.role === 'doctor')     return <Navigate to="/doctor" replace />
    if (profile.role === 'patient')    return <Navigate to="/paciente" replace />
  }

  return children
}

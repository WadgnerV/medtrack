import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDashboard from './pages/PatientDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import SpotifyCallback from './pages/SpotifyCallback'
import Landing from './pages/Landing'
import Demo from './pages/Demo'
import Privacidad from './pages/Privacidad'
import Terminos from './pages/Terminos'
import ContextSelector from './pages/ContextSelector'
import HospitalizacionDashboard from './pages/HospitalizacionDashboard'
import ConfirmAppointment from './pages/ConfirmAppointment'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/superadmin/*" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/recepcion/*" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/pacientes/:patientId" element={
            <ProtectedRoute allowedRoles={['admin','clinic_admin','branch_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin','clinic_admin','branch_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/doctor/*" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/paciente/*" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          } />
          <Route path="/seleccionar-contexto" element={<ContextSelector />} />
          <Route path="/confirm-appointment" element={<ConfirmAppointment />} />
          <Route path="/hospitalizacion/*" element={<HospitalizacionDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/spotify-callback" element={<SpotifyCallback />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

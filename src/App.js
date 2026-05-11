import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div>Panel Admin — próximamente</div>
            </ProtectedRoute>
          } />
          <Route path="/doctor/*" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <div>Panel Doctor — próximamente</div>
            </ProtectedRoute>
          } />
          <Route path="/paciente/*" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <div>Panel Paciente — próximamente</div>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

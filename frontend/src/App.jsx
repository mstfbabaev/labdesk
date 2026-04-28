import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Spinner from './components/ui/Spinner/Spinner'
import SplashScreen from './components/ui/SplashScreen/SplashScreen'

import LoginPage from './pages/LoginPage/LoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage/AdminDashboardPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage/AdminOrdersPage'
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage/AdminOrderDetailPage'
import AdminDoctorsPage from './pages/admin/AdminDoctorsPage/AdminDoctorsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage/AdminSettingsPage'
import NewOrderPage from './pages/doctor/NewOrderPage/NewOrderPage'
import CurrentWorksPage from './pages/doctor/CurrentWorksPage/CurrentWorksPage'
import DoctorOrderDetailPage from './pages/doctor/DoctorOrderDetailPage/DoctorOrderDetailPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/doctor/orders'} replace />
  }

  return <Layout>{children}</Layout>
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/doctor/orders'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute role="admin"><AdminOrdersPage /></ProtectedRoute>} />
      <Route path="/admin/orders/:orderId" element={<ProtectedRoute role="admin"><AdminOrderDetailPage /></ProtectedRoute>} />
      <Route path="/admin/doctors" element={<ProtectedRoute role="admin"><AdminDoctorsPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettingsPage /></ProtectedRoute>} />

      <Route path="/doctor/new-order" element={<ProtectedRoute role="doctor"><NewOrderPage /></ProtectedRoute>} />
      <Route path="/doctor/orders" element={<ProtectedRoute role="doctor"><CurrentWorksPage /></ProtectedRoute>} />
      <Route path="/doctor/orders/:orderId" element={<ProtectedRoute role="doctor"><DoctorOrderDetailPage /></ProtectedRoute>} />

      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppContent() {
  const { loading } = useAuth()
  return (
    <>
      <SplashScreen loading={loading} />
      <AppRoutes />
    </>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

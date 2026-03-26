import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './components/dashboard/DashboardPage'
import PipelinePage from './components/pipeline/PipelinePage'
import LeadsPage from './components/leads/LeadsPage'
import EmailPage from './components/email/EmailPage'
import CallsPage from './components/calls/CallsPage'
import WhatsAppPage from './components/whatsapp/WhatsAppPage'
import PerformancePage from './components/performance/PerformancePage'
import RevenueForecastingPage from './components/revenue/RevenueForecastingPage'
import IntegrationsPage from './components/integrations/IntegrationsPage'
import CalendarPage from './components/calendar/CalendarPage'
import AuthPage from './components/auth/AuthPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

// Padded wrapper for all non-full-bleed pages
function PaddedLayout() {
  return <div className="p-6 lg:p-8"><Outlet /></div>
}

function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      {/* Public: login / signup */}
      <Route
        path="/login"
        element={
          loading ? null : user ? <Navigate to="/" replace /> : <AuthPage />
        }
      />

      {/* Protected: CRM routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<PaddedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/revenue" element={<RevenueForecastingPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
        </Route>
        {/* Full-bleed: no padding wrapper */}
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

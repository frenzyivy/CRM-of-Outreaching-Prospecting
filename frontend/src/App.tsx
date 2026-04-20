import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './components/auth/AuthPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

const TodayPage             = lazy(() => import('./components/today/TodayPage'))
const DashboardPage         = lazy(() => import('./components/dashboard/DashboardPage'))
const PipelinePage          = lazy(() => import('./components/pipeline/PipelinePage'))
const LeadsPage             = lazy(() => import('./components/leads/LeadsPage'))
const EmailPage             = lazy(() => import('./components/email/EmailPage'))
const CallsPage             = lazy(() => import('./components/calls/CallsPage'))
const WhatsAppPage          = lazy(() => import('./components/whatsapp/WhatsAppPage'))
const PerformancePage       = lazy(() => import('./components/performance/PerformancePage'))
const RevenueForecastingPage = lazy(() => import('./components/revenue/RevenueForecastingPage'))
const IntegrationsPage      = lazy(() => import('./components/integrations/IntegrationsPage'))
const CalendarPage          = lazy(() => import('./components/calendar/CalendarPage'))
const AssistantPage         = lazy(() => import('./components/ai/AssistantPage'))
const GroupsPage            = lazy(() => import('./components/groups/GroupsPage'))

// Minimal fallback shown while a page chunk loads
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )
}

// Padded wrapper for all non-full-bleed pages
function PaddedLayout() {
  return <div className="p-6 lg:p-8"><Outlet /></div>
}

function App() {
  const { user, loading } = useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
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
            {/* `/` redirects to `/today` — nothing bookmarked breaks. */}
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            {/* `/dashboard` keeps the legacy Dashboard reachable during migration. */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/revenue" element={<RevenueForecastingPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
          {/* Full-bleed: no padding wrapper */}
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>

        {/* Catch-all: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App

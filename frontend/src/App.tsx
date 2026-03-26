import { Routes, Route, Outlet } from 'react-router-dom'
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

// Padded wrapper for all non-full-bleed pages
function PaddedLayout() {
  return <div className="p-6 lg:p-8"><Outlet /></div>
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
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
    </Routes>
  )
}

export default App

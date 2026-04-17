import { lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SplashGate } from './components/SplashGate'
import { useAuth } from './context/AuthContext'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MockAnalysisPage } from './pages/MockAnalysisPage'
import { MocksPage } from './pages/MocksPage'
import { SquadPage } from './pages/SquadPage'
import { TasksPage } from './pages/TasksPage'

const DashboardPage = lazy(async () => {
  const m = await import('./pages/DashboardPage')
  return { default: m.DashboardPage }
})

function ProtectedLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  const location = useLocation()

  return (
    <SplashGate>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<div className="loading-screen">Loading analytics...</div>}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/mocks" element={<MocksPage />} />
              <Route path="/mocks/analysis" element={<MockAnalysisPage />} />
              <Route path="/squad" element={<SquadPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </SplashGate>
  )
}

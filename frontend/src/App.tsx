import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import { AppLayout } from './components/layout/AppLayout'
import { VerificationGate } from './components/VerificationGate'

import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage'
import { PendingVerificationPage } from './pages/auth/PendingVerificationPage'

import { HomePage } from './pages/home/HomePage'
import { ConnectPage } from './pages/connect/ConnectPage'
import { ChatsPage } from './pages/chats/ChatsPage'
import { CommunityPage } from './pages/community/CommunityPage'
import { CommunityDetailPage } from './pages/community/CommunityDetailPage'
import { DatesPage } from './pages/dates/DatesPage'
import { MarketSpotPage } from './pages/marketspot/MarketSpotPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { UserProfilePage } from './pages/profile/UserProfilePage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { AdminPage } from './pages/admin/AdminPage'
import { NotificationsPage } from './pages/notifications/NotificationsPage'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading Uni-verse...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  if (profile && !profile.username) return <Navigate to="/auth/complete-profile" replace />

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />
      <Route path="/pending-verification" element={<PendingVerificationPage />} />

      {/* Protected app routes */}
      <Route element={<AuthGate><AppLayout /></AuthGate>}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/connect" element={<VerificationGate><ConnectPage /></VerificationGate>} />
        <Route path="/dates" element={<VerificationGate><DatesPage /></VerificationGate>} />
        <Route path="/market" element={<VerificationGate><MarketSpotPage /></VerificationGate>} />
        <Route path="/chats" element={<VerificationGate><ChatsPage /></VerificationGate>} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:id" element={<CommunityDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<UserProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '16px',
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

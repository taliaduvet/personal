import { Navigate, Route, Routes } from 'react-router-dom'
import { getTokens } from '@/lib/storage'
import { VeinProvider } from '@/context/VeinContext'
import { VaultGate } from '@/components/VaultGate'
import { AppLayout } from '@/components/AppLayout'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LoginPage } from '@/pages/LoginPage'
import { MemoPage } from '@/pages/MemoPage'
import { RecoveryPage } from '@/pages/RecoveryPage'
import { SongDetailPage } from '@/pages/SongDetailPage'
import { SongsPage } from '@/pages/SongsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getTokens()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthedVault({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <VaultGate>{children}</VaultGate>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <VeinProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/recovery"
          element={
            <RequireAuth>
              <RecoveryPage />
            </RequireAuth>
          }
        />
        <Route
          element={
            <AuthedVault>
              <AppLayout />
            </AuthedVault>
          }
        >
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/memo/:id" element={<MemoPage />} />
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/song/:id" element={<SongDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </VeinProvider>
  )
}

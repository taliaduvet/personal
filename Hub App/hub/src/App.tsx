import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import SignIn from './routes/SignIn'
import AuthCallback from './routes/AuthCallback'
import Home from './routes/Home'
import Workspace from './routes/Workspace'
import { PushProvider } from './contexts/PushContext'

export default function App() {
  return (
    <PushProvider deviceSyncId="9b37a3e7-9b71-4882-a87f-5689913550f7">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace"
              element={<Navigate to="/workspace/vein" replace />}
            />
            <Route
              path="/workspace/:productId"
              element={
                <AdminRoute>
                  <Workspace />
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </PushProvider>
  )
}

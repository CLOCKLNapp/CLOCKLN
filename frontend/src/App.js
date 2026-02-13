import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRDashboard from './pages/HRDashboard';
import TotemPage from './pages/TotemPage';
import TotemSetupPage from './pages/TotemSetupPage';
import ScannerPage from './pages/ScannerPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import VacationPage from './pages/VacationPage';
import VacationRequestsPage from './pages/VacationRequestsPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentsReviewPage from './pages/DocumentsReviewPage';
import NotificationsPage from './pages/NotificationsPage';
import RemoteClockPage from './pages/RemoteClockPage';
import RemoteMapPage from './pages/RemoteMapPage';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children, requireHR = false }) {
  const { isAuthenticated, loading, isHR } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireHR && !isHR) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Dashboard Router - redirects based on role
function DashboardRouter() {
  const { isHR } = useAuth();
  return isHR ? <HRDashboard /> : <EmployeeDashboard />;
}

// Public Route - redirects to dashboard if authenticated
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes - All users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scanner"
        element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vacation"
        element={
          <ProtectedRoute>
            <VacationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remote-clock"
        element={
          <ProtectedRoute>
            <RemoteClockPage />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - HR only */}
      <Route
        path="/totem"
        element={
          <ProtectedRoute requireHR>
            <TotemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/totem-setup"
        element={
          <ProtectedRoute requireHR>
            <TotemSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute requireHR>
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vacation-requests"
        element={
          <ProtectedRoute requireHR>
            <VacationRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents-review"
        element={
          <ProtectedRoute requireHR>
            <DocumentsReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remote-map"
        element={
          <ProtectedRoute requireHR>
            <RemoteMapPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="dark">
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <Toaster 
              position="top-center" 
              richColors 
              theme="dark"
              toastOptions={{
                style: {
                  background: 'hsl(240 10% 7%)',
                  border: '1px solid hsl(240 5% 17%)',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </div>
  );
}

export default App;

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Profile from './pages/Profile';
import AdminAttendance from './pages/AdminAttendance';
import AdminEmployees from './pages/AdminEmployees';
import AdminBranches from './pages/AdminBranches';
import History from './pages/History';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminHolidays from './pages/AdminHolidays';
import AdminSignup from './pages/AdminSignup';
import AdminCustomerEntries from './pages/AdminCustomerEntries';
import AdminPipeline from './pages/AdminPipeline';
import AdminFollowups from './pages/AdminFollowups';
import AdminClients from './pages/AdminClients';
import AdminReports from './pages/AdminReports';
import InstallPrompt from './components/InstallPrompt';
import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from './context/ConfirmContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ConfirmProvider>
      <Router>
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              padding: '16px',
              fontWeight: '600',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }} 
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-signup" element={<AdminSignup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="branches" element={<AdminBranches />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="holidays" element={<AdminHolidays />} />
            <Route path="crm" element={<AdminCustomerEntries />} />
            <Route path="pipeline" element={<AdminPipeline />} />
            <Route path="follow-ups" element={<AdminFollowups />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <AdminCustomerEntries />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallPrompt />
      </Router>
    </ConfirmProvider>
  );
}

export default App;

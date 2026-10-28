import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoTourProvider } from './context/DemoTourContext';
import { Navbar } from './components/Navbar';
import { DemoBanner } from './components/DemoBanner';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DonorDashboard } from './pages/DonorDashboard';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { BloodBankDashboard } from './pages/BloodBankDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { VolunteerDashboard } from './pages/VolunteerDashboard';
import { Unauthorized } from './pages/Unauthorized';
import { UserRole } from './api/types';

const RoleBasedHome: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading BloodBridge...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'hospital':
      return <Navigate to="/hospital" replace />;
    case 'blood_bank':
      return <Navigate to="/blood-bank" replace />;
    case 'donor':
      return <Navigate to="/donor" replace />;
    case 'volunteer':
      return <Navigate to="/volunteer" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Verifying Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <DemoBanner />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoTourProvider>
          <Routes>
            {/* Public Entry */}
            <Route path="/" element={<RoleBasedHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Role Protected Routes */}
            <Route
              path="/donor"
              element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <DonorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hospital"
              element={
                <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                  <HospitalDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/blood-bank"
              element={
                <ProtectedRoute allowedRoles={['blood_bank', 'admin']}>
                  <BloodBankDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/volunteer"
              element={
                <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
                  <VolunteerDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DemoTourProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import SessionWorkspace from './pages/SessionWorkspace';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const DashboardRedirect = () => {
  const { userRole } = useAuth();

  // Debug - check console for role
  console.log("Current userRole:", userRole);

  // Show loading if role not yet determined
  if (userRole === null) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ 로딩 중...</div>;
  }

  if (userRole === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />
              <Route path="/class/:classId/session/:sessionId" element={
                <ProtectedRoute>
                  <SessionWorkspace />
                </ProtectedRoute>
              } />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

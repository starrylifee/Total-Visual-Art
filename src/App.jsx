import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import SessionWorkspace from './pages/SessionWorkspace';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { db } from './services/firebase';

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

const SessionAccessRoute = ({ children }) => {
  const { currentUser, userRole } = useAuth();
  const { classId, sessionId } = useParams();
  const [accessState, setAccessState] = useState('loading');

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (!currentUser || !classId || !sessionId) {
        if (isMounted) setAccessState('denied');
        return;
      }

      try {
        const [classSnap, sessionSnap] = await Promise.all([
          getDoc(doc(db, 'classes', classId)),
          getDoc(doc(db, 'classes', classId, 'sessions', sessionId))
        ]);

        if (!classSnap.exists() || !sessionSnap.exists()) {
          if (isMounted) setAccessState('denied');
          return;
        }

        const classData = classSnap.data();
        const sessionData = sessionSnap.data();
        const students = Array.isArray(classData.students) ? classData.students : [];
        const isTeacherAllowed = classData.teacherId === currentUser.uid;
        const isStudentAllowed = students.includes(currentUser.uid)
          && sessionData.isActive !== false
          && sessionData.status !== 'archived';
        const allowed = userRole === 'teacher'
          ? isTeacherAllowed
          : isStudentAllowed;

        if (isMounted) setAccessState(allowed ? 'allowed' : 'denied');
      } catch (error) {
        console.error('Error checking session access:', error);
        if (isMounted) setAccessState('denied');
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [classId, currentUser, sessionId, userRole]);

  if (!currentUser) return <Navigate to="/login" replace />;

  if (accessState === 'loading') {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>세션 접근 권한 확인 중...</div>;
  }

  if (accessState === 'denied') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
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
                <SessionAccessRoute>
                  <SessionWorkspace />
                </SessionAccessRoute>
              } />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

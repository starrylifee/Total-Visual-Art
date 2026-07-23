import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionWorkspace from './pages/SessionWorkspace';
import StudentJoin from './pages/StudentJoin';
import StudentSession from './pages/StudentSession';
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

  if (userRole === null) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ 로딩 중...</div>;
  }

  if (userRole === 'teacher') return <TeacherDashboard />;
  // 학생은 구글 로그인 없이 활동코드로 입장한다
  return <Navigate to="/join" replace />;
};

// 세션 워크스페이스는 교사 전용 (학생은 /student/session 에서 토큰으로 접근)
const SessionAccessRoute = ({ children }) => {
  const { currentUser } = useAuth();
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
        const classSnap = await getDoc(doc(db, 'classes', classId));
        const allowed = classSnap.exists() && classSnap.data().teacherId === currentUser.uid;
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
  }, [classId, currentUser, sessionId]);

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
              <Route path="/join" element={<StudentJoin />} />
              <Route path="/student/session" element={<StudentSession />} />
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

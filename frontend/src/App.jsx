import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './utils/ProtectedRoute.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import ParentDashboard from './pages/ParentDashboard.jsx'
import AddStudent from './pages/AddStudent.jsx'
import EditStudent from './pages/EditStudent.jsx'
import StudentProgressWindow from './pages/StudentProgressWindow.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import useSessionManager from './hooks/useSessionManager.jsx'
import SessionWarningDialog from './components/SessionWarningDialog.jsx'
import { setupAxiosInterceptors } from './utils/axiosInterceptors.js'

function App() {
  const { showWarning, timeLeft, extendSession, forceLogout } = useSessionManager();

  // Setup axios interceptors on app load
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/teacher/students" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/doctor/students" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/parent/students" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="/teacher/students/add" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
        <Route path="/teacher/students/edit/:id" element={<ProtectedRoute><EditStudent /></ProtectedRoute>} />

        <Route path="/spw/:student_id" element={<StudentProgressWindow />} />
      </Routes>
      
      {/* Global session warning dialog */}
      <SessionWarningDialog 
        showWarning={showWarning}
        timeLeft={timeLeft}
        onContinueSession={extendSession}
        onLogoutNow={forceLogout}
      />
    </div>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './utils/ProtectedRoute'
import WelcomePage from './pages/WelcomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import TeacherDashboard from './pages/TeacherDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import ParentDashboard from './pages/ParentDashboard'
import AddStudent from './pages/AddStudent'
import EditStudent from './pages/EditStudent'
import StudentProgress from './pages/StudentProgress'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/teacher/students" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/doctor/students" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/parent/students" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />

        <Route path="/teacher/students/add" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
        <Route path="/teacher/students/edit/:id" element={<ProtectedRoute><EditStudent /></ProtectedRoute>} />

        <Route path="/spw/:student_id" element={<StudentProgress />} />
      </Routes>
    </div>
  )
}

export default App

import { useContext } from 'react'
import { AuthContext } from '../store/AuthContext'

export default function DoctorDashboard() {
  const { user, logout } = useContext(AuthContext)
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Doctor Dashboard</h2>
      <p>Welcome, {user?.username || 'Doctor'}!</p>
      <button onClick={logout} className="mt-4 bg-red-500 text-white px-3 py-1 rounded">Logout</button>
    </div>
  )
}

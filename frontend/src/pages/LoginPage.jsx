import { useState, useContext } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import * as jwt_decode from 'jwt-decode'
import { AuthContext } from '../store/AuthContext'

export default function LoginPage() {
  const { login } = useContext(AuthContext)
  const [form, setForm] = useState({ email: '', password: '' })
  const [role, setRole] = useState('teacher')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/users/token/', {
        username: form.email,
        password: form.password
      })
      
      const token = res.data.access
      const refreshToken = res.data.refresh
      
      // Store both tokens
      localStorage.setItem('refresh_token', refreshToken)
      
      login(token)
      if (role === 'teacher') navigate('/teacher/students')
      else if (role === 'doctor') navigate('/doctor/students')
      else navigate('/parent/students')
    } catch (err) {
      setError('Login failed')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md space-y-4">
        <input className="border p-2 w-64" name="email" placeholder="Email" onChange={handleChange} required />
        <input className="border p-2 w-64" type="password" name="password" placeholder="Password" onChange={handleChange} required />

        <select className="border p-2 w-64" value={role} onChange={e => setRole(e.target.value)}>
          <option value="teacher">Teacher</option>
          <option value="doctor">Doctor</option>
          <option value="parent">Parent</option>
        </select>

        <button className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </div>
  )
}

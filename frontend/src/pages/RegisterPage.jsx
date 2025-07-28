import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'teacher'
  })
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post('http://127.0.0.1:8000/api/users/register/', form)
      navigate('/login')
    } catch (err) {
      setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-semibold mb-4">Register</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md space-y-4">
        <input className="border p-2 w-64" name="username" placeholder="Name" onChange={handleChange} required />
        <input className="border p-2 w-64" name="email" placeholder="Email" onChange={handleChange} required />
        <input className="border p-2 w-64" name="phone" placeholder="Phone" onChange={handleChange} required />
        <input className="border p-2 w-64" type="password" name="password" placeholder="Password" onChange={handleChange} required />

        <select name="role" className="border p-2 w-64" onChange={handleChange}>
          <option value="teacher">Teacher</option>
          <option value="doctor">Doctor</option>
          <option value="parent">Parent</option>
        </select>

        <button disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
          {loading ? 'Registering...' : 'Register'}
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </div>
  )
}

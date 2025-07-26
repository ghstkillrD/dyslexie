import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function AddStudent() {
  const [form, setForm] = useState({
    name: '',
    birthday: '',
    school: '',
    grade: '',
    gender: ''
  })
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post('http://127.0.0.1:8000/api/users/students/', form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/teacher/students')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Add New Student</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="date" name="birthday" value={form.birthday} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="text" name="school" placeholder="School" value={form.school} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="text" name="grade" placeholder="Grade" value={form.grade} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <select name="gender" value={form.gender} onChange={handleChange} className="border px-2 py-1 w-full" required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={() => navigate('/teacher/students')} className="ml-2 bg-gray-500 text-white px-3 py-1 rounded">Cancel</button>
      </form>
    </div>
  )
}

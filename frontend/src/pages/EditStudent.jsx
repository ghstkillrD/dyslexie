import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import UserSelectorTable from '../components/UserSelectorTable'

export default function EditStudent() {
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [parents, setParents] = useState([])
  const [selectedDoctors, setSelectedDoctors] = useState([])
  const [selectedParents, setSelectedParents] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    axios.get(`http://127.0.0.1:8000/api/users/students/${id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setForm(res.data))
    .catch(err => console.error(err))

  // Fetch linked users
    axios.get(`http://127.0.0.1:8000/api/users/students/${id}/linked_users/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const linkedDoctors = res.data.filter(u => u.role === 'doctor').map(u => u.email)
      const linkedParents = res.data.filter(u => u.role === 'parent').map(u => u.email)
      setSelectedDoctors(linkedDoctors)
      setSelectedParents(linkedParents)
    })

    // Fetch all users
    axios.get('http://127.0.0.1:8000/api/users/', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setDoctors(res.data.filter(u => u.role === 'doctor'))
      setParents(res.data.filter(u => u.role === 'parent'))
    })
  }, [id])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const toggleDoctor = email => {
    setSelectedDoctors(prev =>
      prev.includes(email) ? prev.filter(d => d !== email) : [...prev, email]
    )
  }

  const toggleParent = email => {
    setSelectedParents(prev =>
      prev.includes(email) ? prev.filter(p => p !== email) : [...prev, email]
    )
  }

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.put(`http://127.0.0.1:8000/api/users/students/${id}/`, {
        ...form,
        doctor_emails: selectedDoctors,
        parent_emails: selectedParents
        }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/teacher/students')
    } catch (err) {
      console.error(err)
    }
  }

  if (!form) return <p className="p-6">Loading...</p>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Edit Student</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" name="name" value={form.name} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="date" name="birthday" value={form.birthday} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="text" name="school" value={form.school} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <input type="text" name="grade" value={form.grade} onChange={handleChange} className="border px-2 py-1 w-full" required />
        <select name="gender" value={form.gender} onChange={handleChange} className="border px-2 py-1 w-full" required>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <div className="mt-4">
          <UserSelectorTable
            users={doctors}
            selected={selectedDoctors}
            onToggle={toggleDoctor}
            title="Select Doctors"
          />
        </div>

        <div className="mt-4">
          <UserSelectorTable
            users={parents}
            selected={selectedParents}
            onToggle={toggleParent}
            title="Select Parents"
          />
        </div>

        <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={() => navigate('/teacher/students')} className="ml-2 bg-gray-500 text-white px-3 py-1 rounded">Cancel</button>
      </form>
    </div>
  )
}

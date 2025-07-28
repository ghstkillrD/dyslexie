import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import UserSelectorTable from '../components/UserSelectorTable'

export default function AddStudent() {
  const [form, setForm] = useState({
    name: '',
    birthday: '',
    school: '',
    grade: '',
    gender: ''
  })
  const [doctors, setDoctors] = useState([])
  const [parents, setParents] = useState([])
  const [selectedDoctors, setSelectedDoctors] = useState([])
  const [selectedParents, setSelectedParents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    axios.get('http://127.0.0.1:8000/api/users/', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setDoctors(res.data.filter(u => u.role === 'doctor'))
      setParents(res.data.filter(u => u.role === 'parent'))
    })
    .catch(err => console.error(err))
  }, [])

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
      await axios.post('http://127.0.0.1:8000/api/users/students/', {
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

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

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading student information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/teacher/students')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Back to Students"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Student</h1>
                <p className="text-gray-600 mt-1">Update student information and assignments</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Student ID</p>
                <p className="text-sm text-gray-500">{id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Student Information</h2>
                  <p className="text-sm text-gray-600">Basic details and academic information</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter student's full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={form.birthday}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="school"
                    value={form.school}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter school name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter grade level"
                    required
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Assignment Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <UserSelectorTable
              users={doctors}
              selected={selectedDoctors}
              onToggle={toggleDoctor}
              title="Select Doctors"
              icon="medical"
              description="Assign medical professionals to monitor this student's progress"
            />
          </div>

          {/* Parent Assignment Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <UserSelectorTable
              users={parents}
              selected={selectedParents}
              onToggle={toggleParent}
              title="Select Parents"
              icon="family"
              description="Link parents or guardians to receive updates on their child's progress"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <button
              type="button"
              onClick={() => navigate('/teacher/students')}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

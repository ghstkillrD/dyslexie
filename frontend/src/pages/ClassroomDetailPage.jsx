import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import NavigationHeader from '../components/NavigationHeader'
import { useContext } from 'react'
import { AuthContext } from '../store/AuthContext'

export default function ClassroomDetailPage() {
  const { classroomId } = useParams()
  const { user, logout } = useContext(AuthContext)
  const [classroom, setClassroom] = useState(null)
  const [students, setStudents] = useState([])
  const [unassignedStudents, setUnassignedStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [linkedUsers, setLinkedUsers] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  
  // New student form
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    birthday: '',
    school: '',
    grade: '',
    gender: 'male'
  })
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchClassroomData()
    fetchUnassignedStudents()
  }, [classroomId])

  const fetchClassroomData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/classrooms/${classroomId}/students/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setClassroom(response.data.classroom)
      setStudents(response.data.students)
      setLoading(false)
    } catch (err) {
      setError('Failed to load classroom data')
      setLoading(false)
    }
  }

  const fetchUnassignedStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('http://127.0.0.1:8000/api/users/students/unassigned/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnassignedStudents(response.data.students)
    } catch (err) {
      console.error('Failed to load unassigned students:', err)
    }
  }

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `http://127.0.0.1:8000/api/users/classrooms/${classroomId}/students/`,
        { student_ids: selectedStudents },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setSuccess('Students assigned successfully!')
      setShowAddStudentModal(false)
      setSelectedStudents([])
      setError('')
      fetchClassroomData()
      fetchUnassignedStudents()
    } catch (err) {
      console.error('Assignment error:', err.response?.data)
      setError(err.response?.data?.error || 'Failed to assign students')
    }
  }

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student from the classroom?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `http://127.0.0.1:8000/api/users/classrooms/${classroomId}/students/${studentId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setSuccess('Student removed from classroom!')
      fetchClassroomData()
      fetchUnassignedStudents()
    } catch (err) {
      setError('Failed to remove student')
    }
  }

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      // Create student
      const createResponse = await axios.post(
        'http://127.0.0.1:8000/api/users/students/',
        newStudentForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      const newStudentId = createResponse.data.student_id
      
      // Assign to classroom
      await axios.post(
        `http://127.0.0.1:8000/api/users/classrooms/${classroomId}/students/`,
        { student_ids: [newStudentId] },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setSuccess('Student created and added to classroom!')
      setShowCreateStudentModal(false)
      setNewStudentForm({
        name: '',
        birthday: '',
        school: '',
        grade: '',
        gender: 'male'
      })
      fetchClassroomData()
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Failed to create student')
    }
  }

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student? This will also delete all their data."))
      return
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`http://127.0.0.1:8000/api/users/students/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchClassroomData()
      setSuccess('Student deleted successfully!')
    } catch (err) {
      setError('Failed to delete student')
    }
  }

  const openModal = async (student) => {
    setSelectedStudent(student)
    try {
      const token = localStorage.getItem("token")
      const res = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student.student_id}/linked_users/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      setLinkedUsers(res.data)
      setShowModal(true)
    } catch (err) {
      setError('Failed to load linked users')
    }
  }

  const handleEditStudent = (student) => {
    navigate(`/teacher/students/edit/${student.student_id}`)
  }

  const handleViewProgress = (student) => {
    navigate(`/spw/${student.student_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader 
          title="Classroom"
          subtitle="Loading classroom..."
          userRole="teacher"
          onLogout={logout}
          profileButtonColor="blue"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading classroom...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader 
          title="Classroom Not Found"
          subtitle="The requested classroom could not be found"
          userRole="teacher"
          onLogout={logout}
          profileButtonColor="blue"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Classroom Not Found</h3>
            <button
              onClick={() => navigate('/classrooms')}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Back to Classrooms
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <NavigationHeader 
        title={classroom.name}
        subtitle={classroom.description || 'Manage students in this classroom'}
        userRole="teacher"
        onLogout={logout}
        profileButtonColor="blue"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-800">{success}</span>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => navigate('/classrooms')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Back to Classrooms"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Students in Classroom</h2>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {students.length} students enrolled
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Students
            </button>
            <button
              onClick={() => setShowCreateStudentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Create Student
            </button>
          </div>
        </div>

        {/* Students Grid */}
        {students.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Students Yet</h3>
            <p className="text-gray-600 mb-6">Add existing students or create new ones for this classroom</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Add Existing Students
              </button>
              <button
                onClick={() => setShowCreateStudentModal(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Create New Student
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div key={student.student_id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{student.name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Grade: {student.grade}</p>
                        <p>School: {student.school}</p>
                        <p>Age: {new Date().getFullYear() - new Date(student.birthday).getFullYear()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="Edit student"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openModal(student)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        title="View linked users"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.student_id)}
                        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                        title="Remove from classroom"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.student_id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Delete student"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {student.stage_progress && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.stage_progress.current_stage > 1 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Stage {student.stage_progress.current_stage}/7
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleViewProgress(student)}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      View Progress
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Students Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Students to Classroom</h3>
              <button 
                onClick={() => {
                  setShowAddStudentModal(false)
                  setSelectedStudents([])
                  setError('')
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {unassignedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No unassigned students available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">Select students to add to this classroom:</p>
                  {unassignedStudents.map((student) => (
                    <label key={student.student_id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.student_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.student_id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.student_id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-600">Grade {student.grade} • {student.school}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {unassignedStudents.length > 0 && (
              <div className="flex justify-between items-center p-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {selectedStudents.length} students selected
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAssignStudents}
                    disabled={selectedStudents.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200"
                  >
                    Add Selected Students
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStudentModal(false)
                      setSelectedStudents([])
                      setError('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Student</h3>
              <button 
                onClick={() => {
                  setShowCreateStudentModal(false)
                  setNewStudentForm({
                    name: '',
                    birthday: '',
                    school: '',
                    grade: '',
                    gender: 'male'
                  })
                  setError('')
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
                  <input
                    type="date"
                    value={newStudentForm.birthday}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, birthday: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
                  <input
                    type="text"
                    value={newStudentForm.school}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, school: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <input
                    type="text"
                    value={newStudentForm.grade}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, grade: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={newStudentForm.gender}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Create & Add Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateStudentModal(false)
                    setNewStudentForm({
                      name: '',
                      birthday: '',
                      school: '',
                      grade: '',
                      gender: 'male'
                    })
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Linked Users Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Linked Users - {selectedStudent.name}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {linkedUsers.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No linked users found</p>
              ) : (
                <div className="space-y-3">
                  {linkedUsers.map((link) => (
                    <div key={link.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{link.username}</p>
                        <p className="text-sm text-gray-600 capitalize">{link.role}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        link.role === 'doctor' ? 'bg-green-100 text-green-800' : 
                        link.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {link.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-50">
      <h1 className="text-4xl font-bold mb-6">Dyslexie</h1>
      <div className="space-x-4">
        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded">Sign In</Link>
        <Link to="/register" className="px-4 py-2 bg-green-600 text-white rounded">Register</Link>
      </div>
    </div>
  )
}

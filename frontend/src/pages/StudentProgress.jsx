import { useParams } from 'react-router-dom'

export default function StudentProgress() {
  const { student_id } = useParams()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Student Progress Window</h1>
      <p className="mt-2">Student ID: {student_id}</p>
      <p className="text-gray-500 mt-4">This is a placeholder. Stages will be implemented later.</p>
    </div>
  )
}

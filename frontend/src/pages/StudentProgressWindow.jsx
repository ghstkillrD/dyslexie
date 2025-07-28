import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentProgressWindow() {
  const { student_id } = useParams()
  const [currentStage, setCurrentStage] = useState(1);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`http://127.0.0.1:8000/api/users/students/${student_id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setStudent(res.data))
      .catch(err => console.error(err));
  }, [student_id]);

  const stages = [
    "Stage 1: Handwriting Sample",
    "Stage 2: Define Tasks",
    "Stage 3: Assign Marks",
    "Stage 4: Cutoff & Summary",
    "Stage 5: Assign Activities",
    "Stage 6: Activity Tracking",
    "Stage 7: Evaluation Summary"
  ];

 return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {student ? `${student.name}'s Progress` : "Loading..."}
      </h2>

      <div className="flex space-x-2 mb-6">
        {stages.map((label, index) => (
          <button
            key={index}
            className={`px-3 py-1 rounded ${currentStage === index+1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setCurrentStage(index+1)}
          >
            {index+1}
          </button>
        ))}
      </div>

      <div className="border p-4 rounded bg-white">
        <h3 className="text-lg font-semibold">{stages[currentStage-1]}</h3>
        <p className="text-gray-500 mt-2">Stage {currentStage} content goes here.</p>
      </div>
    </div>
  );
}

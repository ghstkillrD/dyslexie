import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentProgressWindow() {
  const { student_id } = useParams()
  const [currentStage, setCurrentStage] = useState(1);
  const [student, setStudent] = useState(null);
  const [progress, setProgress] = useState({ current_stage: 1, completed_stages: [] });

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`http://127.0.0.1:8000/api/users/students/${student_id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => {
        setStudent(res.data);
        if (res.data.current_stage || res.data.stage_progress) {
          // Accept both formats: current_stage or nested stage_progress
          const stageData = res.data.stage_progress || {};
          setProgress({
            current_stage: stageData.current_stage || res.data.current_stage || 1,
            completed_stages: stageData.completed_stages || []
          });
          setCurrentStage(stageData.current_stage || res.data.current_stage || 1);
        }
      })
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

  const handleStageClick = (index) => {
    const stageNumber = index + 1;
    if (stageNumber <= progress.current_stage) {
      setCurrentStage(stageNumber);
    }
  };

  const isLocked = (index) => index + 1 > progress.current_stage;
  const isCompleted = (index) => progress.completed_stages.includes(index + 1);

 return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {student ? `${student.name}'s Progress` : "Loading..."}
      </h2>

      <div className="flex space-x-2 mb-6">
        {stages.map((label, index) => (
          <button
            key={index}
            className={`px-3 py-1 rounded 
              ${currentStage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}
              ${isLocked(index) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleStageClick(index)}
            disabled={isLocked(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="border p-4 rounded bg-white">
        <h3 className="text-lg font-semibold">{stages[currentStage - 1]}</h3>

        {isLocked(currentStage - 1) && (
          <p className="text-red-500 mt-2">
            This stage is locked. Complete previous stages first.
          </p>
        )}

        {isCompleted(currentStage - 1) && currentStage !== progress.current_stage && (
          <p className="text-green-500 mt-2">
            This stage has been completed (view-only).
          </p>
        )}

        <p className="text-gray-500 mt-2">Stage {currentStage} content goes here.</p>
      </div>
    </div>
  );
}

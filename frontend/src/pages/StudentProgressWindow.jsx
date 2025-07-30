import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom'

export default function StudentProgressWindow() {
  const { student_id } = useParams()
  const [currentStage, setCurrentStage] = useState(1);
  const [student, setStudent] = useState(null);
  const [progress, setProgress] = useState({ current_stage: 1, completed_stages: [] });
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate()

  // Stage 1 state
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

   // Stage 2 state
  const [outOfMark, setOutOfMark] = useState("");
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserRole(decoded.role);
    }
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

  // Allowed roles per stage
  const stageRoles = {
    1: ['teacher'],
    2: ['doctor'],
    3: ['teacher'],
    4: ['doctor'],
    5: ['doctor'],
    6: ['teacher', 'parent'],
    7: ['doctor']
  };

  const handleStageClick = (index) => {
    const stageNumber = index + 1;
    if (stageNumber <= progress.current_stage) {
      setCurrentStage(stageNumber);
    }
  };

  const isLocked = (index) => index + 1 > progress.current_stage;
  const isCompleted = (index) => progress.completed_stages.includes(index + 1);

  const canEditStage = (stageNumber) => {
    const allowed = stageRoles[stageNumber] || [];
    return allowed.includes(userRole);
  };

  // Upload handwriting sample to backend
  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/analyze-handwriting/`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }}
      );
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
  };

  // Call backend to complete current stage and advance
  const handleNext = async () => {
    setNextLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setProgress({
        current_stage: res.data.current_stage,
        completed_stages: res.data.completed_stages
      });
      setCurrentStage(res.data.current_stage);

    } catch (err) {
      console.error(err.response?.data || err);
    } finally {
      setNextLoading(false);
    }
  };
  
  const handleAddTask = () => {
    if (!taskName || !outOfMark) return;
    setTasks([...tasks, { task_name: taskName, max_score: parseInt(outOfMark) }]);
    setTaskName("");
  };

  const handleClearTasks = () => {
    setOutOfMark("");
    setTaskName("");
    setTasks([]);
  };

  const handleSaveTasks = async () => {
    if (!tasks.length) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/add_tasks/`,
        { out_of_mark: parseInt(outOfMark), tasks },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Advance to next stage
      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setProgress(prev => ({
        ...prev,
        current_stage: prev.current_stage + 1,
        completed_stages: [...prev.completed_stages, currentStage]
      }));
      setCurrentStage(currentStage + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

        {/* Role-based message */}
        {!canEditStage(currentStage) && !isCompleted(currentStage - 1) && currentStage === progress.current_stage && (
          <p className="text-orange-500 mt-2">
            This stage is to be completed by the {stageRoles[currentStage].join('/')} of this student.
          </p>
        )}

        {isCompleted(currentStage - 1) && currentStage !== progress.current_stage && (
          <p className="text-green-500 mt-2">
            This stage has been completed (view-only).
          </p>
        )}

        {/* Stage 1 UI */}
        {currentStage === 1 && !isLocked(0) && (
          <div className="mt-4">
            <input
              type="file"
              onChange={e => setImage(e.target.files[0])} 
              disabled={!canEditStage(1) || isCompleted(0)} />
            <div className="mt-2 space-x-2">
              <button
                onClick={handleUpload}
                className="bg-blue-500 text-white px-3 py-1 rounded"
                disabled={loading || !canEditStage(1) || isCompleted(0)}
              >
                {loading ? "Analyzing..." : "Submit"}
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-400 text-white px-3 py-1 rounded"
                disabled={loading || !canEditStage(1) || isCompleted(0)}
              >
                Clear
              </button>
              <button
                onClick={handleNext}
                className="bg-green-500 text-white px-3 py-1 rounded"
                disabled={!result || nextLoading || !canEditStage(1) || isCompleted(0)}
              >
                {nextLoading ? "Saving..." : "Next"}
              </button>
            </div>

            {result && (
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <p><strong>Dyslexia Score:</strong> {result.dyslexia_score}</p>
                <p><strong>Interpretation:</strong> {result.interpretation}</p>
                <p><strong>Letter Counts:</strong> {JSON.stringify(result.letter_counts)}</p>
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Define Tasks */}
        {currentStage === 2 && !isLocked(1) && (
          <div className="mt-4">
            {userRole !== "doctor" && !isCompleted(1) ? (
              <p className="text-red-500">
                This stage is to be completed by the Doctor assigned to {student?.name}.
              </p>
            ) : (
              <>
                <div className="mb-2">
                  <label className="block">Out of Mark:</label>
                  <input
                    type="number"
                    value={outOfMark}
                    onChange={(e) => setOutOfMark(e.target.value)}
                    disabled={isCompleted(1) || userRole !== "doctor"}
                    className="border p-1 rounded w-40"
                  />
                </div>

                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Task Name"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    disabled={isCompleted(1) || userRole !== "doctor"}
                    className="border p-1 rounded flex-1"
                  />
                  <button
                    onClick={handleAddTask}
                    disabled={!taskName || !outOfMark || isCompleted(1) || userRole !== "doctor"}
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    Add
                  </button>
                </div>

                {tasks.length > 0 && (
                  <table className="w-full border mt-2">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="p-2">Task</th>
                        <th className="p-2">Max Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{t.task_name}</td>
                          <td className="p-2">{t.max_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="mt-3 space-x-2">
                  <button
                    onClick={handleClearTasks}
                    disabled={isCompleted(1) || userRole !== "doctor"}
                    className="bg-gray-400 text-white px-3 py-1 rounded"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSaveTasks}
                    disabled={!tasks.length || isCompleted(1) || userRole !== "doctor"}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    {loading ? "Saving..." : "Next"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {currentStage !== 1 && (
          <p className="text-gray-500 mt-2">Stage {currentStage} content goes here.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (userRole === 'teacher') {
            navigate('/teacher/students');
          } else if (userRole === 'doctor') {
            navigate('/doctor/students');
          } else if (userRole === 'parent') {
            navigate('/parent/students');
          }
        }}
        className="ml-2 bg-gray-500 text-white px-3 py-1 rounded"
      >
        Back
      </button>
    </div>
  );
}

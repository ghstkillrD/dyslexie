import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Stage1 from '../components/spw_stages/Stage1';
import Stage2 from '../components/spw_stages/Stage2';
import Stage3 from '../components/spw_stages/Stage3';
import Stage4 from '../components/spw_stages/Stage4';
import Stage5 from '../components/spw_stages/Stage5';
import Stage6 from '../components/spw_stages/Stage6';
import Stage7 from '../components/spw_stages/Stage7';
import TherapyReports from '../components/spw_stages/TherapyReports';
import ChatComponent from '../components/ChatComponent';

export default function StudentProgressWindow() {
  const { student_id } = useParams()
  const [currentStage, setCurrentStage] = useState(1);
  const [currentTab, setCurrentTab] = useState('stages'); // 'stages', 'reports', or 'messages'
  const [student, setStudent] = useState(null);
  const [progress, setProgress] = useState({ current_stage: 1, completed_stages: [] });
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserRole(decoded.role);
      setUser({
        id: decoded.user_id,
        username: decoded.username || 'User',
        role: decoded.role
      });
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
    "Stage 7: Final Evaluation"
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

  const handleStageComplete = (data) => {
    setProgress({
      current_stage: data.current_stage,
      completed_stages: data.completed_stages
    });
    setCurrentStage(data.current_stage);
  };

  const handleTerminateProgress = async () => {
    // Show detailed confirmation dialog
    const confirmMessage = 
      `⚠️ TERMINATE PROGRESS WARNING ⚠️\n\n` +
      `This will PERMANENTLY delete ALL therapy data for ${student?.name}:\n\n` +
      `❌ WILL BE COMPLETELY DELETED:\n` +
      `• Handwriting analysis and images (Stage 1)\n` +
      `• All tasks and scores (Stage 2+)\n` +
      `• Assessment summaries (Stage 3+)\n` +
      `• Activity assignments and progress (Stage 4+)\n` +
      `• Final evaluations (Stage 6+)\n` +
      `• Therapy reports (Stage 7)\n` +
      `• All stakeholder recommendations\n\n` +
      `✅ WILL BE PRESERVED:\n` +
      `• Basic student information (name, birthday, school, etc.)\n\n` +
      `After termination, the student will restart completely from Stage 1.\n\n` +
      `Are you absolutely sure you want to continue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Second confirmation for safety
    const secondConfirm = window.confirm(
      `🚨 FINAL CONFIRMATION 🚨\n\nThis action CANNOT be undone.\n\nAll therapy progress will be lost!\n\nClick OK if you're certain you want to start completely fresh from Stage 1.`
    );

    if (!secondConfirm) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/terminate_progress/`,
        { confirm_termination: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setProgress({
        current_stage: response.data.current_stage,
        completed_stages: response.data.completed_stages
      });
      setCurrentStage(response.data.current_stage);

      // Show success message
      alert(
        `✅ Progress Terminated Successfully!\n\n` +
        `${response.data.message}\n\n` +
        `Current Stage: ${response.data.current_stage}\n` +
        `Preserved: ${response.data.preserved_data}`
      );
      
      // Reload to ensure all components refresh with new data
      window.location.reload();

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to terminate progress';
      const errorDetail = error.response?.data?.detail || '';
      
      alert(
        `❌ Termination Failed\n\n` +
        `Error: ${errorMessage}\n` +
        `${errorDetail ? `Details: ${errorDetail}` : ''}`
      );
      
      console.error('Termination error:', error);
    }
  };

 return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {student ? `${student.name}'s Progress` : "Loading..."}
      </h2>

      {/* Tab Navigation */}
      <div className="flex justify-between items-center mb-6 border-b">
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 font-medium rounded-t-lg ${
              currentTab === 'stages' 
                ? 'bg-blue-500 text-white border-b-2 border-blue-500' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setCurrentTab('stages')}
          >
            Assessment Stages
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-t-lg ${
              currentTab === 'reports' 
                ? 'bg-blue-500 text-white border-b-2 border-blue-500' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setCurrentTab('reports')}
          >
            Therapy Reports
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-t-lg ${
              currentTab === 'messages' 
                ? 'bg-blue-500 text-white border-b-2 border-blue-500' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setCurrentTab('messages')}
          >
            Messages
          </button>
        </div>

        {/* Terminate Progress Button - Only visible to teachers and only after Stage 1 completion */}
        {userRole === 'teacher' && progress.completed_stages.includes(1) && (
          <button
            className={`px-4 py-2 font-medium rounded-t-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex items-center gap-2`}
            onClick={handleTerminateProgress}
            title="Terminate all therapy progress and restart completely from Stage 1"
          >
            <span className="text-sm">⚠️</span>
            Terminate Progress
          </button>
        )}
      </div>

      {currentTab === 'stages' ? (
        // Stages tab content
        <>
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
              <Stage1
                student_id={student_id}
                canEdit={canEditStage(1)}
                isCompleted={isCompleted(0)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 2: Define Tasks */}
            {currentStage === 2 && !isLocked(1) && (
              <Stage2
                student_id={student_id}
                canEdit={canEditStage(2)}
                isCompleted={isCompleted(1)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 3: Assign Marks */}
            {currentStage === 3 && !isLocked(2) && (
              <Stage3
                student_id={student_id}
                canEdit={canEditStage(3)}
                isCompleted={isCompleted(2)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 4: Cutoff & Summary */}
            {currentStage === 4 && !isLocked(3) && (
              <Stage4
                student_id={student_id}
                canEdit={canEditStage(4)}
                isCompleted={isCompleted(3)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 5: Assign Activities */}
            {currentStage === 5 && !isLocked(4) && (
              <Stage5
                student_id={student_id}
                canEdit={canEditStage(5)}
                isCompleted={isCompleted(4)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 6: Activity Tracking */}
            {currentStage === 6 && !isLocked(5) && (
              <Stage6
                student_id={student_id}
                canEdit={canEditStage(6)}
                isCompleted={isCompleted(5)}
                onComplete={handleStageComplete}
              />
            )}

            {/* Stage 7: Final Evaluation */}
            {currentStage === 7 && !isLocked(6) && (
              <Stage7
                student_id={student_id}
                canEdit={canEditStage(7)}
                isCompleted={isCompleted(6)}
                onComplete={handleStageComplete}
              />
            )}

          </div>
        </>
      ) : currentTab === 'reports' ? (
        // Reports tab content
        <div className="border p-4 rounded bg-white">
          <TherapyReports student_id={student_id} />
        </div>
      ) : (
        // Messages tab content
        <div className="border p-4 rounded bg-white">
          <ChatComponent studentId={student_id} currentUser={user} />
        </div>
      )}
      
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

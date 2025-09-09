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
  const [isLoading, setIsLoading] = useState(true);
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
    fetchStudentData();
  }, [student_id]);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://127.0.0.1:8000/api/users/students/${student_id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const stages = [
    { 
      title: "Handwriting Sample", 
      description: "Upload and analyze handwriting samples",
      icon: "✍️"
    },
    { 
      title: "Define Tasks", 
      description: "Medical professional defines assessment tasks",
      icon: "📋"
    },
    { 
      title: "Assign Marks", 
      description: "Teacher evaluates and assigns marks to tasks",
      icon: "📊"
    },
    { 
      title: "Cutoff & Summary", 
      description: "Medical review and assessment summary",
      icon: "📈"
    },
    { 
      title: "Assign Activities", 
      description: "Therapeutic activities assignment",
      icon: "🎯"
    },
    { 
      title: "Activity Tracking", 
      description: "Monitor and track activity progress",
      icon: "📱"
    },
    { 
      title: "Final Evaluation", 
      description: "Complete therapy evaluation and recommendations",
      icon: "🏆"
    }
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
    if (stageNumber <= (progress?.current_stage || 1)) {
      setCurrentStage(stageNumber);
    }
  };

  const isLocked = (index) => index + 1 > (progress?.current_stage || 1);
  const isCompleted = (index) => progress?.completed_stages?.includes(index + 1) || false;

  const canEditStage = (stageNumber) => {
    const allowed = stageRoles[stageNumber] || [];
    return allowed.includes(userRole);
  };

  const handleStageComplete = (data) => {
    // Only update if we have proper stage data
    if (data && data.current_stage !== undefined && data.completed_stages !== undefined) {
      setProgress({
        current_stage: data.current_stage,
        completed_stages: data.completed_stages
      });
      setCurrentStage(data.current_stage);
    } else {
      // If no proper stage data, refresh from server
      fetchStudentData();
    }
  };

  const handleTherapyComplete = () => {
    // Refresh student data after therapy completion to get updated case status
    fetchStudentData();
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

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'teacher': return 'Teacher';
      case 'doctor': return 'Medical Professional';
      case 'parent': return 'Parent/Guardian';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading student progress...</p>
          </div>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  if (userRole === 'teacher') {
                    navigate('/teacher/students');
                  } else if (userRole === 'doctor') {
                    navigate('/doctor/students');
                  } else if (userRole === 'parent') {
                    navigate('/parent/students');
                  }
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {student ? `${student.name}'s Progress` : "Student Progress"}
                </h1>
                <p className="text-gray-600 mt-1">Dyslexia therapy assessment and tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Current Stage</p>
                <p className="text-sm text-gray-500">Stage {progress?.current_stage || 1} of 7</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">{stages[currentStage - 1]?.icon}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round(((progress?.completed_stages?.length || 0) / 7) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((progress?.completed_stages?.length || 0) / 7) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex space-x-1">
              <button
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  currentTab === 'stages' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentTab('stages')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h5.586a1 1 0 00.707-.293l5.414-5.414a1 1 0 00.293-.707V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Assessment Stages
              </button>
              <button
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  currentTab === 'reports' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentTab('reports')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Therapy Reports
              </button>
              <button
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  currentTab === 'messages' 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentTab('messages')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Messages
              </button>
            </div>

            {/* Terminate Progress Button - Only visible to teachers and only after Stage 1 completion */}
            {userRole === 'teacher' && progress?.completed_stages?.includes(1) && (
              <button
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                onClick={handleTerminateProgress}
                title="Terminate all therapy progress and restart completely from Stage 1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Terminate Progress
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {currentTab === 'stages' ? (
              <>
                {/* Stage Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
                  {stages.map((stage, index) => {
                    const stageNumber = index + 1;
                    const locked = isLocked(index);
                    const completed = isCompleted(index);
                    const current = currentStage === stageNumber;
                    
                    return (
                      <div
                        key={index}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                          current 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : completed
                            ? 'border-green-300 bg-green-50 hover:border-green-400'
                            : locked
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                        }`}
                        onClick={() => !locked && handleStageClick(index)}
                      >
                        <div className="text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                            completed ? 'bg-green-500 text-white' : 
                            current ? 'bg-blue-500 text-white' :
                            locked ? 'bg-gray-300 text-gray-500' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {completed ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-medium">{stageNumber}</span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-gray-900 mb-1">{stage.title}</div>
                          <div className="text-xs text-gray-500">{stage.description}</div>
                        </div>
                        
                        {locked && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 3h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stage Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{stages[currentStage - 1]?.icon}</div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            Stage {currentStage}: {stages[currentStage - 1]?.title}
                          </h3>
                          <p className="text-sm text-gray-600">{stages[currentStage - 1]?.description}</p>
                        </div>
                      </div>
                      
                      {/* Stage Status Badge */}
                      <div className="flex items-center space-x-2">
                        {isCompleted(currentStage - 1) ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                        ) : currentStage === (progress?.current_stage || 1) ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            View Only
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Role and Permission Info */}
                    {!canEditStage(currentStage) && !isCompleted(currentStage - 1) && currentStage === (progress?.current_stage || 1) && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-orange-800">
                            This stage is assigned to the {stageRoles[currentStage].map(getRoleDisplayName).join(' or ')} of this student.
                          </span>
                        </div>
                      </div>
                    )}

                    {isLocked(currentStage - 1) && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 3h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-sm font-medium text-red-800">
                            This stage is locked. Complete previous stages first.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Stage Components */}
                    {currentStage === 1 && !isLocked(0) && (
                      <Stage1
                        student_id={student_id}
                        canEdit={canEditStage(1)}
                        isCompleted={isCompleted(0)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 2 && !isLocked(1) && (
                      <Stage2
                        student_id={student_id}
                        canEdit={canEditStage(2)}
                        isCompleted={isCompleted(1)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 3 && !isLocked(2) && (
                      <Stage3
                        student_id={student_id}
                        canEdit={canEditStage(3)}
                        isCompleted={isCompleted(2)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 4 && !isLocked(3) && (
                      <Stage4
                        student_id={student_id}
                        canEdit={canEditStage(4)}
                        isCompleted={isCompleted(3)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 5 && !isLocked(4) && (
                      <Stage5
                        student_id={student_id}
                        canEdit={canEditStage(5)}
                        isCompleted={isCompleted(4)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 6 && !isLocked(5) && (
                      <Stage6
                        student_id={student_id}
                        canEdit={canEditStage(6)}
                        isCompleted={isCompleted(5)}
                        onComplete={handleStageComplete}
                      />
                    )}

                    {currentStage === 7 && !isLocked(6) && (
                      <Stage7
                        student_id={student_id}
                        canEdit={canEditStage(7)}
                        isCompleted={isCompleted(6)}
                        onComplete={handleStageComplete}
                        onTherapyComplete={handleTherapyComplete}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : currentTab === 'reports' ? (
              // Reports tab content
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Therapy Reports</h3>
                      <p className="text-sm text-gray-600">Comprehensive assessment and therapy documentation</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <TherapyReports student_id={student_id} />
                </div>
              </div>
            ) : (
              // Messages tab content
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Communication Portal</h3>
                      <p className="text-sm text-gray-600">Secure messaging between all stakeholders</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <ChatComponent studentId={student_id} currentUser={user} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export default function Stage6({ student_id, canEdit, isCompleted, onComplete }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressForm, setProgressForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    status: 'completed',
    duration_actual: '',
    completion_percentage: 100,
    notes: '',
    challenges: '',
    improvements: '',
    student_engagement: 5,
    difficulty_level: 5
  });
  const [nextLoading, setNextLoading] = useState(false);

  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserRole(decoded.role);
    }
    fetchActivities();
  }, [student_id]);

  const fetchActivities = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/activities/tracking/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      if (error.response?.status === 403) {
        setError('access_denied');
      } else {
        setError('fetch_error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecordProgress = async () => {
    if (!selectedActivity) return;

    try {
      const token = localStorage.getItem('token');
      const progressData = {
        ...progressForm,
        activity_assignment: selectedActivity.id
      };

      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/activities/progress/`,
        progressData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh activities to show updated progress
      await fetchActivities();
      setShowProgressModal(false);
      setProgressForm({
        session_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        duration_actual: '',
        completion_percentage: 100,
        notes: '',
        challenges: '',
        improvements: '',
        student_engagement: 5,
        difficulty_level: 5
      });
      alert('Activity progress recorded successfully!');
    } catch (error) {
      console.error('Error recording progress:', error);
      alert('Error recording progress. Please try again.');
    }
  };

  const openProgressModal = (activity) => {
    // Prevent opening modal if stage is completed
    if (isCompleted) {
      return;
    }
    
    setSelectedActivity(activity);
    setProgressForm({
      ...progressForm,
      duration_actual: activity.duration_minutes
    });
    setShowProgressModal(true);
  };

  const getProgressStats = (activity) => {
    const total = activity.total_sessions || 0;
    const completed = activity.completed_sessions || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, completionRate };
  };

  const getActivityTypeColor = (type) => {
    const colors = {
      reading: 'bg-blue-100 text-blue-800',
      writing: 'bg-green-100 text-green-800',
      phonics: 'bg-purple-100 text-purple-800',
      memory: 'bg-orange-100 text-orange-800',
      coordination: 'bg-red-100 text-red-800',
      visual: 'bg-indigo-100 text-indigo-800',
      auditory: 'bg-yellow-100 text-yellow-800',
      cognitive: 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleCompleteStage = async () => {
    setNextLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onComplete(response.data);
      alert('Stage 6 completed! Moving to Stage 7.');
    } catch (error) {
      console.error('Error completing stage:', error);
      alert('Error completing stage. Please try again.');
    } finally {
      setNextLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading activities...</div>;
  }

  // Handle different error states with appropriate messages
  if (error === 'access_denied') {
    if (userRole === 'doctor') {
      return (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Stage 6: Activity Tracking</h3>
            <p className="text-blue-700">
              You don't have any activities assigned to this student yet. Complete Stage 5 to assign therapeutic activities that can be tracked here by teachers and parents.
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Stage 6: Activity Tracking</h3>
            <p className="text-yellow-700">
              You don't have access to track activities for this student. Please ensure you are linked to this student or contact the doctor.
            </p>
          </div>
        </div>
      );
    }
  }

  if (error === 'fetch_error') {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Activities</h3>
          <p className="text-red-700 mb-3">
            There was an error loading the activities. Please try again.
          </p>
          <button 
            onClick={() => {
              setLoading(true);
              fetchActivities();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Stage 6: Activity Tracking</h3>
          <p className="text-gray-600">
            {userRole === 'doctor' 
              ? "No activities have been assigned to this student yet. Complete Stage 5 to assign therapeutic activities."
              : "No activities have been assigned yet. Please wait for the doctor to complete Stage 5."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-4">Stage 6: Activity Tracking</h3>
      {userRole === 'doctor' ? (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Doctor View:</strong> You can view the progress of activities you assigned to this student. 
              Teachers and parents record the actual therapy sessions.
            </p>
          </div>
          <p className="text-gray-600">
            Monitor the completion of therapeutic activities you assigned. Track sessions, progress, 
            and observations recorded by teachers and parents.
          </p>
        </div>
      ) : (
        <p className="text-gray-600 mb-6">
          Track the completion of therapeutic activities assigned by the doctor. 
          Record sessions, progress, and observations to help monitor the student's development.
        </p>
      )}

      <div className="space-y-6">
        {activities.map((activity) => {
          const stats = getProgressStats(activity);
          return (
            <div key={activity.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold">{activity.activity_name}</h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActivityTypeColor(activity.activity_type)}`}>
                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Progress: {stats.completed}/{stats.total} sessions
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {stats.completionRate}% Complete
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Description:</h5>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Instructions:</h5>
                  <p className="text-sm text-gray-600">{activity.instructions}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <span className="font-medium">Frequency:</span> {activity.frequency}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {activity.duration_minutes} minutes
                </div>
                <div>
                  <span className="font-medium">Target:</span> {activity.target_audience}
                </div>
              </div>

              <div className="mb-4">
                <h5 className="font-medium text-gray-700 mb-2">Expected Outcomes:</h5>
                <p className="text-sm text-gray-600">{activity.expected_outcomes}</p>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Recent progress records */}
              {activity.progress_records && activity.progress_records.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Recent Sessions:</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activity.progress_records.slice(-3).map((record) => (
                      <div key={record.id} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>{record.session_date} - {record.performer}</span>
                          <span className={`px-2 py-1 rounded ${
                            record.status === 'completed' ? 'bg-green-100 text-green-800' :
                            record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        {record.notes && (
                          <div className="text-gray-600 mt-1">{record.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && userRole !== 'doctor' && !isCompleted && (
                <button
                  onClick={() => openProgressModal(activity)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Record New Session
                </button>
              )}
              
              {canEdit && userRole !== 'doctor' && isCompleted && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-700 text-sm">
                    <strong>Stage Completed:</strong> This stage has been completed. No new sessions can be recorded.
                  </p>
                </div>
              )}
              
              {userRole === 'doctor' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-blue-700 text-sm">
                    <strong>Doctor View:</strong> This activity is being tracked by teachers and parents. 
                    You can view the progress here but cannot record new sessions.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Recording Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Record Activity Session</h3>
            <p className="text-gray-600 mb-4">Activity: {selectedActivity?.activity_name}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={progressForm.session_date}
                  onChange={(e) => setProgressForm({...progressForm, session_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={progressForm.status}
                  onChange={(e) => setProgressForm({...progressForm, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="missed">Missed Session</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Duration (minutes)
                </label>
                <input
                  type="number"
                  value={progressForm.duration_actual}
                  onChange={(e) => setProgressForm({...progressForm, duration_actual: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progressForm.completion_percentage}
                  onChange={(e) => setProgressForm({...progressForm, completion_percentage: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Engagement (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={progressForm.student_engagement}
                  onChange={(e) => setProgressForm({...progressForm, student_engagement: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={progressForm.difficulty_level}
                  onChange={(e) => setProgressForm({...progressForm, difficulty_level: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Notes
              </label>
              <textarea
                value={progressForm.notes}
                onChange={(e) => setProgressForm({...progressForm, notes: e.target.value})}
                rows="3"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what happened during this session..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challenges Encountered
              </label>
              <textarea
                value={progressForm.challenges}
                onChange={(e) => setProgressForm({...progressForm, challenges: e.target.value})}
                rows="2"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any difficulties or obstacles..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Improvements Observed
              </label>
              <textarea
                value={progressForm.improvements}
                onChange={(e) => setProgressForm({...progressForm, improvements: e.target.value})}
                rows="2"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Positive changes or progress noticed..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowProgressModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Record Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Stage Button */}
      {canEdit && !isCompleted && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Ready to Complete Stage 6?</h4>
          <p className="text-green-700 text-sm mb-4">
            Once you've tracked sufficient progress on the assigned activities, you can complete this stage 
            to proceed to the final evaluation.
          </p>
          <button
            onClick={handleCompleteStage}
            disabled={nextLoading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {nextLoading ? "Completing..." : "Complete Stage 6"}
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded">
          ✓ Stage 6 has been completed. Activity tracking has been recorded and the case is ready for final evaluation.
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Stage5({ student_id, canEdit, isCompleted, onComplete }) {
  const [assessmentSummary, setAssessmentSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    activity_type: 'reading',
    description: '',
    instructions: '',
    difficulty: 'medium',
    frequency: 'daily',
    duration_minutes: 30,
    target_audience: 'both',
    expected_outcomes: '',
    success_criteria: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const activityTypes = [
    { value: 'reading', label: 'Reading Exercise' },
    { value: 'writing', label: 'Writing Practice' },
    { value: 'phonics', label: 'Phonics Training' },
    { value: 'memory', label: 'Memory Enhancement' },
    { value: 'coordination', label: 'Hand-Eye Coordination' },
    { value: 'visual', label: 'Visual Processing' },
    { value: 'auditory', label: 'Auditory Processing' },
    { value: 'cognitive', label: 'Cognitive Training' }
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Twice a Week' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const targetAudiences = [
    { value: 'teacher', label: 'Teacher Implementation' },
    { value: 'parent', label: 'Parent Implementation' },
    { value: 'both', label: 'Both Teacher and Parent' }
  ];

  useEffect(() => {
    fetchData();
  }, [student_id]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch assessment summary from Stage 4
      const summaryRes = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_assessment_summary/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setAssessmentSummary(summaryRes.data);

      // Fetch existing activity assignments
      const activitiesRes = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_activity_assignments/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setActivities(activitiesRes.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 404) {
        setError('Stage 4 must be completed before accessing Stage 5');
      } else {
        setError('Failed to load stage data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewActivity(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateActivity = () => {
    const required = ['activity_name', 'description', 'instructions', 'expected_outcomes'];
    for (const field of required) {
      if (!newActivity[field].trim()) {
        setError(`${field.replace('_', ' ')} is required`);
        return false;
      }
    }
    if (newActivity.duration_minutes <= 0) {
      setError('Duration must be greater than 0');
      return false;
    }
    setError('');
    return true;
  };

  const handleAddActivity = async () => {
    if (!validateActivity()) return;

    setSaving(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/assign_activities/`,
        { activities: [newActivity] },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Add the new activity to the list
      setActivities(prev => [...prev, ...response.data.activities]);
      
      // Reset form
      setNewActivity({
        activity_name: '',
        activity_type: 'reading',
        description: '',
        instructions: '',
        difficulty: 'medium',
        frequency: 'daily',
        duration_minutes: 30,
        target_audience: 'both',
        expected_outcomes: '',
        success_criteria: ''
      });
      setShowAddForm(false);
      setError('');
      
    } catch (err) {
      console.error('Error adding activity:', err);
      setError(err.response?.data?.error || 'Failed to add activity');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteStage = async () => {
    if (activities.length === 0) {
      setError('Please assign at least one activity before completing the stage');
      return;
    }

    setNextLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      onComplete(res.data);
    } catch (err) {
      console.error('Error completing stage:', err);
      setError(err.response?.data?.error || 'Failed to complete stage');
    } finally {
      setNextLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch(level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="mt-4 text-center">Loading Stage 5 data...</div>;
  }

  if (!assessmentSummary) {
    return (
      <div className="mt-4 text-center text-red-500">
        Stage 4 assessment summary not found. Please complete Stage 4 first.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold">Assign Therapeutic Activities</h4>
        <p className="text-sm text-gray-600">
          Based on the assessment results, assign specific activities for intervention.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Assessment Summary Reference */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-semibold mb-3">Assessment Summary (Stage 4)</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Risk Level</div>
            <div className={`font-bold px-2 py-1 rounded ${getRiskLevelColor(assessmentSummary.risk_level)}`}>
              {assessmentSummary.risk_level.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Score</div>
            <div className="font-bold">{assessmentSummary.percentage_score.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-gray-600">Dyslexia Risk</div>
            <div className="font-bold">
              {assessmentSummary.dyslexia_indication ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Cutoff</div>
            <div className="font-bold">{assessmentSummary.cutoff_percentage}%</div>
          </div>
        </div>
        {assessmentSummary.recommendations && (
          <div className="mt-3">
            <div className="text-gray-600 text-sm">Recommendations:</div>
            <div className="text-sm">{assessmentSummary.recommendations}</div>
          </div>
        )}
      </div>

      {/* Existing Activities */}
      {activities.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h5 className="font-semibold">Assigned Activities ({activities.length})</h5>
          </div>
          <div className="divide-y">
            {activities.map((activity, index) => (
              <div key={activity.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h6 className="font-medium text-lg">{activity.activity_name}</h6>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {activityTypes.find(t => t.value === activity.activity_type)?.label}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Difficulty:</span> 
                    <span className="ml-1 font-medium">
                      {difficulties.find(d => d.value === activity.difficulty)?.label || 'Medium'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Frequency:</span> 
                    <span className="ml-1 font-medium">
                      {frequencies.find(f => f.value === activity.frequency)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span> 
                    <span className="ml-1 font-medium">{activity.duration_minutes} minutes</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Target:</span> 
                    <span className="ml-1 font-medium">
                      {targetAudiences.find(t => t.value === activity.target_audience)?.label}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Description:</span>
                    <p className="mt-1">{activity.description}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Instructions:</span>
                    <p className="mt-1">{activity.instructions}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Expected Outcomes:</span>
                    <p className="mt-1">{activity.expected_outcomes}</p>
                  </div>
                  {activity.success_criteria && (
                    <div>
                      <span className="text-gray-600 font-medium">Success Criteria:</span>
                      <p className="mt-1">{activity.success_criteria}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Activity */}
      {canEdit && !isCompleted && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {showAddForm ? 'Cancel' : 'Add New Activity'}
            </button>
          </div>

          {showAddForm && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Activity Name</label>
                  <input
                    type="text"
                    value={newActivity.activity_name}
                    onChange={(e) => handleInputChange('activity_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Daily Reading Practice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Activity Type</label>
                  <select
                    value={newActivity.activity_type}
                    onChange={(e) => handleInputChange('activity_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {activityTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Detailed description of the activity..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea
                  value={newActivity.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Step-by-step instructions for implementation..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select
                    value={newActivity.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {difficulties.map(diff => (
                      <option key={diff.value} value={diff.value}>{diff.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    value={newActivity.frequency}
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {frequencies.map(freq => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={newActivity.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select
                    value={newActivity.target_audience}
                    onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {targetAudiences.map(target => (
                      <option key={target.value} value={target.value}>{target.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expected Outcomes</label>
                <textarea
                  value={newActivity.expected_outcomes}
                  onChange={(e) => handleInputChange('expected_outcomes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="What improvements are expected from this activity..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Success Criteria (Optional)</label>
                <textarea
                  value={newActivity.success_criteria}
                  onChange={(e) => handleInputChange('success_criteria', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="How to measure success of this activity..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleAddActivity}
                  disabled={saving}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Activity'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Stage Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCompleteStage}
          disabled={!canEdit || isCompleted || activities.length === 0 || nextLoading}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {nextLoading ? 'Completing...' : 'Complete Stage 5'}
        </button>
      </div>

      {isCompleted && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Stage 5 has been completed. All therapeutic activities have been assigned.
        </div>
      )}
    </div>
  );
}
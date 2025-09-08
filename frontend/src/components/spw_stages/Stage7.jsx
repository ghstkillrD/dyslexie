import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export default function Stage7({ student_id, canEdit, isCompleted, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [stakeholderRecommendations, setStakeholderRecommendations] = useState([]);
  const [myRecommendation, setMyRecommendation] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState({
    handwriting_analysis_summary: '',
    task_performance_summary: '',
    activity_progress_summary: '',
    final_diagnosis: 'requires_further_assessment',
    diagnosis_confidence: 5,
    supporting_evidence: '',
    intervention_priority: 'medium',
    short_term_goals: '',
    long_term_goals: '',
    recommended_interventions: '',
    follow_up_timeline: '',
    monitoring_indicators: '',
    clinical_notes: '',
    referrals_needed: '',
    therapy_decision: 'pending',
    therapy_termination_reason: ''
  });
  
  const [recommendationForm, setRecommendationForm] = useState({
    observations: '',
    recommendations: '',
    concerns: '',
    positive_changes: '',
    support_needed: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingCase, setCompletingCase] = useState(false);
  const [restartingTherapy, setRestartingTherapy] = useState(false);
  const [submittingRecommendation, setSubmittingRecommendation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);

  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserRole(decoded.role);
      
      if (decoded.role === 'doctor') {
        fetchComprehensiveData();
        fetchExistingEvaluation();
        fetchAllStakeholderRecommendations();
      } else if (decoded.role === 'teacher' || decoded.role === 'parent') {
        fetchEvaluationSummary();
        fetchMyRecommendation();
      }
    }
  }, [student_id]);

  const fetchMyRecommendation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/stakeholder-recommendations/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyRecommendation(response.data);
      setRecommendationForm(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching recommendation:', error);
      }
    }
  };

  const fetchAllStakeholderRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/all-stakeholder-recommendations/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStakeholderRecommendations(response.data.recommendations || []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching stakeholder recommendations:', error);
      }
    }
  };

  const fetchComprehensiveData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/comprehensive-data/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComprehensiveData(response.data);
    } catch (error) {
      console.error('Error fetching comprehensive data:', error);
      setError('Failed to load comprehensive data');
    }
  };

  const fetchExistingEvaluation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/final-evaluation/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvaluation(response.data);
      setEvaluationForm(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching evaluation:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/evaluation-summary/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvaluation(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setError('final_evaluation_not_completed');
      } else {
        console.error('Error fetching evaluation summary:', error);
        setError('fetch_error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    // Prevent changes if case is completed
    if (evaluation?.case_completed) {
      return;
    }
    
    setEvaluationForm(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleRecommendationChange = (field, value) => {
    // Prevent changes if case is completed
    if (evaluation?.case_completed) {
      return;
    }
    
    setRecommendationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveRecommendation = async () => {
    setSubmittingRecommendation(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/stakeholder-recommendations/`,
        recommendationForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMyRecommendation(response.data.recommendation);
      alert('Your recommendation has been saved successfully!');
    } catch (error) {
      console.error('Error saving recommendation:', error);
      alert('Error saving recommendation. Please try again.');
    } finally {
      setSubmittingRecommendation(false);
    }
  };

  const saveEvaluation = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/final-evaluation/`,
        evaluationForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEvaluation(response.data.evaluation);
      setHasUnsavedChanges(false);
      setLastSavedData({ ...evaluationForm });
      alert('Evaluation saved successfully!');
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Error saving evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeEvaluation = async () => {
    if (!evaluation) {
      alert('Please save the evaluation before completing the case.');
      return;
    }

    const reason = evaluationForm.therapy_termination_reason || 'Student has been successfully treated and no longer requires therapy';
    
    if (!confirm(`Are you sure you want to complete therapy for this student?\n\nReason: ${reason}\n\nThis will finalize the case and cannot be undone.`)) {
      return;
    }

    setCompletingCase(true);
    try {
      const token = localStorage.getItem('token');
      
      // First terminate the therapy with the reason
      const terminateResponse = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/terminate-therapy/`,
        { termination_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Then complete the evaluation
      const completeResponse = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete-evaluation/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Therapy completed successfully!\n\nSession ${terminateResponse.data.session_number} has been completed and archived.`);
      
      // Refresh the evaluation data
      await fetchExistingEvaluation();
      
      if (onComplete) {
        onComplete(completeResponse.data);
      }
    } catch (error) {
      console.error('Error completing therapy:', error);
      alert('Error completing therapy. Please try again.');
    } finally {
      setCompletingCase(false);
    }
  };

  const restartTherapy = async () => {
    if (!evaluation) {
      alert('Please save the evaluation first.');
      return;
    }

    if (!confirm('Are you sure you want to restart therapy from Stage 5?\n\nThis will:\n- Archive the current therapy session\n- Clear current activity assignments\n- Reset the student to Stage 5 for new activity assignment\n\nThis action cannot be undone.')) {
      return;
    }

    setRestartingTherapy(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/restart-therapy/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Therapy restarted successfully!\n\nSession ${response.data.new_session_number} has been started.\nStudent is now at Stage ${response.data.current_stage}.`);
      
      if (onComplete) {
        onComplete(response.data);
      }
    } catch (error) {
      console.error('Error restarting therapy:', error);
      alert('Error restarting therapy. Please try again.');
    } finally {
      setRestartingTherapy(false);
    }
  };

  const getDiagnosisColor = (diagnosis) => {
    const colors = {
      'no_dyslexia': 'bg-green-100 text-green-800',
      'mild_dyslexia': 'bg-yellow-100 text-yellow-800',
      'moderate_dyslexia': 'bg-orange-100 text-orange-800',
      'severe_dyslexia': 'bg-red-100 text-red-800',
      'requires_further_assessment': 'bg-blue-100 text-blue-800'
    };
    return colors[diagnosis] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4">Loading final evaluation data...</div>;
  }

  // Error states for non-doctors
  if (userRole !== 'doctor' && error === 'final_evaluation_not_completed') {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Stage 7: Final Evaluation</h3>
          <p className="text-yellow-700">
            The final evaluation has not been completed yet. Please wait for the doctor to complete the comprehensive assessment.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'fetch_error') {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Evaluation</h3>
          <p className="text-red-700 mb-3">
            There was an error loading the final evaluation. Please try again.
          </p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              if (userRole === 'doctor') {
                fetchComprehensiveData();
                fetchExistingEvaluation();
              } else {
                fetchEvaluationSummary();
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Doctor's comprehensive evaluation interface
  if (userRole === 'doctor') {
    return (
      <div className="p-4 space-y-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">Stage 7: Final Evaluation</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Doctor Interface:</strong> Complete the comprehensive final evaluation based on all previous stages. 
              This will provide the definitive diagnosis and intervention plan.
            </p>
          </div>
        </div>

        {/* Comprehensive Data Summary */}
        {comprehensiveData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-3">Case Summary</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Handwriting Samples:</span> {comprehensiveData.handwriting_analysis?.length || 0}
              </div>
              <div>
                <span className="font-medium">Tasks Completed:</span> {comprehensiveData.task_performance?.completed_tasks || 0}/{comprehensiveData.task_performance?.total_tasks || 0}
              </div>
              <div>
                <span className="font-medium">Activity Progress Records:</span> {comprehensiveData.activity_progress?.length || 0}
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Form */}
        <div className="space-y-6">
          {/* Case Completed Notice */}
          {evaluation?.case_completed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Case Completed</h3>
                  <p className="text-sm text-green-700">
                    This evaluation was completed on {new Date(evaluation.completion_date).toLocaleDateString()} and is now read-only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Summaries */}
          <div className="grid md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Handwriting Analysis Summary</label>
              <textarea
                value={evaluationForm.handwriting_analysis_summary}
                onChange={(e) => handleFormChange('handwriting_analysis_summary', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-24 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Summarize findings from handwriting analysis..."
                disabled={evaluation?.case_completed}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Task Performance Summary</label>
              <textarea
                value={evaluationForm.task_performance_summary}
                onChange={(e) => handleFormChange('task_performance_summary', e.target.value)}
                className="w-full border rounded-md px-3 py-2 h-24"
                placeholder="Summarize task performance and scoring results..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Activity Progress Summary</label>
              <textarea
                value={evaluationForm.activity_progress_summary}
                onChange={(e) => handleFormChange('activity_progress_summary', e.target.value)}
                className="w-full border rounded-md px-3 py-2 h-24"
                placeholder="Summarize therapeutic activity progress and outcomes..."
              />
            </div>
          </div>

          {/* Diagnosis Section */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Final Diagnosis</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Diagnosis</label>
                <select
                  value={evaluationForm.final_diagnosis}
                  onChange={(e) => handleFormChange('final_diagnosis', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="no_dyslexia">No Dyslexia Indicated</option>
                  <option value="mild_dyslexia">Mild Dyslexia</option>
                  <option value="moderate_dyslexia">Moderate Dyslexia</option>
                  <option value="severe_dyslexia">Severe Dyslexia</option>
                  <option value="requires_further_assessment">Requires Further Assessment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Level (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={evaluationForm.diagnosis_confidence}
                  onChange={(e) => handleFormChange('diagnosis_confidence', parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Supporting Evidence</label>
              <textarea
                value={evaluationForm.supporting_evidence}
                onChange={(e) => handleFormChange('supporting_evidence', e.target.value)}
                className="w-full border rounded-md px-3 py-2 h-24"
                placeholder="Key evidence supporting the diagnosis..."
              />
            </div>
          </div>

          {/* Intervention Plan */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Intervention Plan</h4>
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Intervention Priority</label>
                <select
                  value={evaluationForm.intervention_priority}
                  onChange={(e) => handleFormChange('intervention_priority', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Short-term Goals (3-6 months)</label>
                <textarea
                  value={evaluationForm.short_term_goals}
                  onChange={(e) => handleFormChange('short_term_goals', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-24"
                  placeholder="Specific goals for the next 3-6 months..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Long-term Goals (1-2 years)</label>
                <textarea
                  value={evaluationForm.long_term_goals}
                  onChange={(e) => handleFormChange('long_term_goals', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-24"
                  placeholder="Long-term goals for 1-2 years..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Recommended Interventions</label>
                <textarea
                  value={evaluationForm.recommended_interventions}
                  onChange={(e) => handleFormChange('recommended_interventions', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-24"
                  placeholder="Specific intervention strategies and methods..."
                />
              </div>
            </div>
          </div>

          {/* Monitoring and Follow-up */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Monitoring & Follow-up</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Follow-up Timeline</label>
                <input
                  type="text"
                  value={evaluationForm.follow_up_timeline}
                  onChange={(e) => handleFormChange('follow_up_timeline', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., 3 months, 6 months, annually"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Monitoring Indicators</label>
                <textarea
                  value={evaluationForm.monitoring_indicators}
                  onChange={(e) => handleFormChange('monitoring_indicators', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-20"
                  placeholder="Key indicators to monitor progress..."
                />
              </div>
            </div>
          </div>

          {/* Stakeholder Recommendations Summary (Read-only for Doctor) */}
          {stakeholderRecommendations.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-semibold mb-4">Stakeholder Input</h4>
              {stakeholderRecommendations.map((rec, index) => (
                <div key={index} className="mb-4 p-3 bg-white rounded border-l-4 border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-blue-700">
                      {rec.stakeholder_type.charAt(0).toUpperCase() + rec.stakeholder_type.slice(1)} - {rec.stakeholder_name}
                    </h5>
                    <span className="text-xs text-gray-500">
                      {new Date(rec.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {rec.observations && (
                      <div><strong>Observations:</strong> {rec.observations}</div>
                    )}
                    {rec.recommendations && (
                      <div><strong>Recommendations:</strong> {rec.recommendations}</div>
                    )}
                    {rec.positive_changes && (
                      <div><strong>Positive Changes:</strong> {rec.positive_changes}</div>
                    )}
                    {rec.concerns && (
                      <div><strong>Concerns:</strong> {rec.concerns}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clinical Notes */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Clinical Notes & Referrals</h4>
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Clinical Notes</label>
                <textarea
                  value={evaluationForm.clinical_notes}
                  onChange={(e) => handleFormChange('clinical_notes', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-20"
                  placeholder="Additional clinical observations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Referrals Needed</label>
                <textarea
                  value={evaluationForm.referrals_needed}
                  onChange={(e) => handleFormChange('referrals_needed', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-20"
                  placeholder="Referrals to other specialists if needed..."
                />
              </div>
            </div>
          </div>

          {/* Save Evaluation Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800">Save Evaluation</h4>
                <p className="text-blue-600 text-sm">
                  {evaluation?.case_completed 
                    ? 'Case completed - evaluation is read-only' 
                    : 'Save your progress before making therapy decisions'
                  }
                </p>
              </div>
              <button
                onClick={saveEvaluation}
                disabled={isSubmitting || (!hasUnsavedChanges && evaluation) || evaluation?.case_completed}
                className={`px-6 py-2 rounded font-medium ${
                  (!hasUnsavedChanges && evaluation) 
                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-not-allowed' 
                    : evaluation?.case_completed
                    ? 'bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {evaluation?.case_completed 
                  ? '✓ Case Completed' 
                  : isSubmitting 
                  ? 'Saving...' 
                  : (!hasUnsavedChanges && evaluation) 
                  ? '✓ Saved' 
                  : 'Save Evaluation'
                }
              </button>
            </div>
            {!evaluation && !evaluation?.case_completed && (
              <p className="text-blue-600 text-sm mt-2">⚠️ You must save the evaluation before proceeding with therapy decisions.</p>
            )}
          </div>

          {/* Therapy Decision */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4 text-yellow-800">Therapy Decision</h4>
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Therapy Decision</label>
                <select
                  value={evaluationForm.therapy_decision}
                  onChange={(e) => handleFormChange('therapy_decision', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={!evaluation || evaluation?.case_completed}
                >
                  <option value="pending">Decision Pending</option>
                  <option value="terminate">Complete Therapy</option>
                  <option value="continue">Continue Therapy</option>
                </select>
                {!evaluation && (
                  <p className="text-yellow-600 text-sm mt-1">Please save evaluation first to enable therapy decisions</p>
                )}
                {evaluation?.case_completed && (
                  <p className="text-green-600 text-sm mt-1">✓ Case has been completed - no further changes allowed</p>
                )}
              </div>
              
              {evaluationForm.therapy_decision === 'terminate' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Completion Reason</label>
                  <textarea
                    value={evaluationForm.therapy_termination_reason}
                    onChange={(e) => handleFormChange('therapy_termination_reason', e.target.value)}
                    className="w-full border rounded-md px-3 py-2 h-20"
                    placeholder="Explain why therapy is being completed (e.g., student has achieved learning goals, no longer shows signs of dyslexia, etc.)"
                    disabled={evaluation?.case_completed}
                  />
                </div>
              )}
              
              {evaluationForm.therapy_decision === 'continue' && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-blue-700 text-sm">
                    <strong>Note:</strong> Selecting "Continue Therapy" will:
                    <br />• Archive this therapy session
                    <br />• Clear current activity assignments
                    <br />• Reset the student to Stage 5 for new activity assignment
                    <br />• Start a new therapy session
                  </p>
                </div>
              )}

              {/* Therapy Decision Action Buttons */}
              {evaluation && evaluationForm.therapy_decision !== 'pending' && !evaluation.case_completed && (
                <div className="mt-4 pt-4 border-t border-yellow-200">
                  {evaluationForm.therapy_decision === 'terminate' && (
                    <button
                      onClick={completeEvaluation}
                      disabled={completingCase || !evaluationForm.therapy_termination_reason.trim() || hasUnsavedChanges}
                      className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {completingCase ? 'Completing Therapy...' : 'Complete Therapy'}
                    </button>
                  )}
                  
                  {evaluationForm.therapy_decision === 'continue' && (
                    <button
                      onClick={restartTherapy}
                      disabled={restartingTherapy || hasUnsavedChanges}
                      className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {restartingTherapy ? 'Restarting...' : 'Restart Therapy'}
                    </button>
                  )}
                  
                  {hasUnsavedChanges && (
                    <p className="text-red-600 text-sm mt-2">⚠️ Please save your changes before proceeding with therapy decisions.</p>
                  )}
                  
                  {evaluationForm.therapy_decision === 'terminate' && !evaluationForm.therapy_termination_reason.trim() && (
                    <p className="text-red-600 text-sm mt-2">⚠️ Please provide a completion reason before proceeding.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {evaluation?.case_completed && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-700 font-medium">
                ✓ Case completed on {new Date(evaluation.completion_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Teacher/Parent interface with recommendation input
  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-4">Stage 7: Final Evaluation</h3>
      
      <div className="space-y-6">
        {/* Case Completed Notice */}
        {evaluation?.case_completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Case Completed</h3>
                <p className="text-sm text-green-700">
                  This evaluation was completed on {new Date(evaluation.completion_date).toLocaleDateString()} and is now read-only.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-blue-700 text-sm">
            <strong>{userRole === 'teacher' ? 'Teacher' : 'Parent'} Input:</strong> {evaluation?.case_completed 
              ? 'The final evaluation has been completed. Your recommendations are now read-only.' 
              : 'Please provide your observations and recommendations to help the doctor complete the final evaluation.'
            }
          </p>
        </div>

        {/* Current Evaluation Status */}
        {evaluation && (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Current Evaluation Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Evaluation Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${evaluation.case_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {evaluation.case_completed ? 'Completed' : 'In Progress'}
                </span>
              </div>
              {evaluation.final_diagnosis && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Diagnosis:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDiagnosisColor(evaluation.final_diagnosis)}`}>
                    {evaluation.final_diagnosis.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              )}
              {evaluation.intervention_priority && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Priority:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(evaluation.intervention_priority)}`}>
                    {evaluation.intervention_priority.charAt(0).toUpperCase() + evaluation.intervention_priority.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendation Input Form */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-4">Your Recommendations</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Observations <span className="text-red-500">*</span>
              </label>
              <textarea
                value={recommendationForm.observations}
                onChange={(e) => handleRecommendationChange('observations', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-24 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder={`Describe your observations about the student's progress, behavior, and learning patterns...`}
                required
                disabled={evaluation?.case_completed}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Recommendations <span className="text-red-500">*</span>
              </label>
              <textarea
                value={recommendationForm.recommendations}
                onChange={(e) => handleRecommendationChange('recommendations', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-24 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder={`Suggest specific strategies, interventions, or support methods that have worked or might help...`}
                required
                disabled={evaluation?.case_completed}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Positive Changes Observed</label>
              <textarea
                value={recommendationForm.positive_changes}
                onChange={(e) => handleRecommendationChange('positive_changes', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-20 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Describe any positive improvements you've noticed..."
                disabled={evaluation?.case_completed}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Concerns or Challenges</label>
              <textarea
                value={recommendationForm.concerns}
                onChange={(e) => handleRecommendationChange('concerns', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-20 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Mention any concerns or ongoing challenges..."
                disabled={evaluation?.case_completed}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Support Needed</label>
              <textarea
                value={recommendationForm.support_needed}
                onChange={(e) => handleRecommendationChange('support_needed', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 h-20 ${evaluation?.case_completed ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="What additional support or resources would be helpful?"
                disabled={evaluation?.case_completed}
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={saveRecommendation}
                disabled={submittingRecommendation || !recommendationForm.observations.trim() || !recommendationForm.recommendations.trim() || evaluation?.case_completed}
                className={`px-6 py-2 rounded font-medium ${
                  evaluation?.case_completed 
                    ? 'bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {evaluation?.case_completed 
                  ? '✓ Case Completed' 
                  : submittingRecommendation 
                  ? 'Saving...' 
                  : 'Save Recommendation'
                }
              </button>
            </div>
          </div>

          {myRecommendation && (
            <div className={`mt-4 border rounded p-3 ${evaluation?.case_completed ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm ${evaluation?.case_completed ? 'text-gray-700' : 'text-green-700'}`}>
                ✓ Your recommendation was submitted on {new Date(myRecommendation.submitted_at).toLocaleDateString()}
                <br />
                {evaluation?.case_completed 
                  ? 'The case has been completed and recommendations are now read-only.'
                  : 'You can update it anytime before the doctor completes the final evaluation.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Results (if completed) */}
        {evaluation && evaluation.case_completed && (
          <div className="space-y-4">
            {/* Goals */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Goals & Timeline</h4>
              <div className="space-y-4">
                {evaluation.short_term_goals && (
                  <div>
                    <h5 className="font-medium text-green-700 mb-2">Short-term Goals (3-6 months)</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{evaluation.short_term_goals}</p>
                  </div>
                )}
                {evaluation.long_term_goals && (
                  <div>
                    <h5 className="font-medium text-blue-700 mb-2">Long-term Goals (1-2 years)</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{evaluation.long_term_goals}</p>
                  </div>
                )}
                {evaluation.follow_up_timeline && (
                  <div>
                    <h5 className="font-medium text-purple-700 mb-2">Follow-up Schedule</h5>
                    <p className="text-gray-700">{evaluation.follow_up_timeline}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Case Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Case Status</h4>
              <p className="text-green-700">
                ✓ Final evaluation completed on {new Date(evaluation.completion_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

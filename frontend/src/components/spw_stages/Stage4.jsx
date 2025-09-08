import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Stage4({ student_id, canEdit, isCompleted, onComplete }) {
  const [tasks, setTasks] = useState([]);
  const [assessmentSummary, setAssessmentSummary] = useState(null);
  const [cutoffPercentage, setCutoffPercentage] = useState(50);
  const [summaryNotes, setSummaryNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [student_id]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch tasks to display scores
      const tasksRes = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_tasks/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTasks(tasksRes.data);

      // Try to fetch existing assessment summary
      try {
        const summaryRes = await axios.get(
          `http://127.0.0.1:8000/api/users/students/${student_id}/get_assessment_summary/`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setAssessmentSummary(summaryRes.data);
        setCutoffPercentage(summaryRes.data.cutoff_percentage);
        setSummaryNotes(summaryRes.data.summary_notes);
        setRecommendations(summaryRes.data.recommendations);
      } catch (err) {
        // No existing summary - this is fine for first time
        console.log('No existing assessment summary');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load stage data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalScore = tasks.reduce((sum, task) => sum + (task.score_obtained || 0), 0);
    const totalMaxScore = tasks.reduce((sum, task) => sum + task.max_score, 0);
    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    return { totalScore, totalMaxScore, percentage };
  };

  const getDyslexiaRisk = () => {
    const { percentage } = calculateTotals();
    if (percentage >= cutoffPercentage) return { level: 'low', indication: false };
    if (percentage >= cutoffPercentage - 10) return { level: 'medium', indication: true };
    return { level: 'high', indication: true };
  };

  const handleSaveAssessment = async () => {
    setSaving(true);
    setError('');
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/create_assessment_summary/`,
        {
          cutoff_percentage: cutoffPercentage,
          summary_notes: summaryNotes,
          recommendations: recommendations
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setAssessmentSummary(response.data.assessment_summary);
      setError('');
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError(err.response?.data?.error || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteStage = async () => {
    if (!assessmentSummary) {
      setError('Please save the assessment summary first');
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

  if (loading) {
    return <div className="mt-4 text-center">Loading assessment data...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-4 text-center text-red-500">
        No scored tasks available. Stage 3 must be completed first.
      </div>
    );
  }

  const { totalScore, totalMaxScore, percentage } = calculateTotals();
  const { level: riskLevel, indication: dyslexiaIndication } = getDyslexiaRisk();

  return (
    <div className="mt-4 space-y-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold">Assessment Summary & Cutoff Analysis</h4>
        <p className="text-sm text-gray-600">
          Review the task scores, set cutoff thresholds, and generate assessment summary.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Task Scores Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-semibold mb-3">Task Performance Summary</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border">Task</th>
                <th className="p-2 text-center border">Score</th>
                <th className="p-2 text-center border">Max Score</th>
                <th className="p-2 text-center border">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td className="p-2 border">{task.task_name}</td>
                  <td className="p-2 text-center border">{task.score_obtained}</td>
                  <td className="p-2 text-center border">{task.max_score}</td>
                  <td className="p-2 text-center border">
                    {((task.score_obtained / task.max_score) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="p-2 border">Overall Total</td>
                <td className="p-2 text-center border">{totalScore}</td>
                <td className="p-2 text-center border">{totalMaxScore}</td>
                <td className="p-2 text-center border">{percentage.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cutoff Analysis */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-semibold mb-3">Cutoff Analysis</h5>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Dyslexia Indication Cutoff (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={cutoffPercentage}
            onChange={(e) => setCutoffPercentage(parseFloat(e.target.value))}
            disabled={!canEdit || isCompleted}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-600 mt-1">
            Students scoring below this percentage will be flagged for dyslexia risk
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Student Score</div>
            <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Risk Level</div>
            <div className={`text-2xl font-bold ${
              riskLevel === 'low' ? 'text-green-600' : 
              riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {riskLevel.toUpperCase()}
            </div>
          </div>
        </div>

        <div className={`mt-3 p-3 rounded ${
          dyslexiaIndication ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'
        }`}>
          <div className="font-medium">
            {dyslexiaIndication ? '⚠️ Dyslexia Risk Indicated' : '✅ No Dyslexia Risk Indicated'}
          </div>
          <div className="text-sm mt-1">
            {dyslexiaIndication 
              ? `Student scored ${percentage.toFixed(1)}% which is below the ${cutoffPercentage}% cutoff`
              : `Student scored ${percentage.toFixed(1)}% which is above the ${cutoffPercentage}% cutoff`
            }
          </div>
        </div>
      </div>

      {/* Assessment Notes */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Assessment Summary Notes
          </label>
          <textarea
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            disabled={!canEdit || isCompleted}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            placeholder="Enter detailed assessment notes, observations, and analysis..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Recommendations
          </label>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            disabled={!canEdit || isCompleted}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            placeholder="Enter recommendations for intervention, further assessment, or treatment..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleSaveAssessment}
          disabled={!canEdit || isCompleted || saving}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Assessment'}
        </button>

        <button
          onClick={handleCompleteStage}
          disabled={!canEdit || isCompleted || !assessmentSummary || nextLoading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {nextLoading ? 'Completing...' : 'Complete Stage 4'}
        </button>
      </div>

      {isCompleted && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Stage 4 has been completed. Assessment summary and cutoff analysis have been saved.
        </div>
      )}

      {assessmentSummary && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h5 className="font-semibold text-green-800 mb-2">Assessment Summary Saved</h5>
          <div className="text-sm text-green-700">
            <p><strong>Risk Level:</strong> {assessmentSummary.risk_level}</p>
            <p><strong>Dyslexia Indication:</strong> {assessmentSummary.dyslexia_indication ? 'Yes' : 'No'}</p>
            <p><strong>Total Score:</strong> {assessmentSummary.total_score}/{assessmentSummary.total_max_score} ({assessmentSummary.percentage_score.toFixed(1)}%)</p>
          </div>
        </div>
      )}
    </div>
  );
}
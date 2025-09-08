import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Stage3({ student_id, canEdit, isCompleted, onComplete }) {
  const [tasks, setTasks] = useState([]);
  const [taskScores, setTaskScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [student_id]);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_tasks/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTasks(res.data);
      
      // Initialize task scores with existing scores or empty values
      const initialScores = {};
      res.data.forEach(task => {
        initialScores[task.id] = task.score_obtained || '';
      });
      setTaskScores(initialScores);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (taskId, score) => {
    const numericScore = score === '' ? '' : parseFloat(score);
    setTaskScores(prev => ({
      ...prev,
      [taskId]: numericScore
    }));
  };

  const validateScores = () => {
    for (const task of tasks) {
      const score = taskScores[task.id];
      if (score === '' || score === null || score === undefined) {
        setError(`Please enter a score for "${task.task_name}"`);
        return false;
      }
      if (score < 0 || score > task.max_score) {
        setError(`Score for "${task.task_name}" must be between 0 and ${task.max_score}`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSubmitScores = async () => {
    if (!validateScores()) return;

    const token = localStorage.getItem('token');
    const task_scores = tasks.map(task => ({
      task_id: task.id,
      score: taskScores[task.id]
    }));

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/score_tasks/`,
        { task_scores },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Refresh tasks to show updated scores
      await fetchTasks();
      setError('');
    } catch (err) {
      console.error('Error saving scores:', err);
      setError(err.response?.data?.error || 'Failed to save scores');
    }
  };

  const handleNext = async () => {
    if (!validateScores()) return;

    setNextLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // First save scores if not already saved
      await handleSubmitScores();
      
      // Then complete the stage
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

  const getTotalScore = () => {
    return tasks.reduce((total, task) => {
      const score = taskScores[task.id] || 0;
      return total + (typeof score === 'number' ? score : 0);
    }, 0);
  };

  const getTotalMaxScore = () => {
    return tasks.reduce((total, task) => total + task.max_score, 0);
  };

  if (loading) {
    return <div className="mt-4 text-center">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-4 text-center text-red-500">
        No tasks available. Stage 2 must be completed first by a doctor.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-4">
        <h4 className="text-lg font-semibold">Assign Marks to Tasks</h4>
        <p className="text-sm text-gray-600">
          Score each task based on the student's performance. 
          All scores must be entered to proceed to the next stage.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-3 text-left">Task Name</th>
              <th className="border border-gray-300 p-3 text-center">Max Score</th>
              <th className="border border-gray-300 p-3 text-center">Score Obtained</th>
              <th className="border border-gray-300 p-3 text-center">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3">
                  <div className="font-medium">{task.task_name}</div>
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  {task.max_score}
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  <input
                    type="number"
                    min="0"
                    max={task.max_score}
                    step="0.1"
                    value={taskScores[task.id] || ''}
                    onChange={(e) => handleScoreChange(task.id, e.target.value)}
                    disabled={!canEdit || isCompleted}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100"
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  {taskScores[task.id] !== '' && taskScores[task.id] !== undefined ? 
                    `${((taskScores[task.id] / task.max_score) * 100).toFixed(1)}%` : 
                    '-'
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="border border-gray-300 p-3">Total</td>
              <td className="border border-gray-300 p-3 text-center">{getTotalMaxScore()}</td>
              <td className="border border-gray-300 p-3 text-center">{getTotalScore()}</td>
              <td className="border border-gray-300 p-3 text-center">
                {getTotalMaxScore() > 0 ? 
                  `${((getTotalScore() / getTotalMaxScore()) * 100).toFixed(1)}%` : 
                  '0%'
                }
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex space-x-3">
        <button
          onClick={handleSubmitScores}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={!canEdit || isCompleted}
        >
          Save Scores
        </button>
        
        <button
          onClick={handleNext}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          disabled={!canEdit || isCompleted || nextLoading}
        >
          {nextLoading ? "Completing Stage..." : "Complete Stage 3"}
        </button>
      </div>

      {isCompleted && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Stage 3 has been completed. All task scores have been recorded.
        </div>
      )}
    </div>
  );
}
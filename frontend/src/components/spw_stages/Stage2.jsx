import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Stage2({ student_id, canEdit, isCompleted, onComplete }) {
  const [outOfMark, setOutOfMark] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');
  const [lockedOutOfMark, setLockedOutOfMark] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load existing tasks when component mounts
  useEffect(() => {
    loadExistingTasks();
  }, [student_id]);

  const loadExistingTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_tasks/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data && response.data.length > 0) {
        setTasks(response.data);
        // If tasks exist, extract the out_of_mark from the first task
        if (response.data[0]?.max_score) {
          setOutOfMark(response.data[0].max_score.toString());
          setLockedOutOfMark(true);
        }
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load existing tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSetOutOfMark = () => {
    if (!outOfMark) return;
    setLockedOutOfMark(true);
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      setError('Please enter a task name');
      return;
    }
    
    try {
      setError('');
      const token = localStorage.getItem('token');
      const newTask = { 
        student: parseInt(student_id),
        task_name: taskName.trim(), 
        max_score: parseInt(outOfMark) 
      };
      
      // Add to local state immediately for better UX
      setTasks([...tasks, newTask]);
      setTaskName('');
      
      // Optional: Save to backend immediately or wait for handleNext
      // For now, we'll wait for handleNext to save all tasks
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task');
    }
  };

  const handleDeleteTask = (index) => {
    const updated = [...tasks];
    updated.splice(index, 1);
    setTasks(updated);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
      setOutOfMark('');
      setLockedOutOfMark(false);
      setTasks([]);
      setTaskName('');
      setError('');
    }
  };

  const handleNext = async () => {
    if (tasks.length === 0) {
      setError('Please add at least one task before proceeding');
      return;
    }

    setNextLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      // Prepare tasks data for backend
      const tasksData = tasks.map(task => ({
        student: parseInt(student_id),
        task_name: task.task_name,
        max_score: parseInt(outOfMark)
      }));

      // Only add new tasks (filter out tasks that already have an ID)
      const newTasks = tasksData.filter(task => !task.id);
      
      if (newTasks.length > 0) {
        await axios.post(
          `http://127.0.0.1:8000/api/users/students/${student_id}/add_tasks/`,
          { out_of_mark: parseInt(outOfMark), tasks: newTasks },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }

      // Complete the stage
      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      onComplete(res.data);
    } catch (err) {
      console.error('Error saving tasks:', err);
      setError(err.response?.data?.error || 'Failed to save tasks and complete stage');
    } finally {
      setNextLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {loading ? (
        <div className="text-center py-4">
          <div className="text-gray-600">Loading existing tasks...</div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="block font-medium mb-2">Out of Mark:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="border p-2 rounded flex-1"
                value={outOfMark}
                onChange={e => setOutOfMark(e.target.value)}
                disabled={!canEdit || lockedOutOfMark || isCompleted}
                placeholder="Enter maximum score for tasks"
              />
              <button
                onClick={handleSetOutOfMark}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                disabled={!canEdit || lockedOutOfMark || isCompleted || !outOfMark}
              >
                {lockedOutOfMark ? '✓ Set' : 'Set Out of Mark'}
              </button>
            </div>
            {lockedOutOfMark && (
              <p className="text-green-600 text-sm mt-1">✓ Maximum score set to {outOfMark}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block font-medium mb-2">Add Task:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border p-2 rounded flex-1"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                disabled={!canEdit || !lockedOutOfMark || isCompleted}
                placeholder="Enter task name"
                onKeyPress={e => e.key === 'Enter' && handleAddTask()}
              />
              <button
                onClick={handleAddTask}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                disabled={!canEdit || !lockedOutOfMark || isCompleted || !taskName.trim()}
              >
                Add Task
              </button>
            </div>
            {!lockedOutOfMark && (
              <p className="text-yellow-600 text-sm mt-1">Please set the out of mark first</p>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Assigned Tasks ({tasks.length}):</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left border-b">Task Name</th>
                      <th className="p-3 text-left border-b">Max Score</th>
                      {canEdit && !isCompleted && <th className="p-3 text-left border-b">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, i) => (
                      <tr key={task.id || i} className="border-b last:border-b-0">
                        <td className="p-3">{task.task_name}</td>
                        <td className="p-3">{task.max_score}</td>
                        {canEdit && !isCompleted && (
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteTask(i)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleClear}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
              disabled={!canEdit || isCompleted}
            >
              Clear All
            </button>
            <button
              onClick={handleNext}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2"
              disabled={tasks.length === 0 || !canEdit || isCompleted || nextLoading}
            >
              {nextLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Complete Stage 2'
              )}
            </button>
          </div>

          {isCompleted && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Stage 2 has been completed. Tasks have been saved successfully.
            </div>
          )}
        </>
      )}
    </div>
  );
}

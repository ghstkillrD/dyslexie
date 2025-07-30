import { useState } from 'react';
import axios from 'axios';

export default function Stage2({ student_id, canEdit, isCompleted, onComplete }) {
  const [outOfMark, setOutOfMark] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');
  const [lockedOutOfMark, setLockedOutOfMark] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

  const handleSetOutOfMark = () => {
    if (!outOfMark) return;
    setLockedOutOfMark(true);
  };

  const handleAddTask = () => {
    if (!taskName) return;
    setTasks([...tasks, { task_name: taskName, max_score: parseFloat(outOfMark) }]);
    setTaskName('');
  };

  const handleDeleteTask = (index) => {
    const updated = [...tasks];
    updated.splice(index, 1);
    setTasks(updated);
  };

  const handleClear = () => {
    setOutOfMark('');
    setLockedOutOfMark(false);
    setTasks([]);
    setTaskName('');
  };

  const handleNext = async () => {
    setNextLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/add_tasks/`,
        { out_of_mark: outOfMark, tasks },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      onComplete(res.data);

    } catch (err) {
      console.error(err.response?.data || err);
    } finally {
      setNextLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-3">
        <label className="block font-medium">Out of Mark:</label>
        <input
          type="number"
          className="border p-1 rounded"
          value={outOfMark}
          onChange={e => setOutOfMark(e.target.value)}
          disabled={!canEdit || lockedOutOfMark || isCompleted}
        />
        <button
          onClick={handleSetOutOfMark}
          className="ml-2 bg-blue-500 text-white px-3 py-1 rounded"
          disabled={!canEdit || lockedOutOfMark || isCompleted}
        >
          Set Out of Mark
        </button>
      </div>

      <div className="mb-3">
        <label className="block font-medium">Add Task:</label>
        <input
          type="text"
          className="border p-1 rounded"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          disabled={!canEdit || !lockedOutOfMark || isCompleted}
        />
        <button
          onClick={handleAddTask}
          className="ml-2 bg-green-500 text-white px-3 py-1 rounded"
          disabled={!canEdit || !lockedOutOfMark || isCompleted}
        >
          Add
        </button>
      </div>

      {tasks.length > 0 && (
        <table className="w-full border mt-3">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Task</th>
              <th className="p-2 border">Max Score</th>
              {canEdit && !isCompleted && <th className="p-2 border">Action</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={i}>
                <td className="p-2 border">{task.task_name}</td>
                <td className="p-2 border">{task.max_score}</td>
                {canEdit && !isCompleted && (
                  <td className="p-2 border">
                    <button
                      onClick={() => handleDeleteTask(i)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 space-x-2">
        <button
          onClick={handleClear}
          className="bg-gray-400 text-white px-3 py-1 rounded"
          disabled={!canEdit || isCompleted}
        >
          Clear
        </button>
        <button
          onClick={handleNext}
          className="bg-green-500 text-white px-3 py-1 rounded"
          disabled={tasks.length === 0 || !canEdit || isCompleted || nextLoading}
        >
          {nextLoading ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
}

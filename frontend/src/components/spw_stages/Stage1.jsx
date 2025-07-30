import { useState } from 'react';
import axios from 'axios';

export default function Stage1({ student_id, canEdit, isCompleted, onComplete }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);

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

  const handleNext = async () => {
    setNextLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      onComplete(res.data); // notify parent to update progress
    } catch (err) {
      console.error(err.response?.data || err);
    } finally {
      setNextLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <input
        type="file"
        onChange={e => setImage(e.target.files[0])}
        disabled={!canEdit || isCompleted}
      />
      <div className="mt-2 space-x-2">
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white px-3 py-1 rounded"
          disabled={loading || !canEdit || isCompleted}
        >
          {loading ? "Analyzing..." : "Submit"}
        </button>
        <button
          onClick={handleClear}
          className="bg-gray-400 text-white px-3 py-1 rounded"
          disabled={loading || !canEdit || isCompleted}
        >
          Clear
        </button>
        <button
          onClick={handleNext}
          className="bg-green-500 text-white px-3 py-1 rounded"
          disabled={!result || nextLoading || !canEdit || isCompleted}
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
  );
}

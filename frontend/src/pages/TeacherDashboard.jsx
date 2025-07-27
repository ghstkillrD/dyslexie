import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../store/AuthContext";

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get("http://127.0.0.1:8000/api/users/students/", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStudents(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?"))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://127.0.0.1:8000/api/users/students/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(students.filter((s) => s.student_id !== id)); // update list
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Teacher Dashboard</h2>
      <p className="mb-4">Welcome, {user?.username || "Teacher"}!</p>

      <button
        onClick={() => navigate("/teacher/students/add")}
        className="mb-4 bg-blue-500 text-white px-3 py-1 rounded"
      >
        + Add Student
      </button>

      <h3 className="text-xl font-semibold mb-2">Your Students</h3>
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">School</th>
            <th className="border px-2 py-1">Grade</th>
            <th className="border px-2 py-1">Gender</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.student_id}>
              <td className="border px-2 py-1">{s.name}</td>
              <td className="border px-2 py-1">{s.school}</td>
              <td className="border px-2 py-1">{s.grade}</td>
              <td className="border px-2 py-1">{s.gender}</td>
              <td className="border px-2 py-1">
                <button
                  onClick={() =>
                    navigate(`/teacher/students/edit/${s.student_id}`)
                  }
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.student_id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => navigate(`/spw/${s.student_id}`)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  View Progress
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={logout}
        className="mt-6 bg-red-500 text-white px-3 py-1 rounded"
      >
        Logout
      </button>
    </div>
  );
}

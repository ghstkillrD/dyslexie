import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../store/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ParentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleUnlink = async (studentId) => {
    if (
      !window.confirm(
        "Are you sure you want to unassign yourself from this student?"
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://127.0.0.1:8000/api/users/students/${studentId}/unlink_user/`,
        { user_id: user.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(students.filter((s) => s.student_id !== studentId)); // remove from UI
    } catch (err) {
      console.error("Unlink failed", err);
      alert("Failed to unlink from student");
    }
  };

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.school} ${student.grade} ${student.gender}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Parent Dashboard</h2>
      <p className="mb-4">Welcome, {user?.username || "Parent"}!</p>

      <h3 className="text-xl font-semibold mb-2">Assigned Students</h3>

      <input
        type="text"
        placeholder="Search students..."
        className="border p-2 rounded w-full mb-3"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="overflow-y-auto max-h-80 border rounded">
        <div className="border rounded p-3 bg-white">
          {students.length === 0 ? (
            <p className="text-gray-500">No assigned students</p>
          ) : (
            <table className="w-full text-left border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Name</th>
                  <th className="p-2">School</th>
                  <th className="p-2">Grade</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.student_id} className="border-t">
                    <td className="p-2">{student.name}</td>
                    <td className="p-2">{student.school}</td>
                    <td className="p-2">{student.grade}</td>
                    <td className="p-2">
                      <button
                        onClick={() => navigate(`/spw/${student.student_id}`)}
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                      >
                        View Progress
                      </button>
                      <button
                        onClick={() => handleUnlink(student.student_id)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Unlink
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white px-3 py-1 rounded"
      >
        Logout
      </button>
    </div>
  );
}

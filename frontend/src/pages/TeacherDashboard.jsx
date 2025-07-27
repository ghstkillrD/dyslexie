import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../store/AuthContext";

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

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

  const openModal = async (student) => {
    setSelectedStudent(student);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student.student_id}/linked_users/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLinkedUsers(res.data);
      setShowModal(true);
    } catch (err) {
      console.error("Error fetching linked users", err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setLinkedUsers([]);
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter((s) =>
    `${s.name} ${s.school} ${s.grade} ${s.gender}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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

      <input
        type="text"
        placeholder="Search students..."
        className="border p-2 rounded w-full mb-3"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="overflow-y-auto max-h-80 border rounded">
        {students.length === 0 ? (
          <p className="text-gray-500">No assigned students</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">School</th>
                <th className="border px-2 py-1">Grade</th>
                <th className="border px-2 py-1">Gender</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.student_id} className="hover:bg-gray-100">
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
                      onClick={() => openModal(s)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      View Links
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
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-1/2 max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">
              Linked Users for {selectedStudent?.name}
            </h2>

            <h3 className="text-lg font-semibold mb-2">Doctors</h3>
            <div className="max-h-40 overflow-y-auto border p-2 mb-4">
              {linkedUsers.filter((u) => u.role === "doctor").length === 0 ? (
                <p className="text-gray-500">No assigned doctors</p>
              ) : (
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedUsers
                      .filter((u) => u.role === "doctor")
                      .map((user) => (
                        <tr key={user.id}>
                          <td className="border p-2">{user.username}</td>
                          <td className="border p-2">{user.email}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-2">Parents</h3>
            <div className="max-h-40 overflow-y-auto border p-2 mb-4">
              {linkedUsers.filter((u) => u.role === "parent").length === 0 ? (
                <p className="text-gray-500">No assigned parents</p>
              ) : (
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedUsers
                      .filter((u) => u.role === "parent")
                      .map((user) => (
                        <tr key={user.id}>
                          <td className="border p-2">{user.username}</td>
                          <td className="border p-2">{user.email}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              onClick={closeModal}
              className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="mt-6 bg-red-500 text-white px-3 py-1 rounded"
      >
        Logout
      </button>
    </div>
  );
}

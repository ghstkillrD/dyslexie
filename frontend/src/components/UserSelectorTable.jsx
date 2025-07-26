import { useState } from 'react'

export default function UserSelectorTable({ users, selected, onToggle, title }) {
  const [query, setQuery] = useState('')

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <input
        type="text"
        placeholder="Search by name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border px-2 py-1 w-full mb-2"
      />
      <div className="border rounded h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b">
                <td className="px-2 py-1">{user.username} ({user.email})</td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onToggle(user.email)}
                    className={`px-2 py-1 rounded ${
                      selected.includes(user.email) ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}
                  >
                    {selected.includes(user.email) ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td className="px-2 py-2 text-center text-gray-500">No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

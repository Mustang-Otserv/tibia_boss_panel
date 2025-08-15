import React from 'react';
export default function AdminFilter({ users, selectedUser, setSelectedUser }) {
  return (
    <div className="p-4">
      <label className="block mb-2">Filtrar por usuário:</label>
      <select
        value={selectedUser}
        onChange={(e) => setSelectedUser(e.target.value)}
        className="border p-2 rounded w-full"
      >
        <option value="">Todos</option>
        {users.map((user, index) => (
          <option key={index} value={user}>
            {user}
          </option>
        ))}
      </select>
    </div>
  );
}
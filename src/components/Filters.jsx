import React from 'react';
export default function Filters({ filter, setFilter }) {
  return (
    <div className="p-4 flex gap-2">
      <input
        type="text"
        placeholder="Filtrar por nome..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border p-2 rounded w-full"
      />
    </div>
  );
}
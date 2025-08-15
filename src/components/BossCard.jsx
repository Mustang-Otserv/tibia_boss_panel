import React from 'react';
export default function BossCard({ boss, onClick }) {
  return (
    <div onClick={onClick} className="border rounded p-4 cursor-pointer hover:bg-gray-100">
      <h3 className="text-lg font-bold">{boss.name}</h3>
      <p>{boss.status}</p>
    </div>
  );
}
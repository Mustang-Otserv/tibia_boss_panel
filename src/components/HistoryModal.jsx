import React from 'react';
export default function HistoryModal({ history, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">Histórico</h2>
        <ul>
          {history.map((item, index) => (
            <li key={index} className="border-b py-2">
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
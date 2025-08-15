import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-blue-800 text-white px-4 py-3 flex justify-between items-center">
      <h1 className="text-lg font-bold">Tibia Boss Panel</h1>

      <nav className="flex gap-4 items-center">
        <Link to="/" className="hover:underline">Painel</Link>

        {currentUser && (
          <Link to="/admin" className="hover:underline">Admin</Link>
        )}

        {!currentUser && (
          <Link to="/login" className="hover:underline">Login</Link>
        )}

        {currentUser && (
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}

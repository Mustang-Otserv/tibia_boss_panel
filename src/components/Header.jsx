import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <nav className="flex space-x-4">
        <Link to="/" className="hover:underline">Painel</Link>
        {user && <Link to="/admin" className="hover:underline">Admin</Link>}
      </nav>
      <div>
        {user ? (
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">
            Sair
          </button>
        ) : (
          <Link to="/login" className="bg-blue-500 px-3 py-1 rounded">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

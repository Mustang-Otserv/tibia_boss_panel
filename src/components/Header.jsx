// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Header() {
  const { currentUser, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const fetchUser = async () => {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsAdmin(data.role === "admin" || data.isAdmin);
        setNickname(data.nickname || currentUser.displayName || "");
      }
    };

    fetchUser();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
      <div>
        Olá, <strong>{nickname}</strong>
      </div>
      <div className="flex gap-4">
        <Link to="/painel" className="hover:underline">
          Painel
        </Link>
        {isAdmin && (
          <Link to="/admin" className="hover:underline">
            Painel Admin
          </Link>
        )}
        <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">
          Logout
        </button>
      </div>
    </header>
  );
}

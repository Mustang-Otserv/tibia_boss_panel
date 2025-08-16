import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null); // null = carregando

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) return setIsAdmin(false);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setIsAdmin(data.role === "admin" && data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    };

    fetchUserRole();
  }, [currentUser]);

  if (isAdmin === null) {
    return <div>Carregando...</div>; // ou um spinner
  }

  if (!isAdmin) {
    return <div>Acesso negado</div>;
  }

  return children;
}

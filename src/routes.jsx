import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Painel from "./pages/Painel";
import PrivateRoute from "./components/PrivateRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        }
      />
      <Route
        path="/painel"
        element={
          <PrivateRoute>
            <Painel />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

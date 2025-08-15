import React from "react";
import { Routes, Route } from "react-router-dom";
import Painel from "../pages/Painel";
import Admin from "../pages/Admin";
import Login from "../pages/Login";
import PrivateRoute from "./components/PrivateRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Painel />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

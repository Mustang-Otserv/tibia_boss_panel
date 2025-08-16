import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Painel from "./pages/Painel";
import Admin from "./pages/Admin";
import Header from "./components/Header";
import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/painel" element={<Painel />} />
        <Route path="/admin" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />
        <Route path="/acesso-negado" element={<div>Acesso Negado</div>} />
      </Routes>
    </Router>
  );
}

export default App;

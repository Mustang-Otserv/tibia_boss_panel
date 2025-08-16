import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#FF69B4"];

export default function Admin() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersOpen, setUsersOpen] = useState(false);

  const [clicks, setClicks] = useState([]);
  const [bosses, setBosses] = useState([]);
  const [graphsOpen, setGraphsOpen] = useState(false);
  const [bossesOpen, setBossesOpen] = useState(false);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 10))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingBoss, setEditingBoss] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchBosses = async () => {
      const snap = await getDocs(collection(db, "bosses"));
      setBosses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchBosses();
  }, []);

  useEffect(() => {
    const fetchClicks = async () => {
      const snap = await getDocs(collection(db, "clicks"));
      let clicksData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const start = new Date(startDate);
      const end = new Date(endDate);
      clicksData = clicksData.filter((c) => {
        const ts = c.createdAt;
        const clickDate = ts?.toDate ? ts.toDate() : new Date(ts);
        return clickDate >= start && clickDate <= end;
      });

      setClicks(clicksData);
    };
    fetchClicks();
  }, [startDate, endDate]);

  const toggleAuthorization = async (user) => {
    const ref = doc(db, "users", user.id);
    await updateDoc(ref, { autorizado: !user.autorizado });
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, autorizado: !u.autorizado } : u
      )
    );
  };

  const handleSaveBoss = async () => {
    if (!editingBoss.name || !editingBoss.respawnDays) return;

    if (editingBoss.id) {
      const ref = doc(db, "bosses", editingBoss.id);
      await updateDoc(ref, {
        name: editingBoss.name,
        respawnDays: parseInt(editingBoss.respawnDays),
      });
      setBosses((prev) =>
        prev.map((b) =>
          b.id === editingBoss.id
            ? {
                ...b,
                name: editingBoss.name,
                respawnDays: parseInt(editingBoss.respawnDays),
              }
            : b
        )
      );
    } else {
      const newDoc = await addDoc(collection(db, "bosses"), {
        name: editingBoss.name,
        respawnDays: parseInt(editingBoss.respawnDays),
      });
      setBosses((prev) => [
        ...prev,
        { id: newDoc.id, name: editingBoss.name, respawnDays: parseInt(editingBoss.respawnDays) },
      ]);
    }
    setModalOpen(false);
    setEditingBoss(null);
  };

  const handleDeleteBoss = async () => {
    if (!editingBoss?.id) return;
    await deleteDoc(doc(db, "bosses", editingBoss.id));
    setBosses((prev) => prev.filter((b) => b.id !== editingBoss.id));
    setDeleteModalOpen(false);
    setEditingBoss(null);
  };

  // gráficos
  const clicksByUser = users.map((u) => ({
    name: u.nickname || u.email,
    value: clicks.filter((c) => c.userId === u.id).length,
  }));

  const clicksByBoss = bosses.map((b) => ({
    name: b.name,
    value: clicks.filter((c) => c.bossId === b.id).length,
  }));

  return (
    <div className="bg-gray-900 min-h-screen">
      <Header />
      <div className="p-6 space-y-4">

        {/* Usuários */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => setUsersOpen(!usersOpen)}
            className="w-full text-left px-4 py-3 bg-gray-700 rounded-t-lg text-white font-semibold hover:bg-gray-600"
          >
            Usuários {usersOpen ? "▲" : "▼"}
          </button>
          {usersOpen && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-gray-200 border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-4">Nickname</th>
                    <th className="py-2 px-4">Email</th>
                    <th className="py-2 px-4">Role</th>
                    <th className="py-2 px-4">Autorizado</th>
                    <th className="py-2 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="py-2 px-4">{user.nickname || "—"}</td>
                      <td className="py-2 px-4">{user.email}</td>
                      <td className="py-2 px-4">{user.role || "—"}</td>
                      <td className="py-2 px-4">{user.autorizado ? "Sim" : "Não"}</td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => toggleAuthorization(user)}
                          className={`px-3 py-1 rounded ${
                            user.autorizado
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          } text-white text-sm`}
                        >
                          {user.autorizado ? "Revogar" : "Autorizar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gráficos */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => setGraphsOpen(!graphsOpen)}
            className="w-full text-left px-4 py-3 bg-gray-700 rounded-t-lg text-white font-semibold hover:bg-gray-600"
          >
            Registros {graphsOpen ? "▲" : "▼"}
          </button>
          {graphsOpen && (
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="text-white">Início: </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-700 text-white rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-white">Fim: </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-700 text-white rounded px-2 py-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">Cliques por Jogador</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={clicksByUser} dataKey="value" nameKey="name" outerRadius={100}>
                        {clicksByUser.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">Cliques por Boss</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={clicksByBoss} dataKey="value" nameKey="name" outerRadius={100}>
                        {clicksByBoss.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bosses */}
        <div className="bg-gray-800 rounded-lg">
          <button
            onClick={() => setBossesOpen(!bossesOpen)}
            className="w-full text-left px-4 py-3 bg-gray-700 rounded-t-lg text-white font-semibold hover:bg-gray-600"
          >
            Bosses {bossesOpen ? "▲" : "▼"}
          </button>
          {bossesOpen && (
            <div className="p-4 overflow-x-auto">
              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingBoss({ name: "", respawnDays: 1 });
                    setModalOpen(true);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  Incluir Novo Boss
                </button>
              </div>
              <table className="w-full text-left text-gray-200 border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-4">Nome</th>
                    <th className="py-2 px-4">Respawn (dias)</th>
                    <th className="py-2 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bosses.map((boss) => (
                    <tr key={boss.id} className="border-b border-gray-700">
                      <td className="py-2 px-4">{boss.name}</td>
                      <td className="py-2 px-4">{boss.respawnDays}</td>
                      <td className="py-2 px-4 space-x-2">
                        <button
                          onClick={() => {
                            setEditingBoss(boss);
                            setModalOpen(true);
                          }}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setEditingBoss(boss);
                            setDeleteModalOpen(true);
                          }}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                        >
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Boss */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingBoss?.id ? "Editar Boss" : "Novo Boss"}
            </h2>
            <input
              type="text"
              placeholder="Nome do Boss"
              value={editingBoss?.name || ""}
              onChange={(e) =>
                setEditingBoss({ ...editingBoss, name: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 bg-gray-700 text-white rounded"
            />
            <input
              type="number"
              placeholder="Respawn (dias)"
              value={editingBoss?.respawnDays || ""}
              onChange={(e) =>
                setEditingBoss({ ...editingBoss, respawnDays: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 bg-gray-700 text-white rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingBoss(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBoss}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h2>
            <p className="text-gray-300 mb-4">
              Tem certeza que deseja deletar o boss{" "}
              <span className="font-semibold">{editingBoss?.name}</span>?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEditingBoss(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBoss}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

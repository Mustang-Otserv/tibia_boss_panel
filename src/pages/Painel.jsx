import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, History, Star, EyeOff } from "lucide-react";

// ---- helpers de data seguros ----
function toDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate(); // Firestore Timestamp
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(val) {
  const d = toDateSafe(val);
  return d ? format(d, "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";
}

export default function Painel() {
  const { currentUser } = useAuth();
  const [bosses, setBosses] = useState([]);
  // clicks[bossId] = { action, createdAt, userName }
  const [clicks, setClicks] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [sections, setSections] = useState({ destaque: [], ocultados: [] });

  // carregar preferências do usuário (localStorage)
  useEffect(() => {
    const saved = localStorage.getItem("bossSections");
    if (saved) {
      try {
        setSections(JSON.parse(saved));
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("bossSections", JSON.stringify(sections));
  }, [sections]);

  // buscar bosses
  useEffect(() => {
    const fetchBosses = async () => {
      const bossesSnapshot = await getDocs(collection(db, "bosses"));
      const bossesData = bossesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setBosses(bossesData);
    };
    fetchBosses();
  }, []);

  // buscar último clique de cada boss
  useEffect(() => {
    const fetchClicks = async () => {
      const next = {};
      // Faz em série para simplificar (pode otimizar depois com Promise.all)
      for (const boss of bosses) {
        const qLast = query(
          collection(db, "clicks"),
          where("bossId", "==", boss.id),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(qLast);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          next[boss.id] = {
            action: data.action,
            userName: data.userName || "Jogador",
            createdAt: data.createdAt, // pode ser Timestamp; formatamos com fmtDate
          };
        }
      }
      setClicks(next);
    };
    if (bosses.length) fetchClicks();
  }, [bosses]);

  const handleAction = async (bossId, action) => {
    // grava no Firestore com serverTimestamp
    await addDoc(collection(db, "clicks"), {
      bossId,
      action, // "checado" | "morto"
      createdAt: serverTimestamp(),
      userId: currentUser?.uid || "anon",
      userName: currentUser?.displayName || currentUser?.email || "Jogador",
    });
    // atualiza UI imediatamente com Date local (evita piscar)
    setClicks((prev) => ({
      ...prev,
      [bossId]: {
        action,
        userName: currentUser?.displayName || currentUser?.email || "Jogador",
        createdAt: new Date(),
      },
    }));
  };

  const handleHistory = async (bossId) => {
    const qAll = query(
      collection(db, "clicks"),
      where("bossId", "==", bossId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(qAll);
    const data = snap.docs.map((d) => d.data());
    setHistory(data);
    setSelectedBoss(bossId);
  };

  // movimentação: destaque / geral
  const toggleDestaque = (bossId) => {
    setSections((prev) => {
      const inDest = prev.destaque.includes(bossId);
      return {
        destaque: inDest
          ? prev.destaque.filter((id) => id !== bossId)
          : [...prev.destaque, bossId],
        ocultados: prev.ocultados.filter((id) => id !== bossId),
      };
    });
  };

  // movimentação: ocultar / geral
  const toggleOculto = (bossId) => {
    setSections((prev) => {
      const inOculto = prev.ocultados.includes(bossId);
      return {
        destaque: prev.destaque.filter((id) => id !== bossId),
        ocultados: inOculto
          ? prev.ocultados.filter((id) => id !== bossId)
          : [...prev.ocultados, bossId],
      };
    });
  };

  const renderSection = (title, filterFn) => (
    <div className="mb-10">
      <h2 className="text-white text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {bosses.filter(filterFn).map((boss) => {
          const last = clicks[boss.id];
          return (
            <div key={boss.id} className="bg-gray-800 rounded-xl shadow p-4 relative">
              <div className="absolute top-2 right-2 flex gap-2">
                <Star
                  className={`cursor-pointer ${
                    sections.destaque.includes(boss.id) ? "text-yellow-400" : "text-gray-400"
                  }`}
                  onClick={() => toggleDestaque(boss.id)}
                  title="Destaque"
                />
                <EyeOff
                  className={`cursor-pointer ${
                    sections.ocultados.includes(boss.id) ? "text-red-400" : "text-gray-400"
                  }`}
                  onClick={() => toggleOculto(boss.id)}
                  title="Ocultar"
                />
              </div>

              <h3 className="text-lg font-semibold text-white pr-12">{boss.name}</h3>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAction(boss.id, "checado")}
                  className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white text-sm"
                >
                  Checado
                </button>
                <button
                  onClick={() => handleAction(boss.id, "morto")}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm"
                >
                  Morto
                </button>
              </div>

              <div className="mt-3 text-gray-300 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>
                    Última ação: {last?.action ? `${last.action} por ${last.userName || "—"}` : "—"}
                  </span>
                </div>
                <div className="pl-5">{fmtDate(last?.createdAt)}</div>
              </div>

              <div className="mt-2 flex justify-end">
                <History
                  className="cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => handleHistory(boss.id)}
                  title="Histórico"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {renderSection("⭐ Destaque", (b) => sections.destaque.includes(b.id))}
      {renderSection(
        "📋 Geral",
        (b) => !sections.destaque.includes(b.id) && !sections.ocultados.includes(b.id)
      )}
      {renderSection("🚫 Ocultados", (b) => sections.ocultados.includes(b.id))}

      {/* Modal de histórico */}
      {selectedBoss && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Histórico</h3>
            <ul className="text-gray-300 text-sm max-h-64 overflow-y-auto">
              {history.map((h, idx) => (
                <li key={idx} className="mb-2">
                  {h.userName || "—"} — {h.action || "—"} — {fmtDate(h.createdAt)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedBoss(null)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

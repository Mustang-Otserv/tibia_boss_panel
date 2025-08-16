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
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, History, Star, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import Header from "../components/Header";

// Helpers de data
function toDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate();
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
  const [clicks, setClicks] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [sections, setSections] = useState(() => {
    const saved = localStorage.getItem("bossSections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return { destaque: [], ocultados: [] };
  });
  const [collapsed, setCollapsed] = useState(true); // Ocultados colapsados

  useEffect(() => {
    localStorage.setItem("bossSections", JSON.stringify(sections));
  }, [sections]);

  // Buscar bosses
  useEffect(() => {
    const fetchBosses = async () => {
      const snap = await getDocs(collection(db, "bosses"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>a.name.localeCompare(b.name));
      setBosses(data);
    };
    fetchBosses();
  }, []);

  // Buscar últimos clicks de cada tipo
  useEffect(() => {
    const fetchClicks = async () => {
      const next = {};
      for (const boss of bosses) {
        // Último checado
        const qCheck = query(
          collection(db, "clicks"),
          where("bossId", "==", boss.id),
          where("action", "==", "checado"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snapCheck = await getDocs(qCheck);
        const lastCheck = !snapCheck.empty ? snapCheck.docs[0].data() : null;

        // Último morto
        const qDead = query(
          collection(db, "clicks"),
          where("bossId", "==", boss.id),
          where("action", "==", "morto"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snapDead = await getDocs(qDead);
        const lastDead = !snapDead.empty ? snapDead.docs[0].data() : null;

        next[boss.id] = { checado: lastCheck, morto: lastDead };
      }
      setClicks(next);
    };
    if (bosses.length) fetchClicks();
  }, [bosses]);

  const handleAction = async (bossId, action) => {
    await addDoc(collection(db, "clicks"), {
      bossId,
      action,
      createdAt: serverTimestamp(),
      userId: currentUser?.uid || "anon",
      userName: currentUser?.nickname || currentUser?.displayName || "Jogador",
    });
    setClicks(prev => ({
      ...prev,
      [bossId]: {
        ...prev[bossId],
        [action]: { action, userName: currentUser?.nickname || currentUser?.displayName, createdAt: new Date() }
      }
    }));
  };

  const handleHistory = async (bossId) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const qAll = query(
      collection(db, "clicks"),
      where("bossId", "==", bossId),
      where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(qAll);
    const data = snap.docs.map(d => d.data());
    setHistory(data);
    setSelectedBoss(bossId);
  };

  const toggleDestaque = (bossId) => {
    setSections(prev => ({
      destaque: prev.destaque.includes(bossId) ? prev.destaque.filter(id => id!==bossId) : [...prev.destaque, bossId],
      ocultados: prev.ocultados.filter(id => id!==bossId)
    }));
  };

  const toggleOculto = (bossId) => {
    setSections(prev => ({
      destaque: prev.destaque.filter(id => id!==bossId),
      ocultados: prev.ocultados.includes(bossId) ? prev.ocultados.filter(id => id!==bossId) : [...prev.ocultados, bossId]
    }));
  };

  const renderSection = (title, filterFn) => (
    <div className="mb-10">
      <h2 className="text-white text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {bosses.filter(filterFn).map(boss => {
          const last = clicks[boss.id] || {};
          return (
            <div key={boss.id} className="bg-gray-800 rounded-xl shadow p-4 relative">
              <div className="absolute top-2 right-2 flex gap-2">
                <Star
                  className={`cursor-pointer ${sections.destaque.includes(boss.id) ? "text-yellow-400":"text-gray-400"}`}
                  onClick={()=>toggleDestaque(boss.id)}
                  title="Destaque"
                />
                <EyeOff
                  className={`cursor-pointer ${sections.ocultados.includes(boss.id) ? "text-red-400":"text-gray-400"}`}
                  onClick={()=>toggleOculto(boss.id)}
                  title="Ocultar"
                />
              </div>

              <h3 className="text-lg font-semibold text-white pr-12">{boss.name}</h3>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={()=>handleAction(boss.id,"checado")}
                  className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white text-sm"
                >Checado</button>
                <button
                  onClick={()=>handleAction(boss.id,"morto")}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm"
                >Morto</button>
              </div>

              <div className="mt-3 text-gray-300 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>Último checado: {last.checado ? `${last.checado.userName} — ${fmtDate(last.checado.createdAt)}` : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>Último morto: {last.morto ? `${last.morto.userName} — ${fmtDate(last.morto.createdAt)}` : "—"}</span>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <History
                  className="cursor-pointer text-gray-400 hover:text-white"
                  onClick={()=>handleHistory(boss.id)}
                  title="Histórico"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  return (
    <div>
      <Header />
      <div className="p-6">
        {renderSection("⭐ Destaque", b => sections.destaque.includes(b.id))}
        {renderSection("📋 Geral", b => !sections.destaque.includes(b.id) && !sections.ocultados.includes(b.id))}
        
        {/* Ocultados colapsáveis */}
        <div className="mb-10">
          <h2
            className="text-white text-2xl font-bold mb-4 flex items-center cursor-pointer"
            onClick={()=>setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="mr-2"/> : <ChevronDown className="mr-2"/>} 🚫 Ocultados
          </h2>
          {!collapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {bosses.filter(b => sections.ocultados.includes(b.id)).map(boss => {
                const last = clicks[boss.id] || {};
                return (
                  <div key={boss.id} className="bg-gray-800 rounded-xl shadow p-4 relative">
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Star
                        className={`cursor-pointer ${sections.destaque.includes(boss.id) ? "text-yellow-400":"text-gray-400"}`}
                        onClick={()=>toggleDestaque(boss.id)}
                        title="Destaque"
                      />
                      <EyeOff
                        className={`cursor-pointer ${sections.ocultados.includes(boss.id) ? "text-red-400":"text-gray-400"}`}
                        onClick={()=>toggleOculto(boss.id)}
                        title="Ocultar"
                      />
                    </div>

                    <h3 className="text-lg font-semibold text-white pr-12">{boss.name}</h3>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={()=>handleAction(boss.id,"checado")}
                        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white text-sm"
                      >Checado</button>
                      <button
                        onClick={()=>handleAction(boss.id,"morto")}
                        className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm"
                      >Morto</button>
                    </div>

                    <div className="mt-3 text-gray-300 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Último checado: {last.checado ? `${last.checado.userName} — ${fmtDate(last.checado.createdAt)}` : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Último morto: {last.morto ? `${last.morto.userName} — ${fmtDate(last.morto.createdAt)}` : "—"}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <History
                        className="cursor-pointer text-gray-400 hover:text-white"
                        onClick={()=>handleHistory(boss.id)}
                        title="Histórico"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de histórico */}
      {selectedBoss && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-11/12 max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Histórico: {bosses.find(b=>b.id===selectedBoss)?.name || "—"}
            </h3>
            <ul className="space-y-2 text-gray-300">
              {history.length ? history.map((h,i)=>(
                <li key={i} className="border-b border-gray-700 pb-1">
                  {h.userName} — {h.action} — {fmtDate(h.createdAt)}
                </li>
              )) : <li>Nenhum registro nos últimos 30 dias</li>}
            </ul>
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
              onClick={()=>setSelectedBoss(null)}
            >Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

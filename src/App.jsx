import React, { useEffect, useMemo, useState } from 'react'
import { db, auth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from './firebase'
import {
  collection, doc, addDoc, setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from 'firebase/firestore'
import { PieChart, Pie, Tooltip, Cell, Legend } from 'recharts'

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase()
const COLORS = ["#facc15", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#22d3ee", "#a3e635"]
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—')

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [bosses, setBosses] = useState([])
  const [clicks, setClicks] = useState([])
  const [users, setUsers] = useState([])
  const [sortOption, setSortOption] = useState('name')
  const [showHistoryFor, setShowHistoryFor] = useState(null)
  const [newBoss, setNewBoss] = useState('')

  // Login form state
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setProfile(null); return }
      const uref = doc(db, 'users', u.uid)
      const snap = await getDoc(uref)
      const emailLower = (u.email || '').toLowerCase()
      const selfIsAdmin = emailLower === ADMIN_EMAIL

      if (!snap.exists()) {
        const nick = nickname || (u.displayName || '').split(' ')[0] || 'Jogador'
        await setDoc(uref, {
          uid: u.uid,
          email: u.email || null,
          nickname: nick,
          isAdmin: selfIsAdmin,
          autorizado: selfIsAdmin ? true : false,
          createdAt: serverTimestamp()
        })
        setProfile({ uid: u.uid, email: u.email, nickname: nick, isAdmin: selfIsAdmin, autorizado: selfIsAdmin })
      } else {
        setProfile({ id: snap.id, ...snap.data() })
      }

      // Live bosses
      const unsubBosses = onSnapshot(collection(db, 'bosses'), (ss) => {
        const arr = ss.docs.map(d => ({ id: d.id, ...d.data() }))
        arr.sort((a,b)=>a.name.localeCompare(b.name))
        setBosses(arr)
      })

      // Live clicks
      const clicksQ = query(collection(db, 'clicks'), orderBy('createdAt', 'asc'))
      const unsubClicks = onSnapshot(clicksQ, (ss) => {
        const arr = ss.docs.map(d => {
          const data = d.data()
          const iso = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null
          return { id: d.id, bossId: data.bossId, action: data.action, userId: data.userId, userName: data.userName, createdAtISO: iso }
        })
        setClicks(arr)
      })

      // Admin users list
      let unsubUsers = () => {}
      if (selfIsAdmin || (snap.exists() && snap.data().isAdmin)) {
        unsubUsers = onSnapshot(collection(db, 'users'), (ss) => {
          setUsers(ss.docs.map(d => ({ id: d.id, ...d.data() })))
        })
      }

      return () => { unsubBosses(); unsubClicks(); unsubUsers(); }
    })
    return () => unsub()
  }, [])

  const isAdmin = !!profile?.isAdmin
  const isAllowed = !!profile?.autorizado

  const lastByBoss = useMemo(() => {
    const map = {}
    for (const b of bosses) map[b.id] = { checadoAt: null, mortoAt: null }
    for (const c of clicks) {
      if (!map[c.bossId]) map[c.bossId] = { checadoAt: null, mortoAt: null }
      if (c.action === 'checado') map[c.bossId].checadoAt = c.createdAtISO
      if (c.action === 'morto') map[c.bossId].mortoAt = c.createdAtISO
    }
    return map
  }, [bosses, clicks])

  const sortedBosses = useMemo(() => {
    const arr = [...bosses]
    if (sortOption === 'name') return arr.sort((a,b)=>a.name.localeCompare(b.name))
    if (sortOption === 'checkedRecent') return arr.sort((a,b)=>
      (new Date(lastByBoss[b.id]?.checadoAt || 0) - new Date(lastByBoss[a.id]?.checadoAt || 0)) || a.name.localeCompare(b.name)
    )
    if (sortOption === 'checkedOldest') return arr.sort((a,b)=>
      (new Date(lastByBoss[a.id]?.checadoAt || 0) - new Date(lastByBoss[b.id]?.checadoAt || 0)) || a.name.localeCompare(b.name)
    )
    return arr
  }, [bosses, sortOption, lastByBoss])

  const bossesCheckedCount = useMemo(() => bosses.map((boss) => ({
    name: boss.name,
    value: clicks.filter(c => c.bossId === boss.id && c.action === 'checado').length
  })), [bosses, clicks])

  const userClickData = useMemo(() => {
    const acc = new Map()
    for (const c of clicks) acc.set(c.userName || c.userId, (acc.get(c.userName || c.userId) || 0) + 1)
    return Array.from(acc, ([name, value]) => ({ name, value }))
  }, [clicks])

  async function handleClick(bossId, action) {
    if (!user || !isAllowed) return
    await addDoc(collection(db, 'clicks'), {
      bossId,
      action,
      userId: user.uid,
      userName: profile?.nickname || (user.email || 'Jogador'),
      createdAt: serverTimestamp()
    })
  }

  async function addBoss() {
    if (!newBoss.trim() || !isAdmin) return
    await addDoc(collection(db, 'bosses'), { name: newBoss.trim(), createdAt: serverTimestamp() })
    setNewBoss('')
  }

  async function setUserFlag(uid, flag, value) {
    if (!isAdmin) return
    await updateDoc(doc(db, 'users', uid), { [flag]: value })
  }

  async function doLogin(e) {
    e.preventDefault()
    const cred = await signInWithEmailAndPassword(auth, email, password)
    // profile will be handled by the listener
  }

  async function doRegister(e) {
    e.preventDefault()
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (nickname) {
      await updateProfile(cred.user, { displayName: nickname })
    }
    // profile doc is created in listener; if email matches admin, gets admin/autorized true
  }

  if (!user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-gray-900 p-6">
        <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Acesso</h1>
            <button className="text-sm underline" onClick={()=>setMode(mode==='login'?'register':'login')}>
              {mode==='login' ? 'Criar conta' : 'Já tenho conta'}
            </button>
          </div>

          {mode==='login' ? (
            <form className="space-y-3" onSubmit={doLogin}>
              <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 rounded text-black" required />
              <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 rounded text-black" required />
              <button className="w-full bg-blue-500 hover:bg-blue-600 rounded px-4 py-2">Entrar</button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={doRegister}>
              <input type="text" placeholder="Nickname" value={nickname} onChange={e=>setNickname(e.target.value)} className="w-full p-2 rounded text-black" required />
              <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 rounded text-black" required />
              <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 rounded text-black" required />
              <button className="w-full bg-green-500 hover:bg-green-600 rounded px-4 py-2">Criar conta</button>
            </form>
          )}

          <p className="text-xs text-gray-300">
            Dica: o primeiro login com o email do admin ({ADMIN_EMAIL || 'configure em .env'}) já entra com acesso liberado e admin.
          </p>
        </div>
      </div>
    )
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-gray-900 p-6">
        <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
          <h1 className="text-xl font-bold">Acesso pendente</h1>
          <p className="text-sm text-gray-300">Seu usuário aguarda liberação do admin.</p>
          <div className="flex justify-between items-center text-gray-300 text-sm">
            <span>{user.email}</span>
            <button onClick={()=>signOut(auth)} className="text-gray-200 underline">Sair</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">Painel de Bosses Tibia</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">{profile?.nickname} — {user.email}</span>
          <button onClick={()=>signOut(auth)} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Sair</button>
        </div>
      </header>

      {isAdmin && (
        <section className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-bold mb-3">Admin — Gerenciar Bosses</h2>
            <div className="flex gap-2 flex-wrap">
              <input value={newBoss} onChange={e=>setNewBoss(e.target.value)} placeholder="Nome do Boss" className="p-2 rounded text-black" />
              <button onClick={addBoss} className="bg-blue-500 hover:bg-blue-600 px-4 py-1 rounded">Adicionar</button>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-bold mb-3">Admin — Usuários</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-2">Nickname</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Autorizado</th>
                    <th className="p-2">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-gray-700">
                      <td className="p-2">{u.nickname || 'Jogador'}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">
                        <input type="checkbox" checked={!!u.autorizado} onChange={e=>setUserFlag(u.id,'autorizado',e.target.checked)} />
                      </td>
                      <td className="p-2">
                        <input type="checkbox" checked={!!u.isAdmin} onChange={e=>setUserFlag(u.id,'isAdmin',e.target.checked)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AdminCharts clicks={clicks} bosses={bosses} />
        </section>
      )}

      <section>
        <div className="mb-4">
          <label className="mr-2">Ordenar por:</label>
          <select value={sortOption} onChange={(e)=>setSortOption(e.target.value)} className="text-black p-1 rounded">
            <option value="name">Nome</option>
            <option value="checkedRecent">Checado mais recente</option>
            <option value="checkedOldest">Checado mais antigo</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedBosses.map(boss => (
            <div key={boss.id} className="bg-gray-800 p-4 rounded-xl shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{boss.name}</h2>
                <button onClick={()=>setShowHistoryFor(showHistoryFor===boss.id?null:boss.id)} className="text-blue-400 hover:text-blue-200">📜</button>
              </div>
              <div className="flex gap-2 mb-2">
                <button onClick={()=>handleClick(boss.id,'checado')} className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded">Checado</button>
                <button onClick={()=>handleClick(boss.id,'morto')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">Morto</button>
              </div>
              <div className="text-sm text-gray-300">
                <p>Último checado: {fmt((lastByBoss[boss.id]||{}).checadoAt)}</p>
                <p>Último morto: {fmt((lastByBoss[boss.id]||{}).mortoAt)}</p>
              </div>
              {showHistoryFor === boss.id && (
                <div className="mt-2 p-2 bg-gray-700 rounded max-h-60 overflow-auto">
                  <h3 className="font-bold mb-1">Histórico</h3>
                  {clicks.filter(c=>c.bossId===boss.id).length===0 && <p className="text-sm">Nenhum registro.</p>}
                  <ul className="text-sm">
                    {clicks.filter(c=>c.bossId===boss.id).slice().reverse().map(h=>(
                      <li key={h.id}>{fmt(h.createdAtISO)} — {h.userName || h.userId} — {h.action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="text-xs text-gray-400">
        Admin email configurado: {ADMIN_EMAIL || '—'}
      </footer>
    </div>
  )
}

function AdminCharts({ clicks, bosses }) {
  const COLORS = ["#facc15", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#22d3ee", "#a3e635"]
  const bossesCheckedCount = useMemo(() => bosses.map((boss) => ({
    name: boss.name,
    value: clicks.filter(c => c.bossId === boss.id && c.action === 'checado').length
  })), [bosses, clicks])

  const userClickData = useMemo(() => {
    const acc = new Map()
    for (const c of clicks) acc.set(c.userName || c.userId, (acc.get(c.userName || c.userId) || 0) + 1)
    return Array.from(acc, ([name, value]) => ({ name, value }))
  }, [clicks])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-bold mb-2">Cliques por Boss (checado)</h2>
        <PieChart width={340} height={260}>
          <Pie data={bossesCheckedCount} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {bossesCheckedCount.map((_,i)=>(<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
          </Pie>
          <Tooltip/><Legend/>
        </PieChart>
      </div>
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-bold mb-2">Cliques por Jogador</h2>
        <PieChart width={340} height={260}>
          <Pie data={userClickData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {userClickData.map((_,i)=>(<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
          </Pie>
          <Tooltip/><Legend/>
        </PieChart>
      </div>
    </div>
  )
}

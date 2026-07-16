import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
import { CANDIDATES as STATIC_CANDIDATES } from "./candidates.js"

const firebaseConfig = {
  apiKey: "AIzaSyAwb6ozidFs6_LFW0ktj8oBDAcAFJpe7Ag",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.firebasestorage.app",
  messagingSenderId: "708043016849",
  appId: "1:708043016849:web:e658aa9b22286016c20d30"
};
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const ADMIN_PASSWORD = "kings2026"

export default function App() {
  const [studentId, setStudentId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [selections, setSelections] = useState({})
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPass, setAdminPass] = useState("")
  const [votesData, setVotesData] = useState([])
  const [candidates, setCandidates] = useState(STATIC_CANDIDATES)
  const [newCand, setNewCand] = useState({ name:"", position:"", photo:"" })
  const [editId, setEditId] = useState(null)
  const timerRef = useRef(null)

  const positions = [...new Set(candidates.map(c => c.position))]

  useEffect(()=>{
    (async()=>{
      const snap = await getDocs(collection(db,'config_candidates'))
      if(!snap.empty) setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    })()
  },[])

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { handleLogout(); }, 5*60*1000)
  }
  useEffect(()=>{ if(loggedIn){ resetTimer(); window.addEventListener('mousemove', resetTimer); window.addEventListener('keydown', resetTimer); return ()=>{ clearTimeout(timerRef.current); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer)} } },[loggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = studentId.trim().padStart(3,'0')
    setLoading(true)
    const sSnap = await getDoc(doc(db,'students',id))
    if(!sSnap.exists()){ setMessage("Invalid ID"); setLoading(false); return }
    const vSnap = await getDoc(doc(db,'votes',id))
    if(vSnap.exists()){ setMessage("Already voted"); setLoading(false); return }
    setStudentId(id); setLoggedIn(true); setLoading(false)
  }

  const handleSubmitAll = async () => {
    if(Object.keys(selections).length!== positions.length){ alert("Vote for all positions"); return }
    setLoading(true)
    await setDoc(doc(db,'votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString() })
    setVoted(true); setTimeout(()=>handleLogout(), 3000); setLoading(false)
  }

  const loadResults = async () => {
    if(adminPass!== ADMIN_PASSWORD){ alert("Unauthorized"); return }
    setLoading(true)
    const votesSnap = await getDocs(collection(db,'votes'))
    setVotesData(votesSnap.docs.map(d=>d.data()))
    const candSnap = await getDocs(collection(db,'config_candidates'))
    if(!candSnap.empty) setCandidates(candSnap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    else {
      for(let c of STATIC_CANDIDATES){ await addDoc(collection(db,'config_candidates'), c) }
      const newSnap = await getDocs(collection(db,'config_candidates'))
      setCandidates(newSnap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    }
    setShowAdmin(true); setLoading(false)
  }

  const handleAddCandidate = async () => {
    if(!newCand.name ||!newCand.position ||!newCand.photo){ alert("Fill all fields"); return }
    setLoading(true)
    if(editId){ await updateDoc(doc(db,'config_candidates',editId), newCand); setEditId(null) }
    else { const id = `${newCand.position.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`; await addDoc(collection(db,'config_candidates'), { id,...newCand }) }
    const snap = await getDocs(collection(db,'config_candidates'))
    setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    setNewCand({ name:"", position:"", photo:"" }); setLoading(false)
  }
  const handleEdit = (c) => { setNewCand({ name:c.name, position:c.position, photo:c.photo }); setEditId(c.firebaseId); window.scrollTo(0,0) }
  const handleDelete = async (fid) => { if(!confirm("Delete candidate?")) return; await deleteDoc(doc(db,'config_candidates',fid)); setCandidates(candidates.filter(c=>c.firebaseId!==fid)) }
  const resetAllVotes = async () => {
    if(!confirm("RESET ALL VOTES?")) return
    setLoading(true)
    const snap = await getDocs(collection(db,'votes'))
    for(let d of snap.docs){ await deleteDoc(d.ref) }
    setVotesData([]); alert("All votes reset"); setLoading(false)
  }
  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }
  const getCount = (pos, candId) => votesData.filter(v=>v.votes[pos]===candId).length

  if(showAdmin) return (
    <div style={{maxWidth:1200, margin:'20px auto', padding:20, fontFamily:'sans-serif', background:'#f8f9fa', minHeight:'100vh'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', padding:15, borderRadius:10}}>
        <h1 style={{margin:0}}>Admin Dashboard</h1>
        <div><span style={{marginRight:15}}><b>{votesData.length}</b> voted</span><button onClick={handleLogout} style={{padding:'8px 15px'}}>Exit</button></div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginTop:20}}>
        <div style={{background:'#fff', padding:15, borderRadius:10}}><h3>Manage Votes</h3><p>Total Votes: <b>{votesData.length}</b></p><button onClick={resetAllVotes} style={{background:'#dc3545', color:'#fff', padding:'12px', width:'100%', border:'none', borderRadius:8, cursor:'pointer', fontWeight:'bold'}}>🗑️ RESET ALL VOTES</button></div>
        <div style={{background:'#fff', padding:15, borderRadius:10}}>
          <h3>{editId? "Edit Candidate" : "Add Candidate"}</h3>
          <input value={newCand.name} onChange={e=>setNewCand({...newCand, name:e.target.value.toUpperCase()})} placeholder="Full Name" style={{padding:10, width:'100%', marginBottom:8, borderRadius:6, border:'1px solid #ddd'}}/>
          <input value={newCand.position} onChange={e=>setNewCand({...newCand, position:e.target.value.toUpperCase()})} placeholder="Position (e.g. PRESIDENT)" style={{padding:10, width:'100%', marginBottom:8, borderRadius:6, border:'1px solid #ddd'}}/>
          <input value={newCand.photo} onChange={e=>setNewCand({...newCand, photo:e.target.value})} placeholder="/images/candidates/name.jpg" style={{padding:10, width:'100%', marginBottom:8, borderRadius:6, border:'1px solid #ddd'}}/>
          <button onClick={handleAddCandidate} style={{background:'#0d5c5c', color:'#fff', padding:12, width:'100%', border:'none', borderRadius:8}}>{editId? "Update" : "Add Candidate"}</button>
          {editId && <button onClick={()=>{setEditId(null); setNewCand({name:"", position:"", photo:""})}} style={{marginTop:5, width:'100%', padding:8}}>Cancel</button>}
        </div>
      </div>

      {positions.map(pos=>{
        const totalPosVotes = votesData.length
        const maxVotes = Math.max(...candidates.filter(c=>c.position===pos).map(c=>getCount(pos,c.id)),1)
        return (
        <div key={pos} style={{marginTop:25, background:'#fff', padding:20, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
          <h2 style={{background:'#0d5c5c', color:'#fff', padding:12, borderRadius:8, marginTop:0}}>{pos}</h2>
          <div style={{display:'flex', flexDirection:'column', gap:15}}>
            {candidates.filter(c=>c.position===pos).map(c=>{
              const count = getCount(pos, c.id)
              const percent = totalPosVotes? ((count/totalPosVotes)*100).toFixed(1) : 0
              const barWidth = (count/maxVotes)*100
              return (
                <div key={c.firebaseId || c.id} style={{display:'flex', alignItems:'center', gap:12, padding:12, border:'1px solid #eee', borderRadius:10}}>
                  <img src={c.photo} style={{width:65, height:65, objectFit:'cover', borderRadius:50, border:'2px solid #0d5c5c'}} alt=""/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><b>{c.name}</b><span><b>{count}</b> votes • {percent}%</span></div>
                    <div style={{background:'#e9ecef', height:22, borderRadius:20, marginTop:8, overflow:'hidden', position:'relative'}}>
                      <div style={{background: count===maxVotes && count>0? '#0d5c5c' : '#6bb6b6', width:`${barWidth}%`, height:'100%', borderRadius:20, transition:'width 0.8s ease', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8, color:'#fff', fontWeight:'bold', fontSize:12}}>
                        {count>0 && `${percent}%`}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:5}}>
                    <button onClick={()=>handleEdit(c)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>handleDelete(c.firebaseId)} style={{padding:'6px 10px', background:'#ff4444', color:'#fff', border:'none', borderRadius:6, cursor:'pointer'}}>Del</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )})}
    </div>
  )

  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1>The Kings Voting 2026/27</h1>
      <form onSubmit={handleLogin}>
        <input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Student ID" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/>
        <button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#000', color:'#fff'}}>{loading?'Verifying...':'Login'}</button>
      </form>
      {message && <p style={{color:'red'}}>{message}</p>}
      <div style={{marginTop:60, borderTop:'1px solid #eee', paddingTop:20}}>
        <details><summary style={{cursor:'pointer', color:'#666'}}>Admin Access</summary>
          <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" style={{padding:10, width:'100%', marginTop:10}}/>
          <button onClick={loadResults} style={{marginTop:10, padding:10, width:'100%', background:'#0d5c5c', color:'#fff'}}>Access Dashboard</button>
        </details>
      </div>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100, fontFamily:'sans-serif'}}><h1>✅ Vote Recorded!</h1><p>Thank you</p></div>

  return (
    <div style={{maxWidth:1000, margin:'20px auto', padding:20, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}><h2>Voter: {studentId}</h2><button onClick={handleLogout}>Logout</button></div>
      {positions.map(pos => (
        <div key={pos} style={{marginTop:30}}>
          <h3 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos}</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:15}}>
            {candidates.filter(c=>c.position===pos).map(c=>(
              <div key={c.id} onClick={()=>setSelections({...selections, [pos]:c.id})} style={{border: selections[pos]===c.id? '3px solid #0d5c5c':'1px solid #ddd', padding:10, borderRadius:10, cursor:'pointer', textAlign:'center', background: selections[pos]===c.id? '#f0ffff':'#fff'}}>
                <img src={c.photo} alt={c.name} style={{width:'100%', height:220, objectFit:'cover', borderRadius:8}}/>
                <p style={{fontWeight:'bold', marginTop:8}}>{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitAll} style={{marginTop:40, padding:15, width:'100%', background:'#000', color:'#fff', fontSize:18}}>SUBMIT ALL VOTES</button>
    </div>
  )
}

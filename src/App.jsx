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

  // Load dynamic candidates from Firebase if exists
  useEffect(()=>{
    (async()=>{
      const snap = await getDocs(collection(db,'config_candidates'))
      if(!snap.empty){
        setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
      }
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
      // first time - migrate static to firebase
      for(let c of STATIC_CANDIDATES){ await addDoc(collection(db,'config_candidates'), c) }
      const newSnap = await getDocs(collection(db,'config_candidates'))
      setCandidates(newSnap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    }
    setShowAdmin(true); setLoading(false)
  }

  const handleAddCandidate = async () => {
    if(!newCand.name ||!newCand.position ||!newCand.photo){ alert("Fill name, position, photo"); return }
    setLoading(true)
    if(editId){
      await updateDoc(doc(db,'config_candidates',editId), newCand)
      setEditId(null)
    } else {
      const id = `${newCand.position.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`
      await addDoc(collection(db,'config_candidates'), { id,...newCand })
    }
    const snap = await getDocs(collection(db,'config_candidates'))
    setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    setNewCand({ name:"", position:"", photo:"" }); setLoading(false)
  }

  const handleEdit = (c) => { setNewCand({ name:c.name, position:c.position, photo:c.photo }); setEditId(c.firebaseId); window.scrollTo(0,0) }
  const handleDelete = async (fid) => { if(!confirm("Delete candidate?")) return; await deleteDoc(doc(db,'config_candidates',fid)); setCandidates(candidates.filter(c=>c.firebaseId!==fid)) }

  const resetAllVotes = async () => {
    if(!confirm("RESET ALL VOTES? This cannot be undone!")) return
    setLoading(true)
    const snap = await getDocs(collection(db,'votes'))
    for(let d of snap.docs){ await deleteDoc(d.ref) }
    setVotesData([]); alert("All votes reset"); setLoading(false)
  }

  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }
  const getCount = (pos, candId) => votesData.filter(v=>v.votes[pos]===candId).length

  if(showAdmin) return (
    <div style={{maxWidth:1200, margin:'20px auto', padding:20, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}><h1>Admin Dashboard</h1><button onClick={handleLogout}>Exit</button></div>
      <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
        <div style={{border:'1px solid #ddd', padding:15, borderRadius:10, flex:1}}><h3>Total Voted: {votesData.length}</h3><button onClick={resetAllVotes} style={{background:'red', color:'#fff', padding:'10px 15px', border:'none', cursor:'pointer'}}>🗑️ RESET ALL VOTES</button></div>
        <div style={{border:'1px solid #ddd', padding:15, borderRadius:10, flex:2}}>
          <h3>{editId? "Edit Candidate" : "Add New Candidate"}</h3>
          <input value={newCand.name} onChange={e=>setNewCand({...newCand, name:e.target.value.toUpperCase()})} placeholder="Full Name (e.g. JOHN DOE)" style={{padding:8, width:'100%', marginBottom:8}}/>
          <input value={newCand.position} onChange={e=>setNewCand({...newCand, position:e.target.value.toUpperCase()})} placeholder="Position (e.g. PRESIDENT or new position)" style={{padding:8, width:'100%', marginBottom:8}}/>
          <input value={newCand.photo} onChange={e=>setNewCand({...newCand, photo:e.target.value})} placeholder="Photo path: /images/candidates/president-john.jpg" style={{padding:8, width:'100%', marginBottom:8}}/>
          <p style={{fontSize:12, color:'#666'}}>1. First upload image to GitHub: public/images/candidates/ <br/>2. Then paste path: /images/candidates/your-file.jpg</p>
          <button onClick={handleAddCandidate} style={{background:'#0d5c5c', color:'#fff', padding:10, width:'100%'}}>{editId? "Update Candidate" : "Add Candidate"}</button>
          {editId && <button onClick={()=>{setEditId(null); setNewCand({name:"", position:"", photo:""})}} style={{marginTop:5, width:'100%'}}>Cancel Edit</button>}
        </div>
      </div>

      {positions.map(pos=>(
        <div key={pos} style={{marginTop:30, border:'1px solid #ddd', padding:15, borderRadius:10}}>
          <h2 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos} - {candidates.filter(c=>c.position===pos).length} candidates</h2>
          {candidates.filter(c=>c.position===pos).map(c=>(
            <div key={c.firebaseId || c.id} style={{display:'flex', alignItems:'center', gap:15, padding:10, borderBottom:'1px solid #eee'}}>
              <img src={c.photo} style={{width:60, height:60, objectFit:'cover', borderRadius:8}}/>
              <div style={{flex:1}}><b>{c.name}</b><br/>{c.photo}<br/><b>{getCount(pos, c.id)} votes</b></div>
              <button onClick={()=>handleEdit(c)} style={{padding:'5px 10px'}}>Edit</button>
              <button onClick={()=>handleDelete(c.firebaseId)} style={{padding:'5px 10px', background:'red', color:'#fff'}}>Delete</button>
            </div>
          ))}
        </div>
      ))}
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
  if(voted) return <div style={{textAlign:'center', marginTop:100}}><h1>✅ Vote Recorded!</h1></div>

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
                <p style={{fontWeight:'bold'}}>{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitAll} style={{marginTop:40, padding:15, width:'100%', background:'#000', color:'#fff', fontSize:18}}>SUBMIT ALL VOTES</button>
    </div>
  )
}

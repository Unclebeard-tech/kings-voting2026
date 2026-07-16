import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { CANDIDATES } from "./candidates.js"

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
  const [totalStudents, setTotalStudents] = useState(0)
  const timerRef = useRef(null)

  const positions = [...new Set(CANDIDATES.map(c => c.position))]

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { handleLogout(); alert("Session expired") }, 5*60*1000)
  }
  useEffect(()=>{ if(loggedIn){ resetTimer(); window.addEventListener('mousemove', resetTimer); window.addEventListener('keydown', resetTimer); return ()=>{ clearTimeout(timerRef.current); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer)} } },[loggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = studentId.trim().padStart(3,'0')
    setLoading(true); setMessage("")
    try {
      const sSnap = await getDoc(doc(db,'students',id))
      if(!sSnap.exists()){ setMessage(`Invalid Student ID`); setLoading(false); return }
      const vSnap = await getDoc(doc(db,'votes',id))
      if(vSnap.exists()){ setMessage(`This ID has already voted`); setLoading(false); return }
      setStudentId(id); setLoggedIn(true)
    } catch(err){ setMessage("Error verifying ID") }
    setLoading(false)
  }

  const handleSubmitAll = async () => {
    if(Object.keys(selections).length!== positions.length){ alert(`Please vote for all positions`); return }
    setLoading(true)
    try {
      await setDoc(doc(db,'votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString() })
      setVoted(true)
      setTimeout(()=>handleLogout(), 4000)
    } catch(e){ setMessage("Failed to submit") }
    setLoading(false)
  }

  const loadResults = async () => {
    if(adminPass!== ADMIN_PASSWORD){ alert("Unauthorized"); return }
    setLoading(true)
    const votesSnap = await getDocs(collection(db,'votes'))
    const votes = votesSnap.docs.map(d=>d.data())
    setVotesData(votes)
    const studentsSnap = await getDocs(collection(db,'students'))
    setTotalStudents(studentsSnap.size)
    setShowAdmin(true)
    setLoading(false)
  }

  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }

  const getCount = (pos, candId) => votesData.filter(v=>v.votes[pos]===candId).length

  if(showAdmin) return (
    <div style={{maxWidth:1100, margin:'20px auto', padding:20, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}><h1>Election Results</h1><button onClick={handleLogout}>Exit</button></div>
      <h3>Total Voted: {votesData.length} / {totalStudents}</h3>
      {positions.map(pos=>(
        <div key={pos} style={{marginTop:30, border:'1px solid #ddd', padding:15, borderRadius:10}}>
          <h2 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos}</h2>
          {CANDIDATES.filter(c=>c.position===pos).map(c=>{
            const count = getCount(pos, c.id)
            const percent = votesData.length? ((count/votesData.length)*100).toFixed(1) : 0
            return (
              <div key={c.id} style={{display:'flex', alignItems:'center', gap:15, padding:10, borderBottom:'1px solid #eee'}}>
                <img src={c.photo} style={{width:60, height:60, objectFit:'cover', borderRadius:8}}/>
                <div style={{flex:1}}><b>{c.name}</b></div>
                <div style={{textAlign:'right'}}><b style={{fontSize:20}}>{count}</b><br/>{percent}%</div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1>The Kings Voting 2026/27</h1>
      <p>Enter your Student ID to vote</p>
      <form onSubmit={handleLogin}>
        <input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Student ID" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/>
        <button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#000', color:'#fff', fontSize:16}}>{loading?'Verifying...':'Login'}</button>
      </form>
      {message && <p style={{color:'red', marginTop:15}}>{message}</p>}

      <div style={{marginTop:60, borderTop:'1px solid #eee', paddingTop:20}}>
        <details>
          <summary style={{cursor:'pointer', fontSize:14, color:'#666'}}>Admin Access</summary>
          <div style={{marginTop:15}}>
            <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" style={{padding:10, width:'100%'}}/>
            <button onClick={loadResults} disabled={loading} style={{marginTop:10, padding:10, width:'100%', background:'#0d5c5c', color:'#fff'}}>{loading?'Loading...':'Access Results'}</button>
          </div>
        </details>
      </div>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100, fontFamily:'sans-serif'}}><h1>✅ Vote Recorded!</h1><p>Thank you</p><p>Logging out...</p></div>

  return (
    <div style={{maxWidth:1000, margin:'20px auto', padding:20, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h2>Voter: {studentId}</h2><button onClick={handleLogout} style={{padding:'8px 15px'}}>Logout</button></div>
      {positions.map(pos => (
        <div key={pos} style={{marginTop:30}}>
          <h3 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos}</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:15}}>
            {CANDIDATES.filter(c=>c.position===pos).map(c=>(
              <div key={c.id} onClick={()=>setSelections({...selections, [pos]:c.id})} style={{border: selections[pos]===c.id? '3px solid #0d5c5c':'1px solid #ddd', padding:10, borderRadius:10, cursor:'pointer', textAlign:'center', background: selections[pos]===c.id? '#f0ffff':'#fff'}}>
                <img src={c.photo} alt={c.name} style={{width:'100%', height:220, objectFit:'cover', borderRadius:8}}/>
                <p style={{fontWeight:'bold', margin:'8px 0 0'}}>{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitAll} disabled={loading} style={{marginTop:40, padding:15, width:'100%', background:'#000', color:'#fff', fontSize:18, cursor:'pointer'}}>{loading?'Submitting...':'SUBMIT ALL VOTES'}</button>
      {message && <p style={{color:'red'}}>{message}</p>}
    </div>
  )
}

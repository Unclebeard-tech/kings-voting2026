import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'

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

// EDIT YOUR CANDIDATES HERE
const CANDIDATES = [
  { id: "c1", name: "Candidate A", photo: "https://via.placeholder.com/150?text=A" },
  { id: "c2", name: "Candidate B", photo: "https://via.placeholder.com/150?text=B" },
  { id: "c3", name: "Candidate C", photo: "https://via.placeholder.com/150?text=C" },
]

export default function App() {
  const [studentId, setStudentId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [candidates, setCandidates] = useState(CANDIDATES)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const timerRef = useRef(null)

  // Auto logout after 5 minutes of no activity
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      handleLogout()
      alert("Session expired - auto logged out after 5 minutes")
    }, 5 * 60 * 1000) // 5 mins
  }

  useEffect(() => {
    if (loggedIn) {
      resetTimer()
      window.addEventListener('mousemove', resetTimer)
      window.addEventListener('keydown', resetTimer)
      return () => {
        clearTimeout(timerRef.current)
        window.removeEventListener('mousemove', resetTimer)
        window.removeEventListener('keydown', resetTimer)
      }
    }
  }, [loggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = studentId.trim().padStart(3, '0')
    if (!id) return

    setLoading(true)
    setMessage("")
    try {
      // Check if student exists 001-200
      const studentRef = doc(db, 'students', id)
      const studentSnap = await getDoc(studentRef)

      if (!studentSnap.exists()) {
        setMessage(`Student ID ${id} is not valid. Use 001-200`)
        setLoading(false)
        return
      }

      // Check if already voted
      const voteRef = doc(db, 'votes', id)
      const voteSnap = await getDoc(voteRef)
      if (voteSnap.exists()) {
        setMessage(`Student ${id} has already voted!`)
        setLoading(false)
        return
      }

      setStudentId(id)
      setLoggedIn(true)
      setMessage("")
    } catch (err) {
      setMessage("Error: " + err.message)
    }
    setLoading(false)
  }

  const handleVote = async (candidateId) => {
    if (!confirm(`Vote for ${candidateId}? You can only vote once!`)) return
    setLoading(true)
    try {
      await setDoc(doc(db, 'votes', studentId), {
        studentId,
        candidateId,
        votedAt: new Date().toISOString()
      })
      setVoted(true)
      setTimeout(() => handleLogout(), 3000)
    } catch (err) {
      setMessage("Vote failed: " + err.message)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    setLoggedIn(false)
    setStudentId("")
    setVoted(false)
    setMessage("")
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  // LOGIN PAGE
  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: '50px auto', padding: 20, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>King's Voting 2026</h1>
        <p>Enter your Student ID (001-200)</p>
        <form onSubmit={handleLogin}>
          <input
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            placeholder="e.g. 001"
            style={{ padding: 12, width: '100%', fontSize: 18, textAlign: 'center', marginBottom: 10 }}
          />
          <button disabled={loading} style={{ padding: '12px 20px', width: '100%', fontSize: 16, background: '#000', color: '#fff', cursor: 'pointer' }}>
            {loading? 'Checking...' : 'Login to Vote'}
          </button>
        </form>
        {message && <p style={{ color: 'red', marginTop: 15 }}>{message}</p>}
      </div>
    )
  }

  // VOTED PAGE
  if (voted) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>✅ Thank you!</h1>
        <p>Your vote has been recorded for Student {studentId}</p>
        <p>Logging out...</p>
      </div>
    )
  }

  // VOTING PAGE
  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Welcome, Student {studentId}</h2>
        <button onClick={handleLogout} style={{ padding: '8px 15px' }}>Logout</button>
      </div>
      <p>Auto logout in 5 mins of inactivity. One vote only.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 30 }}>
        {candidates.map(c => (
          <div key={c.id} style={{ border: '1px solid #ddd', padding: 15, borderRadius: 10, textAlign: 'center' }}>
            <img src={c.photo} alt={c.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} />
            <h3>{c.name}</h3>
            <button disabled={loading} onClick={() => handleVote(c.id)} style={{ padding: '10px 20px', background: '#000', color: '#fff', cursor: 'pointer', width: '100%' }}>
              Vote
            </button>
          </div>
        ))}
      </div>
      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  )
}

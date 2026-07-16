import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { 
  getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc, 
  query, where, serverTimestamp 
} from 'firebase/firestore'

// Your env vars from Netlify
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [candidates, setCandidates] = useState([])
  const [studentId, setStudentId] = useState('')
  const [voucher, setVoucher] = useState('')
  const [grade, setGrade] = useState('')
  const [candidateId, setCandidateId] = useState('')
  const [status, setStatus] = useState('Loading...')
  const [votingOpen, setVotingOpen] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  // Pad ID to 3 digits: 2 -> 002
  const formatId = (val) => {
    const num = val.replace(/\D/g, '').slice(0, 3) // only numbers
    return num
  }

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      // Check if voting is open
      const adminSnap = await getDoc(doc(db, 'settings', 'admin'))
      if (adminSnap.exists()) {
        setVotingOpen(adminSnap.data().votingOpen !== false)
        setStatus(adminSnap.data().electionName || 'School Voting 2026')
      } else {
        setStatus('Kings 2026 Voting')
      }

      // Load candidates
      const candSnap = await getDocs(collection(db, 'candidates'))
      const list = []
      candSnap.forEach(d => list.push({ id: d.id, ...d.data() }))
      setCandidates(list)
    } catch (e) {
      setStatus('Error connecting to Firebase - check Rules')
      console.error(e)
    }
  }

  const handleVote = async (e) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    
    // Normalize IDs to 3 digits
    const paddedStudentId = studentId.padStart(3, '0')
    const paddedVoucher = voucher.padStart(3, '0')
    const sidNum = parseInt(paddedStudentId, 10)

    if (!paddedStudentId || sidNum < 1 || sidNum > 200) {
      return setMessage({ text: 'Student ID must be from 001 to 200', type: 'error' })
    }
    if (!paddedVoucher) {
      return setMessage({ text: 'Please enter your voucher number', type: 'error' })
    }
    if (!grade) {
      return setMessage({ text: 'Please select Grade', type: 'error' })
    }
    if (!candidateId) {
      return setMessage({ text: 'Please select a candidate', type: 'error' })
    }

    setLoading(true)
    try {
      // 1. Check if this Student ID already voted
      const voteQuery = query(collection(db, 'votes'), where('studentId', '==', paddedStudentId))
      const existingVotes = await getDocs(voteQuery)
      if (!existingVotes.empty) {
        setLoading(false)
        return setMessage({ text: `Student ID ${paddedStudentId} has already voted!`, type: 'error' })
      }

      // 2. Check voucher exists and not used
      const voucherRef = doc(db, 'vouchers', paddedVoucher)
      const voucherSnap = await getDoc(voucherRef)
      if (!voucherSnap.exists()) {
        setLoading(false)
        return setMessage({ text: `Voucher ${paddedVoucher} does not exist.`, type: 'error' })
      }
      if (voucherSnap.data().used) {
        setLoading(false)
        return setMessage({ text: `Voucher ${paddedVoucher} already used!`, type: 'error' })
      }

      // 3. Save vote
      await addDoc(collection(db, 'votes'), {
        studentId: paddedStudentId,
        voucher: paddedVoucher,
        grade,
        candidateId,
        timestamp: serverTimestamp()
      })

      // 4. Mark voucher as used
      await updateDoc(voucherRef, {
        used: true,
        usedBy: paddedStudentId,
        usedAt: serverTimestamp()
      })

      // 5. SUCCESS + AUTO LOGOUT
      setMessage({ text: `Thank you! Vote for ${paddedStudentId} recorded. Logging out...`, type: 'success' })
      
      // Clear everything after 3 seconds to avoid next person using same machine
      setTimeout(() => {
        setStudentId('')
        setVoucher('')
        setGrade('')
        setCandidateId('')
        setMessage({ text: '', type: '' })
        setLoading(false)
        window.scrollTo(0, 0) // back to top for next voter
      }, 3000)

    } catch (err) {
      console.error(err)
      setMessage({ text: 'Error: ' + err.message, type: 'error' })
      setLoading(false)
    }
  }

  if (!votingOpen) {
    return (
      <div style={{ maxWidth: 400, margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Voting Closed</h2>
        <p>{status}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '20px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ background: '#f0f7ff', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{status}</h2>
        <small>ID format: 001 to 200 | One voucher = one vote</small>
      </div>

      <form onSubmit={handleVote} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <label>Student ID (001 - 200)</label>
        <input 
          type="text" 
          value={studentId}
          onChange={e => setStudentId(formatId(e.target.value))}
          placeholder="e.g. 002 or 045" 
          required
          style={{ padding: 12, fontSize: 18, letterSpacing: 2 }}
        />

        <label>Voucher Number</label>
        <input 
          type="text" 
          value={voucher}
          onChange={e => setVoucher(formatId(e.target.value))}
          placeholder="Given voucher e.g. 002" 
          required
          style={{ padding: 12, fontSize: 18, letterSpacing: 2 }}
        />

        <label>Grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value)} required style={{ padding: 12, fontSize: 16 }}>
          <option value="">Select Grade</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>
          ))}
        </select>

        <label>Select Candidate</label>
        <select value={candidateId} onChange={e => setCandidateId(e.target.value)} required style={{ padding: 12, fontSize: 16 }}>
          <option value="">Choose...</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name} - {c.position}</option>
          ))}
        </select>

        <button type="submit" disabled={loading} style={{ padding: 14, background: loading ? '#ccc' : '#0a58ca', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, marginTop: 10 }}>
          {loading ? 'Submitting...' : 'Submit Vote'}
        </button>

        {message.text && (
          <div style={{ padding: 12, borderRadius: 8, background: message.type === 'error' ? '#ffe0e0' : '#d4edda', color: message.type === 'error' ? '#a00' : '#155724', textAlign: 'center', fontWeight: 'bold' }}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}

export default App

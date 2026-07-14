import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyAnlNl3l0Uq8Nl4Z8K9J7H6G5F4D3S2A1Q",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function VotingPage() {
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [step, setStep] = useState('login');
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const posSnap = await getDocs(collection(db, 'positions'));
      setPositions(posSnap.docs.map(d => ({ id: d.id,...d.data() })).sort((a,b) => a.order - b.order));
      const candSnap = await getDocs(collection(db, 'candidates'));
      setCandidates(candSnap.docs.map(d => ({ id: d.id,...d.data() })));
    };
    fetchData();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(studentId)) {
      setError('Student ID must be exactly 10 digits');
      return;
    }
    if (!grade) {
      setError('Please select your grade');
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'students'), { studentId, grade, createdAt: new Date() });
      } else {
        const data = snap.docs[0].data();
        if (data.hasVoted) {
          setError('This Student ID has already voted');
          setLoading(false);
          return;
        }
      }
      setStep('vote');
    } catch (err) {
      setError('Error checking ID. Check Firestore Rules.');
    }
    setLoading(false);
  };

  const submitVote = async () => {
    if (Object.keys(votes).length!== positions.length) {
      setError('Please vote for all positions');
      return;
    }
    setLoading(true);
    try {
      for (let positionId in votes) {
        await addDoc(collection(db, 'votes'), {
          studentId, positionId, candidateId: votes[positionId], grade, timestamp: new Date()
        });
      }
      const q = query(collection(db, 'students'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const studentRef = doc(db, 'students', snap.docs[0].id);
        await updateDoc(studentRef, { hasVoted: true });
      }
      setStep('done');
    } catch (e) {
      setError('Error submitting vote. Try again.');
    }
    setLoading(false);
  };

  if (step === 'done') return (
    <div className="container">
      <h1>Thank You!</h1>
      <p>Your vote has been recorded successfully.</p>
      <p>Results will be announced by the administration.</p>
    </div>
  );

  if (step === 'vote') return (
    <div className="container">
      <h1>The Kings Learning Academy - Voting 2026</h1>
      <p><b>Student ID:</b> {studentId} | <b>Grade:</b> {grade}</p>
      {positions.map(pos => (
        <div key={pos.id} className="position">
          <h2>{pos.title}</h2>
          {candidates.filter(c => c.positionId === pos.id).map(cand => (
            <div key={cand.id} className="candidate">
              <label>
                <input type="radio" name={pos.id} value={cand.id}
                  onChange={() => setVotes({...votes, [pos.id]: cand.id})} /> {cand.name}
              </label>
            </div>
          ))}
        </div>
      ))}
      {error && <p className="error">{error}</p>}
      <button onClick={submitVote} disabled={loading}>{loading? 'Submitting...' : 'Submit Votes'}</button>
    </div>
  );

  return (
    <div className="container">
      <h1>The Kings Learning Academy</h1>
      <h2>Voting 2026 - Student Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Enter 10-digit Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} maxLength={10} required />
        <select value={grade} onChange={e => setGrade(e.target.value)} required>
          <option value="">Select Grade</option>
          {Array.from({length:12}, (_,i) => <option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>)}
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>{loading? 'Checking...' : 'Start Voting'}</button>
      </form>
      <p><a href="/admin">Admin Login</a></p>
    </div>
  );
}

function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState('');
  const [results, setResults] = useState([]);

  const fetchResults = async () => {
    const posSnap = await getDocs(collection(db, 'positions'));
    const positions = posSnap.docs.map(d => ({ id: d.id,...d.data() }));
    const candSnap = await getDocs(collection(db, 'candidates'));
    const candidates = candSnap.docs.map(d => ({ id: d.id,...d.data() }));
    const voteSnap = await getDocs(collection(db, 'votes'));
    const votes = voteSnap.docs.map(d => d.data());
    const data = positions.map(pos => {
      const cands = candidates.filter(c => c.positionId === pos.id).map(c => {
        const count = votes.filter(v => v.candidateId === c.id).length;
        return { name: c.name, votes: count };
      });
      return { position: pos.title, candidates: cands };
    });
    setResults(data);
  };

  useEffect(() => { if (auth) fetchResults(); }, [auth]);

  if (!auth) return (
    <div className="container">
      <h1>Admin Login</h1>
      <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
      <button onClick={() => pass === 'admin123'? setAuth(true) : alert('Wrong password')}>Login</button>
    </div>
  );

  return (
    <div className="container" style={{maxWidth: '900px'}}>
      <h1>Election Results - Live</h1>
      <button onClick={fetchResults}>Refresh Results</button>
      {results.map((r,i) => (
        <div key={i} style={{margin: '30px 0'}}>
          <h2>{r.position}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={r.candidates}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="votes" fill="#1976d2" /></BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VotingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

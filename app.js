import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './style.css';

// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function VotingPage() {
  const [step, setStep] = useState('login');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [error, setError] = useState('');
  const [votingOpen, setVotingOpen] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const settingsDoc = await getDoc(doc(db, 'settings', 'admin'));
    if (settingsDoc.exists()) setVotingOpen(settingsDoc.data().votingOpen);
    
    const posSnap = await getDocs(collection(db, 'positions'));
    setPositions(posSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.order - b.order));
    
    const candSnap = await getDocs(collection(db, 'candidates'));
    setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleLogin = async () => {
    setError('');
    if (!/^\d{10}$/.test(studentId)) return setError('Student ID must be exactly 10 digits');
    if (!grade) return setError('Please select your grade');
    if (!votingOpen) return setError('Voting is currently closed');

    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (studentDoc.exists() && studentDoc.data().hasVoted) {
      return setError('This Student ID has already voted');
    }
    setStep('vote');
  };

  const submitVote = async () => {
    if (Object.keys(votes).length !== positions.length) {
      return setError('Please vote for all positions');
    }
    
    await setDoc(doc(db, 'students', studentId), {
      studentId, grade, hasVoted: true, votedAt: new Date()
    });

    for (let positionId in votes) {
      await addDoc(collection(db, 'votes'), {
        studentId, positionId, candidateId: votes[positionId], grade, timestamp: new Date()
      });
    }
    setStep('done');
  };

  if (step === 'done') return <div className="container"><h1>Thank You!</h1><p>Your vote has been recorded.</p></div>;

  if (step === 'vote') return (
    <div className="container">
      <h1>King's College Budo Elections 2026</h1>
      <p>ID: {studentId} | Grade: {grade}</p>
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
      {error && <div className="error">{error}</div>}
      <button onClick={submitVote}>Submit Vote</button>
    </div>
  );

  return (
    <div className="container">
      <h1>King's College Budo Voting</h1>
      <input placeholder="Enter 10-digit Student ID" value={studentId} 
        onChange={e => setStudentId(e.target.value)} maxLength={10} />
      <select value={grade} onChange={e => setGrade(e.target.value)}>
        <option value="">Select Your Grade</option>
        {[...Array(12)].map((_, i) => (
          <option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>
        ))}
      </select>
      {error && <div className="error">{error}</div>}
      <button onClick={handleLogin}>Start Voting</button>
    </div>
  );
}

function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState({});
  const [positions, setPositions] = useState([]);

  const login = () => {
    if (password === 'admin123') { setAuthed(true); loadResults(); } 
    else alert('Wrong password');
  };

  const loadResults = async () => {
    const posSnap = await getDocs(collection(db, 'positions'));
    const pos = posSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.order - b.order);
    setPositions(pos);

    const candSnap = await getDocs(collection(db, 'candidates'));
    const cands = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const votesSnap = await getDocs(collection(db, 'votes'));
    const voteData = votesSnap.docs.map(d => d.data());
    
    const res = {};
    pos.forEach(p => {
      res[p.id] = cands.filter(c => c.positionId === p.id).map(c => ({
        name: c.name,
        votes: voteData.filter(v => v.candidateId === c.id).length
      }));
    });
    setResults(res);
  };

  if (!authed) return (
    <div className="container">
      <h1>Admin Login</h1>
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>Live Results Dashboard</h1>
      <button onClick={loadResults}>Refresh Results</button>
      {positions.map(pos => (
        <div key={pos.id} style={{ margin: '40px 0', background: 'white', padding: 20, borderRadius: 8 }}>
          <h2>{pos.title}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results[pos.id] || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votes" fill="#1976d2" />
            </BarChart>
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

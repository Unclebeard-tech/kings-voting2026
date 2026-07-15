import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
    if (!grade) { setError('Please select your grade'); return; }
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'students'), { studentId, grade, createdAt: new Date() });
      } else if (snap.docs[0].data().hasVoted) {
        setError('This Student ID has already voted'); setLoading(false); return;
      }
      setStep('vote');
    } catch { setError('Error checking ID.'); }
    setLoading(false);
  };

  const submitVote = async () => {
    if (Object.keys(votes).length !== positions.length) { setError('Please vote for all positions'); return; }
    setLoading(true);
    try {
      for (let positionId in votes) {
        await addDoc(collection(db, 'votes'), { studentId, positionId, candidateId: votes[positionId], grade, timestamp: new Date() });
      }
      const q = query(collection(db, 'students'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      if (!snap.empty) await updateDoc(doc(db, 'students', snap.docs[0].id), { hasVoted: true });
      setStep('done');
    } catch { setError('Error submitting vote.'); }
    setLoading(false);
  };

  if (step === 'done') return <div className="container"><h1>Thank You!</h1><p>Your vote is recorded.</p></div>;

  if (step === 'vote') return (
    <div className="container">
      <h1>The Kings Learning Academy - Voting 2026</h1>
      <p><b>ID:</b> {studentId} | <b>Grade:</b> {grade}</p>
      {positions.map(pos => (
        <div key={pos.id} style={{border:'1px solid #ddd', padding:'15px', margin:'15px 0', borderRadius:'8px'}}>
          <h2>{pos.title}</h2>
          {candidates.filter(c => c.positionId === pos.id).map(cand => (
            <div key={cand.id} style={{display:'flex', alignItems:'center', gap:'10px', margin:'8px 0'}}>
              {cand.photoUrl && <img src={cand.photoUrl} alt={cand.name} style={{width:'50px', height:'50px', borderRadius:'50%', objectFit:'cover'}} onError={e=>e.target.style.display='none'} />}
              <label><input type="radio" name={pos.id} value={cand.id} onChange={() => setVotes({...votes, [pos.id]: cand.id})} /> {cand.name}</label>
            </div>
          ))}
        </div>
      ))}
      {error && <p style={{color:'red'}}>{error}</p>}
      <button onClick={submitVote} disabled={loading}>{loading? 'Submitting...' : 'Submit Votes'}</button>
    </div>
  );

  return (
    <div className="container">
      <h1>The Kings Learning Academy</h1>
      <h2>Voting 2026 - Student Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="10-digit Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} maxLength={10} required />
        <select value={grade} onChange={e => setGrade(e.target.value)} required>
          <option value="">Select Grade</option>
          {Array.from({length:12}, (_,i) => <option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>)}
        </select>
        {error && <p style={{color

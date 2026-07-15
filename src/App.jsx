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
    if (Object.keys(votes).length!== positions.length) { setError('Please vote for all positions'); return; }
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
        {error && <p style={{color:'red'}}>{error}</p>}
        <button type="submit" disabled={loading}>{loading? 'Checking...' : 'Start Voting'}</button>
      </form>
      <p><a href="/admin">Admin Login</a></p>
    </div>
  );
}

function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState('');
  const [tab, setTab] = useState('candidates');
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [results, setResults] = useState([]);
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newCand, setNewCand] = useState({ name: '', positionId: '', photoUrl: '' });

  const loadAll = async () => {
    const posSnap = await getDocs(collection(db, 'positions'));
    const posData = posSnap.docs.map(d => ({ id: d.id,...d.data() })).sort((a,b)=>a.order-b.order);
    setPositions(posData);
    const candSnap = await getDocs(collection(db, 'candidates'));
    const candData = candSnap.docs.map(d => ({ id: d.id,...d.data() }));
    setCandidates(candData);
    const voteSnap = await getDocs(collection(db, 'votes'));
    const votes = voteSnap.docs.map(d => d.data());
    setResults(posData.map(pos => ({
      position: pos.title,
      candidates: candData.filter(c=>c.positionId===pos.id).map(c=>({ name: c.name, votes: votes.filter(v=>v.candidateId===c.id).length }))
    })));
  };

  useEffect(()=>{ if(auth) loadAll(); }, [auth]);

  const addPosition = async () => {
    if(!newPosTitle.trim()) return;
    await addDoc(collection(db, 'positions'), { title: newPosTitle.trim(), order: positions.length+1 });
    setNewPosTitle(''); loadAll();
  };
  const deletePosition = async (id) => {
    if(!confirm('Delete this position?')) return;
    await deleteDoc(doc(db, 'positions', id)); loadAll();
  };
  const addCandidate = async (e) => {
    e.preventDefault();
    if(!newCand.name ||!newCand.positionId) return alert('Name + Position required');
    await addDoc(collection(db, 'candidates'), {...newCand, name: newCand.name.trim(), createdAt: new Date() });
    setNewCand({ name: '', positionId: '', photoUrl: '' }); loadAll();
  };
  const deleteCandidate = async (id) => { if(!confirm('Delete?')) return; await deleteDoc(doc(db, 'candidates', id)); loadAll(); };

  if(!auth) return <div className="container"><h1>Admin Login</h1><input type="password" value={pass} onChange={e=>setPass(e.target.value)} /><button onClick={()=> pass==='admin123'?setAuth(true):alert('Wrong')}>Login</button></div>;

  return (
    <div className="container" style={{maxWidth:'1000px'}}>
      <h1>Admin Portal</h1>
      <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
        <button onClick={()=>setTab('candidates')} style={{background:tab==='candidates'?'#1976d2':'#eee', color:tab==='candidates'?'white':'black'}}>Candidates</button>
        <button onClick={()=>setTab('positions')} style={{background:tab==='positions'?'#1976d2':'#eee'}}>Positions</button>
        <button onClick={()=>setTab('results')} style={{background:tab==='results'?'#1976d2':'#eee'}}>Results</button>
      </div>

      {tab==='positions' && <>
        <h2>Add Missing Positions</h2>
        <p>Type: <b>Academics Minister</b> and <b>Health Minister</b> then Add</p>
        <div style={{display:'flex', gap:'10px'}}><input value={newPosTitle} onChange={e=>setNewPosTitle(e.target.value)} placeholder="e.g. Health Minister" style={{flex:1, padding:'8px'}} /><button onClick={addPosition}>Add Position</button></div>
        <ul>{positions.map(p=><li key={p.id} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', padding:'8px'}}>{p.title} <button onClick={()=>deletePosition(p.id)} style={{color:'red'}}>Delete</button></li>)}</ul>
      </>}

      {tab==='candidates' && <>
        <h2>Add Candidates (No Storage Needed)</h2>
        <form onSubmit={addCandidate} style={{border:'1px solid #ddd', padding:'15px', borderRadius:'8px'}}>
          <input placeholder="Candidate Full Name" value={newCand.name} onChange={e=>setNewCand({...newCand, name:e.target.value})} required style={{width:'100%', padding:'8px', marginBottom:'8px'}} />
          <select value={newCand.positionId} onChange={e=>setNewCand({...newCand, positionId:e.target.value})} required style={{width:'100%', padding:'8px', marginBottom:'8px'}}>
            <option value="">-- Select Position --</option>
            {positions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input placeholder="Photo path e.g. /images/candidates/john.jpg (optional for now)" value={newCand.photoUrl} onChange={e=>setNewCand({...newCand, photoUrl:e.target.value})} style={{width:'100%', padding:'8px', marginBottom:'8px'}} />
          <small>You can leave photo empty now and edit later after you drop pics in public/images/candidates/</small><br/><br/>
          <button type="submit">Add Candidate</button>
        </form>

        <div style={{marginTop:'20px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'10px'}}>
          {candidates.map(c=><div key={c.id} style={{border:'1px solid #ddd', padding:'8px', borderRadius:'6px'}}>
            {c.photoUrl && <img src={c.photoUrl} alt={c.name} style={{width:'100%', height:'100px', objectFit:'cover'}} onError={e=>e.target.style.display='none'} />}
            <b>{c.name}</b><br/><small>{positions.find(p=>p.id===c.positionId)?.title}</small><br/>
            <button onClick={()=>deleteCandidate(c.id)} style={{color:'red', fontSize:'12px'}}>Delete</button>
          </div>)}
        </div>
      </>}

      {tab==='results' && results.map((r,i)=><div key={i}><h2>{r.position}</h2><ResponsiveContainer width="100%" height={200}><BarChart data={r.candidates}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="votes" fill="#1976d2" /></BarChart></ResponsiveContainer></div>)}
    </div>
  );
}

function App() {
  return <BrowserRouter><Routes><Route path="/" element={<VotingPage />} /><Route path="/admin" element={<AdminPage />} /></Routes></BrowserRouter>;
}
export default App;

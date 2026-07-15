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

function Logo() {
  return <img src="/images/kings-logo.jpg" alt="Kings Logo" style={{width:'130px', height:'130px', objectFit:'contain', margin:'10px auto', display:'block', borderRadius:'12px'}} onError={e=>{e.target.style.display='none'; console.log('LOGO NOT FOUND at /images/kings-logo.jpg')}} />;
}

const DEFAULT_POSITIONS = ["PRESIDENT","SPEAKER","ACADEMICS MINISTER","HEALTH MINISTER","TIME KEEPER","WELFARE MINISTER","CO-CIRRICULAR MINISTER","INFORMATION MINISTER","EVENTS MINISTER"];

const DEFAULT_CANDIDATES = [
  { name: "AKAMPA JOSIAH", position: "TIME KEEPER", photo: "/images/candidates/time-keeper-akampa-josiah.jpg" },
  { name: "AVIEL NTALE KIRABO", position: "HEALTH MINISTER", photo: "/images/candidates/health-aviel-ntale-kirabo.jpg" },
  { name: "DENISE UWERA NKANIKA", position: "PRESIDENT", photo: "/images/candidates/president-denise-uwera-nkanika.jpg" },
  { name: "KLAUS SSENYANGE", position: "WELFARE MINISTER", photo: "/images/candidates/welfare-klaus-ssenyange.jpg" },
  { name: "ELIJAH MANZI", position: "HEALTH MINISTER", photo: "/images/candidates/health-elijah-manzi.jpg" },
  { name: "ERNEST KIGGUNDU SSENGERO", position: "INFORMATION MINISTER", photo: "/images/candidates/information-ernest-kiggundu-ssengero.jpg" },
  { name: "EMMANUELLA FAVOUR ANYARA", position: "SPEAKER", photo: "/images/candidates/speaker-emmanuella-favour-anyara.jpg" },
  { name: "JANICE NOELINE OTEKA", position: "HEALTH MINISTER", photo: "/images/candidates/health-janice-noeline-oteka.jpg" },
  { name: "JEREMIAH ALINANGE", position: "ACADEMICS MINISTER", photo: "/images/candidates/academics-jeremiah-alinange.jpg" },
  { name: "JEREMIAH KIBUUKA KIRABO", position: "HEALTH MINISTER", photo: "/images/candidates/health-jeremiah-kibuuka-kirabo.jpg" },
  { name: "JOSHUA GATAMA", position: "SPEAKER", photo: "/images/candidates/speaker-joshua-gatama.jpg" },
  { name: "JOSIAH AKORAGYE", position: "TIME KEEPER", photo: "/images/candidates/time-keeper-josiah-akoragye.jpg" },
  { name: "JOTHAM KABUGO MWESIGWA", position: "CO-CIRRICULAR MINISTER", photo: "/images/candidates/co-curricular-jotham-kabugo-mwesigwa.jpg" },
  { name: "KRISTIAN BARNABAS MWESIGWA", position: "PRESIDENT", photo: "/images/candidates/president-kristian-barnabas-mwesigwa.jpg" },
  { name: "KULIET MICHELLE DANDE", position: "PRESIDENT", photo: "/images/candidates/president-kuliet-michelle-dande.jpg" },
  { name: "MAKTOUM KASULE", position: "WELFARE MINISTER", photo: "/images/candidates/welfare-maktoum-kasule.jpg" },
  { name: "MALAIKA VANNESSA NIMUSIIMA", position: "HEALTH MINISTER", photo: "/images/candidates/health-malaika-vannessa-nimusiima.jpg" },
  { name: "MARTHA NATUKUNDA", position: "WELFARE MINISTER", photo: "/images/candidates/welfare-martha-natukunda.jpg" },
  { name: "MARVEL MORGAN MULAYI", position: "EVENTS MINISTER", photo: "/images/candidates/events-marvel-morgan-mulayi.jpg" },
  { name: "NYANGOMA JAZMINE", position: "SPEAKER", photo: "/images/candidates/speaker-nyangoma-jazmine.jpg" },
  { name: "OTIM JEREMIAH OPOLLO", position: "WELFARE MINISTER", photo: "/images/candidates/welfare-otim-jeremiah-opollo.jpg" },
  { name: "PHILLIP BENJAMIN KISUBI", position: "TIME KEEPER", photo: "/images/candidates/time-keeper-phillip-benjamin-kisubi.jpg" },
  { name: "SHEMAIAH ETHAN WAMBOKO", position: "EVENTS MINISTER", photo: "/images/candidates/events-shemaiah-ethan-wamboko.jpg" },
  { name: "SKYLA KIWUMULO MUWONGE", position: "TIME KEEPER", photo: "/images/candidates/time-keeper-skyla-kiwumulo.jpg" },
  { name: "THEODEN MUHUMUZA", position: "CO-CIRRICULAR MINISTER", photo: "/images/candidates/co-curricular-theoden-muhumuza.jpg" },
  { name: "TIMOTHY ENOCH MWESIGWA", position: "ACADEMICS MINISTER", photo: "/images/candidates/academics-timothy-enoch-mwesigwa.jpg" },
  { name: "TIMOTHY PRICE KISUBI", position: "CO-CIRRICULAR MINISTER", photo: "/images/candidates/co-curricular-timothy-price-kisubi.jpg" },
  { name: "TWESIGYE MARY", position: "INFORMATION MINISTER", photo: "/images/candidates/information-twesigye-mary.jpg" },
];

function VotingPage() {
  const [studentId, setStudentId] = useState(''); const [grade, setGrade] = useState(''); const [step, setStep] = useState('login');
  const [positions, setPositions] = useState([]); const [candidates, setCandidates] = useState([]); const [votes, setVotes] = useState({});
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { (async()=>{ const p=await getDocs(collection(db,'positions')); setPositions(p.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.order-b.order)); const c=await getDocs(collection(db,'candidates')); setCandidates(c.docs.map(d=>({id:d.id,...d.data()}))); })(); }, []);
  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); if (!/^\d{10}$/.test(studentId)) { setError('ID must be 10 digits'); return; } if (!grade) { setError('Select grade'); return; }
    setLoading(true); try { const q=query(collection(db,'students'), where('studentId','==',studentId)); const s=await getDocs(q); if(s.empty){ await addDoc(collection(db,'students'),{studentId,grade,createdAt:new Date()}); } else if(s.docs[0].data().hasVoted){ setError('This ID already voted'); setLoading(false); return; } setStep('vote'); } catch{ setError('Error'); } setLoading(false);
  };
  const submitVote = async () => {
    if (Object.keys(votes).length!== positions.length) { setError(`Vote for ALL ${positions.length} positions`); return; }
    setLoading(true); try { for(let pid in votes) await addDoc(collection(db,'votes'),{studentId,positionId:pid,candidateId:votes[pid],grade,timestamp:new Date()}); const q=query(collection(db,'students'), where('studentId','==',studentId)); const s=await getDocs(q); if(!s.empty) await updateDoc(doc(db,'students',s.docs[0].id),{hasVoted:true}); setStep('done'); } catch{ setError('Submit failed'); } setLoading(false);
  };
  if (step==='done') return <div style={{textAlign:'center', padding:'50px'}}><Logo/><h1>Thank You!</h1><p>Your vote for 2026/27 is recorded.</p></div>;
  if (step==='vote') return (
    <div style={{maxWidth:'1000px', margin:'0 auto', padding:'20px'}}>
      <Logo/><h1 style={{textAlign:'center'}}>The Kings Learning Academy - Voting 2026/27</h1><p style={{textAlign:'center'}}><b>ID:</b> {studentId} | <b>Grade:</b> {grade}</p>
      {positions.map(pos=>(
        <div key={pos.id} style={{border:'1px solid #ddd', padding:'15px', margin:'20px 0', borderRadius:'12px', background:'white'}}>
          <h2 style={{background:'#0f766e', color:'white', padding:'10px 15px', borderRadius:'8px', margin:0}}>{pos.title}</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'15px', marginTop:'15px'}}>
            {candidates.filter(c=>c.positionId===pos.id).map(cand=>(
              <label key={cand.id} style={{border: votes[pos.id]===cand.id ? '3px solid #0f766e':'1px solid #eee', borderRadius:'12px', padding:'10px', cursor:'pointer', textAlign:'center', background: votes[pos.id]===cand.id ? '#f0fdfa':'white'}}>
                <img src={cand.photoUrl} alt={cand.name} style={{width:'100%', height:'200px', objectFit:'cover', borderRadius:'8px', background:'#f3f4f6'}} onError={e=>{e.target.style.border='2px solid red'; e.target.alt='IMAGE NOT FOUND: '+cand.photoUrl; console.log('FAILED IMAGE', cand.photoUrl)}} />
                <div style={{fontWeight:'bold', marginTop:'8px', fontSize:'13px'}}>{cand.name}</div>
                <div style={{fontSize:'10px', color:'#666', wordBreak:'break-all'}}>{cand.photoUrl}</div>
                <input type="radio" name={pos.id} checked={votes[pos.id]===cand.id} onChange={()=>setVotes({...votes,[pos.id]:cand.id})} style={{marginTop:'8px'}} /> Vote
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <p style={{color:'red', textAlign:'center', fontWeight:'bold'}}>{error}</p>}
      <button onClick={submitVote} disabled={loading} style={{width:'100%', padding:'16px', background:'#0f766e', color:'white', border:'none', borderRadius:'10px', fontSize:'18px', fontWeight:'bold'}}>{loading? 'Submitting...' : `Submit All ${positions.length} Votes`}</button>
    </div>
  );
  return (
    <div style={{maxWidth:'400px', margin:'60px auto', textAlign:'center', padding:'20px'}}>
      <Logo/><h1>The Kings Learning Academy</h1><h3>Voting 2026/27</h3>
      <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px', marginTop:'20px'}}>
        <input type="text" placeholder="10-digit Student ID" value={studentId} onChange={e=>setStudentId(e.target.value)} maxLength={10} required style={{padding:'12px', borderRadius:'8px', border:'1px solid #ccc'}} />
        <select value={grade} onChange={e=>setGrade(e.target.value)} required style={{padding:'12px', borderRadius:'8px'}}><option value="">Select Grade</option>{Array.from({length:12},(_,i)=><option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>)}</select>
        {error && <p style={{color:'red'}}>{error}</p>}
        <button type="submit" disabled={loading} style={{padding:'12px', background:'#0f766e', color:'white', border:'none', borderRadius:'8px'}}>{loading? 'Checking...' : 'Start Voting'}</button>
      </form><p style={{marginTop:'20px'}}><a href="/admin">Admin Login</a></p>
    </div>
  );
}

function AdminPage() {
  const [auth,setAuth]=useState(false); const [pass,setPass]=useState(''); const [tab,setTab]=useState('candidates'); const [positions,setPositions]=useState([]); const [candidates,setCandidates]=useState([]); const [results,setResults]=useState([]);
  const [newPosTitle,setNewPosTitle]=useState(''); const [newCand,setNewCand]=useState({name:'',positionId:'',photoUrl:''});
  const loadAll = async () => {
    const posSnap=await getDocs(collection(db,'positions')); const posData=posSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.order-b.order); setPositions(posData);
    const candSnap=await getDocs(collection(db,'candidates')); const candData=candSnap.docs.map(d=>({id:d.id,...d.data()})); setCandidates(candData);
    const voteSnap=await getDocs(collection(db,'votes')); const votes=voteSnap.docs.map(d=>d.data());
    setResults(posData.map(pos=>({position:pos.title, candidates:candData.filter(c=>c.positionId===pos.id).map(c=>({name:c.name, votes:votes.filter(v=>v.candidateId===c.id).length}))})));
  };
  useEffect(()=>{ if(auth) loadAll(); },[auth]);
  const seedDefaults = async () => {
    if(!confirm(`Seed all ${DEFAULT_CANDIDATES.length} candidates? This will create ${DEFAULT_POSITIONS.length} positions`)) return;
    let posMap={};
    for(let i=0;i<DEFAULT_POSITIONS.length;i++){
      const title=DEFAULT_POSITIONS[i]; const ex=positions.find(p=>p.title.toUpperCase()===title); if(ex){posMap[title]=ex.id; continue;}
      const ref=await addDoc(collection(db,'positions'),{title,order:i+1}); posMap[title]=ref.id;
    }
    const fresh=await getDocs(collection(db,'positions')); fresh.docs.forEach(d=>{ posMap[d.data().title.toUpperCase()]=d.id; });
    let added=0;
    for(let c of DEFAULT_CANDIDATES){
      if(candidates.find(x=>x.name.toUpperCase()===c.name.toUpperCase())) continue;
      const pid=posMap[c.position]||posMap[c.position.toUpperCase()]; if(!pid) continue;
      await addDoc(collection(db,'candidates'),{name:c.name, positionId:pid, photoUrl:c.photo, createdAt:new Date()}); added++;
    }
    alert(`Done! Added ${added} new candidates.`); loadAll();
  };
  const resetAllVotes = async () => {
    const c1=prompt("Type RESET to DELETE ALL VOTES permanently"); if(c1!=="RESET") return; if(!confirm("REALLY sure? Cannot undo.")) return;
    try{ const vs=await getDocs(collection(db,'votes')); for(let d of vs.docs) await deleteDoc(doc(db,'votes',d.id)); const ss=await getDocs(collection(db,'students')); for(let d of ss.docs) await updateDoc(doc(db,'students',d.id),{hasVoted:false}); alert("All votes reset! Students can vote again."); loadAll(); } catch(err){ alert("Failed: "+err.message); }
  };
  const deleteAllCandidates = async () => {
    if(!confirm("DELETE ALL CANDIDATES from Firebase? Then you must re-seed.")) return;
    const c2=prompt("Type DELETE to confirm"); if(c2!=="DELETE") return;
    try{ const cs=await getDocs(collection(db,'candidates')); for(let d of cs.docs) await deleteDoc(doc(db,'candidates',d.id)); alert(`Deleted ${cs.docs.length} candidates. Now click SEED button.`); loadAll(); } catch(e){ alert(e.message); }
  };
  const addPosition=async()=>{ if(!newPosTitle.trim()) return; await addDoc(collection(db,'positions'),{title:newPosTitle.trim().toUpperCase(),order:positions.length+1}); setNewPosTitle(''); loadAll(); };
  const deletePosition=async(id)=>{ if(!confirm('Delete position?')) return; await deleteDoc(doc(db,'positions',id)); loadAll(); };
  const addCandidate=async(e)=>{ e.preventDefault(); if(!newCand.name||!newCand.positionId) return alert('Name+Position needed'); await addDoc(collection(db,'candidates'),{...newCand,name:newCand.name.trim().toUpperCase(),createdAt:new Date()}); setNewCand({name:'',positionId:'',photoUrl:''}); loadAll(); };
  const deleteCandidate=async(id)=>{ if(!confirm('Delete candidate?')) return; await deleteDoc(doc(db,'candidates',id)); loadAll(); };
  if(!auth) return <div style={{maxWidth:'400px', margin:'60px auto', textAlign:'center'}}><Logo/><h1>Admin Login</h1><input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%', padding:'12px'}} /><button onClick={()=> pass==='admin123'?setAuth(true):alert('Wrong password')} style={{width:'100%', marginTop:'12px', padding:'12px', background:'#0f766e', color:'white', border:'none', borderRadius:'8px'}}>Login</button></div>;
  return (
    <div style={{maxWidth:'1200px', margin:'0 auto', padding:'20px'}}>
      <div style={{display:'flex', alignItems:'center', gap:'15px'}}><Logo/><h1>Admin Portal - Kings 2026/27 - {candidates.length} Candidates</h1></div>
      <div style={{background:'#ecfdf5', border:'1px solid #0f766e', padding:'10px', borderRadius:'8px', margin:'10px 0'}}>Test images: <a href="/images/kings-logo.jpg" target="_blank">/images/kings-logo.jpg</a> | <a href="/images/candidates/president-denise-uwera-nkanika.jpg" target="_blank">Test President Photo</a> - If these 2 links show images, GitHub is OK. If 404, wait for Netlify deploy.</div>
      <div style={{display:'flex', gap:'10px', margin:'20px 0', flexWrap:'wrap'}}>
        <button onClick={()=>setTab('candidates')} style={{background:tab==='candidates'?'#0f766e':'#eee', color:tab==='candidates'?'white':'black', padding:'10px 15px', border:'none', borderRadius:'6px'}}>Candidates ({candidates.length})</button>
        <button onClick={()=>setTab('positions')} style={{background:tab==='positions'?'#0f766e':'#eee', padding:'10px 15px', border:'none', borderRadius:'6px'}}>Positions ({positions.length})</button>
        <button onClick={()=>setTab('results')} style={{background:tab==='results'?'#0f766e':'#eee', padding:'10px 15px', border:'none', borderRadius:'6px'}}>Results</button>
        <button onClick={seedDefaults} style={{background:'#f59e0b', color:'white', padding:'12px 18px', border:'none', borderRadius:'6px', marginLeft:'auto', fontWeight:'bold'}}>⚡ ONE-CLICK: Seed All 28</button>
        <button onClick={deleteAllCandidates} style={{background:'#7c3aed', color:'white', padding:'12px 18px', border:'none', borderRadius:'6px', fontWeight:'bold'}}>🗑️ DELETE ALL CANDIDATES</button>
        <button onClick={resetAllVotes} style={{background:'red', color:'white', padding:'12px 18px', border:'none', borderRadius:'6px', fontWeight:'bold'}}>RESET VOTES</button>
      </div>
      {tab==='positions' && <><h2>Positions</h2><div style={{display:'flex', gap:'10px'}}><input value={newPosTitle} onChange={e=>setNewPosTitle(e.target.value)} placeholder="e.g. Health Minister" style={{flex:1, padding:'10px'}} /><button onClick={addPosition} style={{padding:'10px 20px', background:'#0f766e', color:'white', border:'none', borderRadius:'6px'}}>Add</button></div><ul style={{marginTop:'15px'}}>{positions.map(p=><li key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid #eee'}}>{p.title}<button onClick={()=>deletePosition(p.id)} style={{color:'red', background:'none', border:'none'}}>Delete</button></li>)}</ul></>}
      {tab==='candidates' && <>
        <form onSubmit={addCandidate} style={{border:'1px solid #ddd', padding:'15px', borderRadius:'10px', background:'#f9fafb', marginBottom:'20px'}}>
          <h3>Add Single Candidate</h3>
          <input placeholder="Full Name" value={newCand.name} onChange={e=>setNewCand({...newCand,name:e.target.value})} required style={{width:'100%', padding:'10px', marginBottom:'10px'}} />
          <select value={newCand.positionId} onChange={e=>setNewCand({...newCand,positionId:e.target.value})} required style={{width:'100%', padding:'10px', marginBottom:'10px'}}><option value="">Select Position</option>{positions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
          <input placeholder="/images/candidates/photo.jpg" value={newCand.photoUrl} onChange={e=>setNewCand({...newCand,photoUrl:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px'}} />
          <button type="submit" style={{padding:'10px 20px', background:'#0f766e', color:'white', border:'none', borderRadius:'6px'}}>Add Candidate</button>
        </form>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'15px'}}>
          {candidates.map(c=><div key={c.id} style={{border:'1px solid #ddd', borderRadius:'10px', padding:'10px', background:'white'}}><img src={c.photoUrl} alt={c.name} style={{width:'100%', height:'180px', objectFit:'cover', borderRadius:'8px', background:'#eee'}} onError={e=>{e.target.style.border='3px solid red'; console.log('IMG FAIL', c.photoUrl)}} /><div style={{fontWeight:'bold', fontSize:'12px', marginTop:'6px'}}>{c.name}</div><small style={{wordBreak:'break-all', fontSize:'10px'}}>{c.photoUrl}</small><br/><small>{positions.find(p=>p.id===c.positionId)?.title}</small><br/><button onClick={()=>deleteCandidate(c.id)} style={{color:'red', fontSize:'11px', background:'none', border:'none'}}>Delete</button></div>)}
        </div>
      </>}
      {tab==='results' && <div style={{display:'grid', gap:'30px'}}>{results.map((r,i)=><div key={i} style={{background:'white', padding:'15px', borderRadius:'10px'}}><h2>{r.position} - {r.candidates.reduce((a,b)=>a+b.votes,0)} votes</h2><ResponsiveContainer width="100%" height={300}><BarChart data={r.candidates}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={100} fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="votes" fill="#0f766e" /></BarChart></ResponsiveContainer></div>)}</div>}
    </div>
  );
}
function App(){ return <BrowserRouter><Routes><Route path="/" element={<VotingPage/>} /><Route path="/admin" element={<AdminPage/>} /></Routes></BrowserRouter>; }
export default App;

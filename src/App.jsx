import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwb6ozidFs6_LFW0ktj8oBDAcAFJpe7Ag",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.firebasestorage.app",
  messagingSenderId: "708043016849",
  appId: "1:708043016849:web:e658aa9b22286016c20d30"
};

// Initialize Firebase
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const posSnap = await getDocs(collection(db, 'positions'));
      setPositions(posSnap.docs.map(d => ({ id: d.id,...d.data() })).sort((a,b) => a.order - b.order));
      
      const candSnap = await getDocs(collection(db, 'candidates'));
      setCandidates(candSnap.docs.map(d => ({ id: d.id,...d.data() })));
    } catch (e) {
      setError('Failed to load election data. Check Firestore rules.');
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    
    if (!/^\d{10}$/.test(studentId)) {
      setError('Student ID must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (!grade) {
      setError('Please select your grade');
      setLoading(false);
      return;
    }

    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists() && studentDoc.data().hasVoted) {
        setError('This Student ID has already voted');
        setLoading(false);
        return;
      }
      setStep('vote');
    } catch (e) {
      setError('Error checking student. Check Firestore rules.');
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
      await setDoc(doc(db, 'students', studentId), {
        studentId, grade, hasVoted: true, votedAt: new Date()
      });

      for (let positionId in votes) {
        await addDoc(collection(db, 'votes'), {
          studentId, positionId, candidateId: votes[positionId], grade, timestamp: new Date()
        });
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
      <h1>King's College Budo Elections 2026</h1>
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
      )

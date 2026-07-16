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
      const id = `${

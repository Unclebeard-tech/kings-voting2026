import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function create(){
  for(let i=1; i<=200; i++){
    const id = String(i).padStart(3,'0')
    await setDoc(doc(db,'students',id), { active: true })
    console.log('Created', id)
  }
  console.log('ALL 200 STUDENTS DONE!')
}
create()

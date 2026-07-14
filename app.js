// FRESH START - Kings Voting 2026
// Uses Vite environment variables - DO NOT hardcode keys

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
  getFirestore, doc, getDoc, collection, getDocs, addDoc, 
  serverTimestamp, onSnapshot, query, where 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const statusEl = document.getElementById('status');
const systemCheckEl = document.getElementById('systemCheck');
const adminEl = document.getElementById('adminSettings');
const studentListEl = document.getElementById('studentList');
const studentSelect = document.getElementById('studentSelect');
const candidateSelect = document.getElementById('candidateSelect');
const voteForm = document.getElementById('voteForm');
const voteBtn = document.getElementById('voteBtn');
const voteStatus = document.getElementById('voteStatus');
const resultsEl = document.getElementById('results');

let db = null;
let votingOpen = false;

function setStatus(msg, type = 'loading') {
  statusEl.textContent = msg;
  statusEl.className = `status-${type}`;
}

function addCheck(msg, type = 'success') {
  const div = document.createElement('div');
  div.className = `check-item ${type}`;
  div.innerHTML = type === 'success' ? `✅ ${msg}` : type === 'error' ? `❌ ${msg}` : `⚠️ ${msg}`;
  systemCheckEl.appendChild(div);
}

async function init() {
  systemCheckEl.innerHTML = '';
  
  // Check 1: Environment variables
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
    setStatus('Config Error', 'error');
    addCheck('Firebase env vars missing', 'error');
    addCheck('Go to Netlify > Site configuration > Environment variables', 'warning');
    addCheck('Add all 6 VITE_FIREBASE_* variables then redeploy', 'warning');
    adminEl.innerHTML = '<p style="color:#c00">Cannot connect: Environment variables not found. Add them in Netlify and redeploy.</p>';
    return;
  }
  addCheck('Environment variables found');
  
  try {
    setStatus('Connecting...', 'loading');
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    addCheck('Firebase initialized');
    setStatus('Connected to Firebase', 'success');
    
    await runChecks();
    setupLiveResults();
    
  } catch (error) {
    setStatus('Connection Failed', 'error');
    addCheck(`Firebase error: ${error.message}`, 'error');
    console.error('Init error:', error);
  }
}

async function runChecks() {
  // Check admin settings
  try {
    const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      votingOpen = data.votingOpen === true;
      addCheck('Admin settings found');
      adminEl.innerHTML = `
        <p><strong>Election:</strong> ${data.electionName || 'Not set'}</p>
        <p><strong>Voting Status:</strong> ${votingOpen ? 'OPEN' : 'CLOSED'}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
      if (!votingOpen) addCheck('Voting is currently CLOSED', 'warning');
    } else {
      addCheck('settings/admin document missing', 'error');
      adminEl.innerHTML = '<p style="color:#c00">Create document: settings/admin with votingOpen: true</p>';
    }
  } catch (error) {
    addCheck(`Cannot read settings: ${error.message}`, 'error');
    adminEl.innerHTML = `<p style="color:#c00">Error: ${error.message}</p>`;
  }
  
  // Check students
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    if (studentsSnap.empty) {
      addCheck('No students found in database', 'warning');
      studentListEl.innerHTML = '<p>No students. Add documents to "students" collection.</p>';
      studentSelect.innerHTML = '<option value="">No students available</option>';
    } else {
      addCheck(`Found ${studentsSnap.size} students`);
      studentSelect.innerHTML = '<option value="">Select student...</option>';
      let html = '<table><tr><th>Name</th><th>Class</th></tr>';
      studentsSnap.forEach(doc => {
        const s = doc.data();
        html += `<tr><td>${s.name || 'N/A'}</td><td>${s.class || 'N/A'}</td></tr>`;
        studentSelect.innerHTML += `<option value="${doc.id}">${s.name || doc.id} - ${s.class || ''}</option>`;
      });
      html += '</table>';
      studentListEl.innerHTML = html;
    }
  } catch (error) {
    addCheck(`Cannot read students: ${error.message}`, 'error');
    studentListEl.innerHTML = `<p style="color:#c00">Error: ${error.message}</p>`;
  }
  
  // Check candidates
  try {
    const candidatesSnap = await getDocs(collection(db, 'candidates'));
    if (candidatesSnap.empty) {
      addCheck('No candidates found', 'warning');
      candidateSelect.innerHTML = '<option value="">No candidates available</option>';
    } else {
      addCheck(`Found ${candidatesSnap.size} candidates`);
      candidateSelect.innerHTML = '<option value="">Select candidate...</option>';
      candidatesSnap.forEach(doc => {
        const c = doc.data();
        candidateSelect.innerHTML += `<option value="${doc.id}">${c.name || doc.id} - ${c.position || ''}</option>`;
      });
    }
  } catch (error) {
    addCheck(`Cannot read candidates: ${error.message}`, 'error');
  }
  
  voteBtn.disabled = !votingOpen;
  voteForm.addEventListener('submit', handleVote);
}

async function handleVote(e) {
  e.preventDefault();
  if (!votingOpen) {
    voteStatus.innerHTML = '<p style="color:#c00">Voting is closed</p>';
    return;
  }
  
  const studentId = studentSelect.value;
  const candidateId = candidateSelect.value;
  
  if (!studentId || !candidateId) {
    voteStatus.innerHTML = '<p style="color:#c00">Please select both student and candidate</p>';
    return;
  }
  
  voteStatus.innerHTML = '<p>Submitting vote...</p>';
  voteBtn.disabled = true;
  
  try {
    await addDoc(collection(db, 'votes'), {
      studentId,
      candidateId,
      timestamp: serverTimestamp()
    });
    voteStatus.innerHTML = '<p style="color:#0a0">Vote submitted successfully!</p>';
    voteForm.reset();
    setTimeout(() => voteStatus.innerHTML = '', 3000);
  } catch (error) {
    voteStatus.innerHTML = `<p style="color:#c00">Error: ${error.message}</p>`;
    console.error('Vote error:', error);
  } finally {
    voteBtn.disabled = false;
  }
}

function setupLiveResults() {
  const votesQuery = collection(db, 'votes');
  onSnapshot(votesQuery, async (snapshot) => {
    const counts = {};
    snapshot.forEach(doc => {
      const vote = doc.data();
      counts[vote.candidateId] = (counts[vote.candidateId] || 0) + 1;
    });
    
    const candidatesSnap = await getDocs(collection(db, 'candidates'));
    let html = '<table><tr><th>Candidate</th><th>Position</th><th>Votes</th></tr>';
    candidatesSnap.forEach(doc => {
      const c = doc.data();
      const voteCount = counts[doc.id] || 0;
      html += `<tr><td>${c.name}</td><td>${c.position || ''}</td><td><strong>${voteCount}</strong></td></tr>`;
    });
    html += `</table><p style="margin-top:12px"><strong>Total votes: ${snapshot.size}</strong></p>`;
    resultsEl.innerHTML = html;
  }, (error) => {
    resultsEl.innerHTML = `<p style="color:#c00">Error loading results: ${error.message}</p>`;
  });
}

init();

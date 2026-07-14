KINGS VOTING 2026 - FRESH START v2.0

This is a clean rebuild. Delete your old Netlify site and Firebase project completely.

COMPLETE SETUP FROM ZERO:

1. GITHUB
   a. Create new repo: kings-voting2026
   b. Upload all files from this zip to root of repo

2. FIREBASE - NEW PROJECT
   a. console.firebase.google.com > Create project
   b. Name: kings-voting2026 > Continue > Disable Analytics > Create
   c. Build > Firestore Database > Create database
   d. Start in production mode > Next
   e. Location: eur3 (europe-west) > Enable
   
3. FIRESTORE DATA
   Click "Start collection" and create:
   
   Collection: settings
   - Document ID: admin
   - Fields: votingOpen (boolean) true, electionName (string) Kings 2026
   
   Collection: students  
   - Document ID: Auto-ID
   - Fields: name (string) John Doe, class (string) S4
   - Add 3-4 more students
   
   Collection: candidates
   - Document ID: Auto-ID  
   - Fields: name (string) Jane Smith, position (string) President
   - Add 2-3 more candidates

4. FIRESTORE RULES - CRITICAL
   Click "Rules" tab > Replace all with:
   
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   
   Click "Publish". Without this, app shows "client is offline".

5. AUTHORIZED DOMAIN
   Authentication > Settings > Authorized domains > Add domain
   Add: kings-voting2026.netlify.app

6. GET CONFIG
   Project Settings > General > Scroll to "Your apps"
   Click web icon </> > App nickname: web > Register
   Copy the firebaseConfig values

7. NETLIFY
   a. app.netlify.com > Add new site > Import an existing project
   b. Connect GitHub > Pick kings-voting2026 repo
   c. Build command: npm run build
   d. Publish directory: dist
   e. Deploy site
   
8. ENVIRONMENT VARIABLES - MOST IMPORTANT
   After first deploy:
   Site configuration > Environment variables > Add variable
   
   Add these 6 one by one:
   VITE_FIREBASE_API_KEY = (from firebaseConfig)
   VITE_FIREBASE_AUTH_DOMAIN = (from firebaseConfig)
   VITE_FIREBASE_PROJECT_ID = (from firebaseConfig)
   VITE_FIREBASE_STORAGE_BUCKET = (from firebaseConfig)
   VITE_FIREBASE_MESSAGING_SENDER_ID = (from firebaseConfig)
   VITE_FIREBASE_APP_ID = (from firebaseConfig)
   
   Deploys > Trigger deploy > Clear cache and deploy site

9. RENAME SITE
   Site settings > Change site name > kings-voting2026

TESTING:
Visit https://kings-voting2026.netlify.app
You should see:
- "Connected to Firebase" green
- System Check shows all green checkmarks
- Students and candidates in dropdowns
- Live results updating

TROUBLESHOOTING:
"Environment variables not found" = You didn't add them in Netlify OR didn't redeploy
"client is offline" = Firestore rules not published OR domain not whitelisted
"Missing or insufficient permissions" = Rules are still in test mode, publish the allow-all rules
Empty dropdowns = You didn't add documents to students/candidates collections

This version has better error messages so you know exactly what's wrong.

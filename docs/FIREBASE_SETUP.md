# Firebase setup for EaseL

Follow these steps to connect EaseL to Firebase (Auth + Firestore). Your keys stay in a local `.env` file that is not committed to git.

---

## 1. Create a Firebase project

1. Go to **[Firebase Console](https://console.firebase.google.com)** and sign in with Google.
2. Click **“Create a project”** (or “Add project”).
3. Enter a **project name** (e.g. `EaseL`).
4. Disable Google Analytics if you don’t need it (optional).
5. Click **“Create project”** and wait until it’s ready, then **“Continue”**.

---

## 2. Register your app (web)

1. On the project overview page, click the **Web** icon (`</>`).
2. Enter an **App nickname** (e.g. `EaseL Web`).
3. Do **not** check “Firebase Hosting” for now.
4. Click **“Register app”**.
5. You’ll see a config object. Keep this tab open; you’ll copy from it in **Step 5**.

---

## 3. Enable Email/Password sign-in

1. In the left sidebar, go to **Build → Authentication**.
2. Click **“Get started”** if prompted.
3. Open the **“Sign-in method”** tab.
4. Click **“Email/Password”**.
5. Turn **Enable** ON.
6. Leave “Email link” OFF.
7. Click **“Save”**.

---

## 4. Create Firestore and set rules

1. In the left sidebar, go to **Build → Firestore Database**.
2. Click **“Create database”**.
3. Choose **“Start in test mode”** (for development; you can tighten rules later).
4. Pick a **location** (e.g. `us-central1`) and confirm.
5. When the database is ready, open the **“Rules”** tab and use rules like this so only signed-in users can read/write their own profile:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Click **“Publish”**.

---

## 5. Get your config values

1. In Firebase, go to **Project settings** (gear icon next to “Project overview” in the sidebar).
2. Under **“Your apps”**, select your web app.
3. You’ll see **“Firebase SDK snippet”** and **“Config”**. Copy the values:

   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 6. Create `.env` in the EaseL project

1. In your EaseL project folder (same level as `package.json`), copy the example env file:

   ```bash
   copy .env.example .env
   ```
   (On macOS/Linux: `cp .env.example .env`)

2. Open **`.env`** in an editor and fill in the values (no quotes, no spaces around `=`):

   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_number
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   Replace each value with the one from the Firebase config (Step 5).  
   Names must match exactly (e.g. `VITE_FIREBASE_API_KEY`); Vite only exposes variables that start with `VITE_`.

3. Save the file.

---

## 7. Restart the dev server

1. Stop the current dev server (Ctrl+C).
2. Start it again:

   ```bash
   npm run dev
   ```

3. Open the app in the browser. **Get started** → **Sign up** should now create a real Firebase user and save the profile in Firestore.

---

## Quick checklist

- [ ] Firebase project created  
- [ ] Web app registered  
- [ ] Email/Password sign-in method enabled  
- [ ] Firestore database created (test mode is OK for dev)  
- [ ] Firestore rules updated for `profiles/{userId}`  
- [ ] `.env` created from `.env.example` with all six `VITE_FIREBASE_*` values  
- [ ] Dev server restarted  

---

## Troubleshooting

- **“Firebase: Error (auth/configuration-not-found)”**  
  Check that every `VITE_FIREBASE_*` in `.env` is set and that you restarted the dev server after changing `.env`.

- **Permission denied in Firestore**  
  Ensure the rules allow `read, write` for `profiles/{userId}` when `request.auth.uid == userId`, and that the user is signed in.

- **`.env` has no effect**  
  Vite only reads env at startup. Restart `npm run dev` after editing `.env`.

---
description: How to obtain Firebase Configuration Keys
---
# How to Get Firebase Configuration Keys

Follow these steps to get the API keys for your `.env` file.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name your project (e.g., "Art-Class-App") and continue.
4. Disable Google Analytics for this prototype (optional) and click **"Create project"**.
5. Wait for it to finish and click **"Continue"**.

## 2. Register Your Web App
1. In the Project Overview page, click the **Web icon (</>)** (it looks like a code bracket).
2. Enter a nickname for the app (e.g., "Web Client").
3. Click **"Register app"**.

## 3. Get the Config
1. You will see a code block labeled "Add Firebase SDK".
2. Look for the `firebaseConfig` object constant:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
3. Copy these values into your `.env` file matching the keys:

   | Firebase Config (JS) | .env Variable |
   | :--- | :--- |
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |

## 4. Enable Services (Critical!)
For the app to work, you must enable these services in the Console sidebar:

### Authentication
1. Click **Build > Authentication**.
2. Click **"Get started"**.
3. Select **Google** from the provider list.
4. Click the toggle to **Enable** it.
5. Select a "Project support email" and click **Save**.

### Firestore Database
1. Click **Build > Firestore Database**.
2. Click **"Create database"**.
3. Choose a location (e.g., `asia-northeast3` for Seoul, or default).
4. **Important**: Start in **Test mode** (allows read/write for 30 days).
5. Click **Create**.

### Storage (For Image Uploads)
1. Click **Build > Storage**.
2. Click **"Get started"**.
3. Start in **Test mode** and click **Done**.

---
Done! Now restart your development server (`npm run dev`) to apply changes.

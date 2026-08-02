/**
 * Firebase client SDK binding (browser).
 * Uses the web config from your Firebase console via NEXT_PUBLIC_ env vars.
 * Safe to expose — these are public client credentials.
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseClientConfigured(): boolean {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseApp());
}

/**
 * Google sign-in popup. Returns a Firebase ID token that the server
 * verifies with the Admin SDK (the token proves the user signed in to
 * YOUR Firebase project, no password involved).
 *
 * Requires the "Google" provider to be enabled in the Firebase console.
 */
export async function signInWithGoogle(): Promise<string> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    const result = await signInWithPopup(auth, provider);
    return result.user.getIdToken();
}

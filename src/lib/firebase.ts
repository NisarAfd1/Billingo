// ─────────────────────────────────────────────────
// Firebase Configuration & Authentication Service
// ─────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import {
	getAuth,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	sendPasswordResetEmail,
	updateProfile,
	onAuthStateChanged,
	type User,
} from "firebase/auth";
import { create } from "zustand";

// Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyBOeEtGegwBDokWEt9caliOSfu_DwFVAQg",
	authDomain: "billingo-e8810.firebaseapp.com",
	projectId: "billingo-e8810",
	storageBucket: "billingo-e8810.firebasestorage.app",
	messagingSenderId: "69305463518",
	appId: "1:69305463518:web:9922aedd6d99e4e7e5484f",
	measurementId: "G-5BHT24WBZY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ── Auth State Store ──

interface FirebaseAuthState {
	user: User | null;
	loading: boolean;
	initialized: boolean;
}

interface FirebaseAuthStore extends FirebaseAuthState {
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	setInitialized: () => void;
}

export const useFirebaseAuth = create<FirebaseAuthStore>((set) => ({
	user: null,
	loading: true,
	initialized: false,
	setUser: (user) => set({ user, loading: false }),
	setLoading: (loading) => set({ loading }),
	setInitialized: () => set({ initialized: true }),
}));

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
	const store = useFirebaseAuth.getState();
	store.setUser(user);
	if (!store.initialized) {
		store.setInitialized();
	}

	// Sync with existing localStorage auth for backward compatibility
	if (user) {
		localStorage.setItem("billingo_auth", "true");
		const existing = localStorage.getItem("billingo_user");
		if (!existing) {
			localStorage.setItem(
				"billingo_user",
				JSON.stringify({
					fullName: user.displayName || "User",
					email: user.email || "",
					createdAt: user.metadata.creationTime || new Date().toISOString(),
				}),
			);
		}
	} else {
		localStorage.removeItem("billingo_auth");
	}
});

// ── Auth Functions ──

export interface AuthResult {
	success: boolean;
	error?: string;
}

export async function firebaseSignUp(
	email: string,
	password: string,
	fullName: string,
): Promise<AuthResult> {
	try {
		const credential = await createUserWithEmailAndPassword(auth, email, password);
		await updateProfile(credential.user, { displayName: fullName });

		// Save user data to localStorage for app use
		localStorage.setItem(
			"billingo_user",
			JSON.stringify({
				fullName,
				email,
				createdAt: new Date().toISOString(),
			}),
		);
		localStorage.setItem("billingo_auth", "true");
		localStorage.removeItem("billingo_onboarded");

		return { success: true };
	} catch (error: any) {
		return { success: false, error: getFirebaseErrorMessage(error.code) };
	}
}

export async function firebaseSignIn(
	email: string,
	password: string,
): Promise<AuthResult> {
	try {
		const credential = await signInWithEmailAndPassword(auth, email, password);
		const user = credential.user;

		// Update localStorage for backward compatibility
		const existing = localStorage.getItem("billingo_user");
		if (!existing) {
			localStorage.setItem(
				"billingo_user",
				JSON.stringify({
					fullName: user.displayName || "User",
					email: user.email || email,
					createdAt: user.metadata.creationTime || new Date().toISOString(),
				}),
			);
		}
		localStorage.setItem("billingo_auth", "true");

		return { success: true };
	} catch (error: any) {
		return { success: false, error: getFirebaseErrorMessage(error.code) };
	}
}

export async function firebaseSignOut(): Promise<void> {
	await signOut(auth);
	localStorage.removeItem("billingo_auth");
}

export async function firebaseResetPassword(email: string): Promise<AuthResult> {
	try {
		await sendPasswordResetEmail(auth, email);
		return { success: true };
	} catch (error: any) {
		return { success: false, error: getFirebaseErrorMessage(error.code) };
	}
}

export function getFirebaseUser(): User | null {
	return useFirebaseAuth.getState().user;
}

// ── Error Message Mapping ──

function getFirebaseErrorMessage(code: string): string {
	switch (code) {
		case "auth/email-already-in-use":
			return "An account with this email already exists.";
		case "auth/invalid-email":
			return "Please enter a valid email address.";
		case "auth/operation-not-allowed":
			return "Email/password sign-in is not enabled.";
		case "auth/weak-password":
			return "Password should be at least 6 characters.";
		case "auth/user-disabled":
			return "This account has been disabled.";
		case "auth/user-not-found":
			return "No account found with this email.";
		case "auth/wrong-password":
			return "Incorrect password. Please try again.";
		case "auth/invalid-credential":
			return "Invalid email or password. Please try again.";
		case "auth/too-many-requests":
			return "Too many attempts. Please try again later.";
		case "auth/network-request-failed":
			return "Network error. Please check your connection.";
		default:
			return "An unexpected error occurred. Please try again.";
	}
}

export { auth };

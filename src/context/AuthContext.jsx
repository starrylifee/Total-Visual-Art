import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    async function loginWithGoogle(role) {
        if (!role) throw new Error("Role must be selected");

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);

            try {
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        role: role,
                        createdAt: new Date().toISOString()
                    });
                    setUserRole(role);
                } else {
                    setUserRole(userSnap.data().role);
                }
            } catch (firestoreError) {
                console.error("Firestore Error (using selected role):", firestoreError);
                setUserRole(role); // Use selected role if Firestore fails
            }
            return user;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        // Timeout fallback - force loading to false after 3 seconds
        const timeout = setTimeout(() => {
            if (loading) {
                console.log("Auth loading timeout - forcing render");
                setLoading(false);
            }
        }, 3000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const userRef = doc(db, "users", user.uid);
                try {
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setUserRole(userSnap.data().role);
                    } else {
                        setUserRole('student');
                    }
                } catch (e) {
                    console.log("Error fetching user data:", e);
                    setUserRole('student');
                }
            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    const value = {
        currentUser,
        userRole,
        loginWithGoogle,
        logout,
        isAdmin: userRole === 'teacher'
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                        <p style={{ color: 'var(--text-sub)' }}>로딩 중...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}

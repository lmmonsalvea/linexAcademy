import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider, microsoftProvider } from '../firebase'
import { apiFetch } from './api'

// `firebaseUser` = raw Firebase identity (proves who you are).
// `profile` = this app's own record for that person, from
// GET /api/session/me — { uid, email, displayName, role }. Role-based UI
// must always read `profile.role`, never trust anything from the Firebase
// user object itself (a successful Microsoft login only proves identity,
// not what this app lets that person do).
const AuthContext = createContext({
  firebaseUser: null,
  profile: null,
  loading: true,
  error: null,
  signInWithMicrosoft: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = async () => {
    try {
      const { user } = await apiFetch('/api/session/me')
      setProfile(user)
      setError(null)
    } catch (err) {
      setProfile(null)
      setError(err.message)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        await loadProfile()
      } else {
        setProfile(null)
        setError(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithMicrosoft = () => signInWithPopup(auth, microsoftProvider)
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, error, signInWithMicrosoft, signInWithGoogle, signOut, refreshProfile: loadProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

import HomePage from './pages/HomePage'
import ClassesPage from './pages/ClassesPage'
import StudentsPage from './pages/StudentsPage'
import CouplesPage from './pages/CouplesPage'
import SeancesPage from './pages/SeancesPage'
import PaiementsPage from './pages/PaiementsPage'
import BilansPage from './pages/BilansPage'
import AssistantLoginPage from './pages/AssistantLoginPage'

import PortalPage from './pages/PortalPage'
import LoginPage from './pages/LoginPage'
import MainMenu from './components/MainMenu'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [authPage, setAuthPage] = useState('login')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [assistantSession, setAssistantSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    const savedAssistantSession = localStorage.getItem('assistant_session')
    if (savedAssistantSession) {
      try {
        const parsed = JSON.parse(savedAssistantSession)
        setAssistantSession(parsed)
      } catch (error) {
        console.log(error)
        localStorage.removeItem('assistant_session')
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return

      setLoadingAuth(true)
      setAuthError('')
      setSession(newSession || null)

      if (newSession?.user?.id) {
        const loadedProfile = await fetchProfile(newSession.user.id)

        if (!active) return

        if (loadedProfile) {
          setProfile(loadedProfile)
        } else {
          setProfile(null)
          setAuthError("Profil introuvable pour cet utilisateur.")
        }
      } else {
        setProfile(null)
      }

      if (active) {
        setLoadingAuth(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function initAuth() {
    try {
      setLoadingAuth(true)
      setAuthError('')

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.log(error)
        setAuthError("Impossible de vérifier la session pour le moment.")
        setSession(null)
        setProfile(null)
        setLoadingAuth(false)
        return
      }

      const currentSession = data?.session || null
      setSession(currentSession)

      if (currentSession?.user?.id) {
        const loadedProfile = await fetchProfile(currentSession.user.id)

        if (loadedProfile) {
          setProfile(loadedProfile)
        } else {
          setProfile(null)
          setAuthError("Profil introuvable pour cet utilisateur.")
        }
      } else {
        setProfile(null)
      }

      setLoadingAuth(false)
    } catch (error) {
      console.log(error)
      setAuthError("Erreur de chargement de session.")
      setSession(null)
      setProfile(null)
      setLoadingAuth(false)
    }
  }

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.log(error)
        return null
      }

      return data || null
    } catch (error) {
      console.log(error)
      return null
    }
  }

  async function resetSession() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log(error)
    }

    localStorage.removeItem('assistant_session')
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setAuthError('')
    setLoadingAuth(false)
    setPage('home')
    setAuthPage('login')
    window.location.reload()
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log(error)
    }

    localStorage.removeItem('assistant_session')
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setAuthError('')
    setPage('home')
    setAuthPage('login')
  }

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Chargement profil...</p>

          {authError ? <p style={styles.errorText}>{authError}</p> : null}

          <button
            type="button"
            style={styles.reloadButton}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </button>

          <button
            type="button"
            style={styles.resetButton}
            onClick={resetSession}
          >
            Réinitialiser session
          </button>
        </div>
      </div>
    )
  }

  const activeProfile = session ? profile : assistantSession
  const isAdmin = activeProfile?.role === 'admin'

  if (!session && !assistantSession) {
    if (authPage === 'assistant-login') {
      return (
        <AssistantLoginPage
          onLoginSuccess={(assistantData) => {
            setAssistantSession(assistantData)
            setAuthPage('login')
            setPage('home')
          }}
          onBack={() => setAuthPage('login')}
        />
      )
    }

    return (
      <LoginPage
        onOpenRegisterAssistant={() => setAuthPage('assistant-login')}
      />
    )
  }

  if (session && !profile) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Chargement profil...</p>

          {authError ? <p style={styles.errorText}>{authError}</p> : null}

          <button
            type="button"
            style={styles.reloadButton}
            onClick={initAuth}
          >
            Actualiser
          </button>

          <button
            type="button"
            style={styles.resetButton}
            onClick={resetSession}
          >
            Réinitialiser session
          </button>
        </div>
      </div>
    )
  }

  function renderPage() {
    if (page === 'home') {
      return (
        <HomePage
          onNavigate={setPage}
          profile={activeProfile}
          onLogout={logout}
        />
      )
    }

    if (page === 'classes') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={activeProfile}
            onLogout={logout}
          />
        )
      }
      return <ClassesPage profile={activeProfile} />
    }

    if (page === 'students') {
      return <StudentsPage profile={activeProfile} />
    }

    if (page === 'couples') {
      return <CouplesPage profile={activeProfile} />
    }

    if (page === 'seances') {
      return <SeancesPage profile={activeProfile} />
    }

    if (page === 'paiements') {
      return <PaiementsPage profile={activeProfile} />
    }

    if (page === 'bilans') {
      return <BilansPage profile={activeProfile} />
    }

    if (page === 'create-assistant') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={activeProfile}
            onLogout={logout}
          />
        )
      }

      return (
        <div style={styles.infoBox}>
          Les assistants se connectent maintenant avec le code et le mot de passe de leur classe.
        </div>
      )
    }

    return (
      <HomePage
        onNavigate={setPage}
        profile={activeProfile}
        onLogout={logout}
      />
    )
  }

  return (
    <div style={styles.app}>
      {page !== 'home' && (
        <MainMenu
          currentPage={page}
          onChangePage={setPage}
          profile={activeProfile}
          onLogout={logout}
        />
      )}

      <div style={styles.content}>{renderPage()}</div>
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#f7f1fb',
  },
  content: {
    paddingBottom: 30,
  },
  infoBox: {
    padding: 20,
    textAlign: 'center',
    color: '#2b0a78',
    fontWeight: 'bold',
  },
  loadingPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7f1fb',
    padding: 20,
  },
  loadingBox: {
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#666',
    marginBottom: 16,
  },
  errorText: {
    color: '#d91e18',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  reloadButton: {
    display: 'block',
    width: '100%',
    maxWidth: 220,
    margin: '0 auto 16px',
    padding: 14,
    borderRadius: 18,
    border: 'none',
    background: '#2b0a78',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    display: 'block',
    width: '100%',
    maxWidth: 340,
    margin: '0 auto',
    padding: 16,
    borderRadius: 18,
    border: 'none',
    background: '#e51612',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}

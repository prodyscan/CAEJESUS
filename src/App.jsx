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

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout exceeded')), ms)
    ),
  ])
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [authPage, setAuthPage] = useState('login')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [assistantSession, setAssistantSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    let active = true

    try {
      const savedAssistantSession = localStorage.getItem('assistant_session')
      if (savedAssistantSession) {
        const parsed = JSON.parse(savedAssistantSession)
        setAssistantSession(parsed)
      }
    } catch (error) {
      console.log('assistant_session error:', error)
      localStorage.removeItem('assistant_session')
    }

    async function initAuth() {
      try {
        setLoadingAuth(true)

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          6000
        )

        if (error) {
          console.log('getSession error:', error)
        }

        const currentSession = data?.session || null

        if (!active) return

        setSession(currentSession)

        if (currentSession?.user?.id) {
          const loadedProfile = await withTimeout(
            fetchProfile(currentSession.user.id),
            6000
          )

          if (!active) return
          setProfile(loadedProfile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('initAuth timeout/crash:', error)

        if (!active) return

        setSession(null)
        setProfile(null)
      } finally {
        if (active) {
          setLoadingAuth(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        if (!active) return

        setLoadingAuth(true)
        setSession(newSession || null)

        if (newSession?.user?.id) {
          const loadedProfile = await withTimeout(
            fetchProfile(newSession.user.id),
            6000
          )

          if (!active) return
          setProfile(loadedProfile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('onAuthStateChange timeout/crash:', error)

        if (!active) return

        setProfile(null)
      } finally {
        if (active) {
          setLoadingAuth(false)
        }
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.log('fetchProfile error:', error)
        return null
      }

      return data || null
    } catch (error) {
      console.log('fetchProfile crash:', error)
      return null
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log('logout error:', error)
    }

    localStorage.removeItem('assistant_session')
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setPage('home')
    setAuthPage('login')
  }

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Chargement...</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={styles.reloadButton}
        >
          Actualiser
        </button>
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
            localStorage.setItem('assistant_session', JSON.stringify(assistantData))
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
        <p style={styles.loadingText}>Chargement profil...</p>

        <button
          type="button"
          onClick={logout}
          style={styles.resetButton}
        >
          Réinitialiser session
        </button>
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
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    background: '#f7f1fb',
    padding: 20,
  },
  loadingText: {
    margin: 0,
    fontSize: 18,
    color: '#666',
  },
  reloadButton: {
    padding: '12px 18px',
    borderRadius: 12,
    border: 'none',
    background: '#2b0a78',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resetButton: {
    padding: '12px 18px',
    borderRadius: 12,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}

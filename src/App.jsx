import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ErrorBoundary from './ErrorBoundary'

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
      const saved = localStorage.getItem('assistant_session')
      if (saved) {
        setAssistantSession(JSON.parse(saved))
      }
    } catch (e) {
      localStorage.removeItem('assistant_session')
    }

    async function initAuth() {
      try {
        setLoadingAuth(true)

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          6000
        )

        const currentSession = data?.session || null

        if (!active) return

        setSession(currentSession)

        if (currentSession?.user?.id) {
          const loadedProfile = await fetchProfile(currentSession.user.id)
          if (!active) return
          setProfile(loadedProfile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('Auth error:', error)
        if (!active) return
        setSession(null)
        setProfile(null)
      } finally {
        if (active) setLoadingAuth(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, newSession) => {
      if (!active) return

      try {
        setLoadingAuth(true)
        setSession(newSession || null)

        if (newSession?.user?.id) {
          const loadedProfile = await fetchProfile(newSession.user.id)
          if (!active) return
          setProfile(loadedProfile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('Auth change error:', error)
      } finally {
        if (active) setLoadingAuth(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      return data || null
    } catch {
      return null
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('assistant_session')
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setPage('home')
    setAuthPage('login')
  }

  // 🔥 CORRECTION IMPORTANTE
  const activeProfile = session ? profile : assistantSession || null
  const isAdmin = activeProfile?.role === 'admin'

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth) {
    return (
      <div style={styles.loadingPage}>
        <p>Chargement...</p>
        <button onClick={() => window.location.reload()}>
          Actualiser
        </button>
      </div>
    )
  }

  if (!session && !assistantSession) {
    if (authPage === 'assistant-login') {
      return (
        <AssistantLoginPage
          onLoginSuccess={(data) => {
            localStorage.setItem('assistant_session', JSON.stringify(data))
            setAssistantSession(data)
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
        <p>Chargement profil...</p>
        <button onClick={logout}>Reset</button>
      </div>
    )
  }

  function renderPage() {
    switch (page) {
      case 'home':
        return <HomePage onNavigate={setPage} profile={activeProfile} onLogout={logout} />
      case 'classes':
        return isAdmin ? <ClassesPage profile={activeProfile} /> : <HomePage onNavigate={setPage} profile={activeProfile} />
      case 'students':
        return <StudentsPage profile={activeProfile} />
      case 'couples':
        return <CouplesPage profile={activeProfile} />
      case 'seances':
        return <SeancesPage profile={activeProfile} />
      case 'paiements':
        return <PaiementsPage profile={activeProfile} />
      case 'bilans':
        return <BilansPage profile={activeProfile} />
      default:
        return <HomePage onNavigate={setPage} profile={activeProfile} />
    }
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
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
  loadingPage: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 10,
  },
}

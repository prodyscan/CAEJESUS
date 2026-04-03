import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

import HomePage from './pages/HomePage'
import ClassesPage from './pages/ClassesPage'
import StudentsPage from './pages/StudentsPage'
import CouplesPage from './pages/CouplesPage'
import SeancesPage from './pages/SeancesPage'
import PaiementsPage from './pages/PaiementsPage'
import BilansPage from './pages/BilansPage'
import CreateAssistantPage from './pages/CreateAssistantPage'
import RegisterAssistantPage from './pages/RegisterAssistantPage'

import PortalPage from './pages/PortalPage'
import LoginPage from './pages/LoginPage'
import MainMenu from './components/MainMenu'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [authPage, setAuthPage] = useState('login')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    let active = true

    async function initAuth() {
      try {
        setLoadingAuth(true)

        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.log('getSession error:', error)
        }

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
        console.log('initAuth crash:', error)
        if (active) {
          setSession(null)
          setProfile(null)
        }
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
          const loadedProfile = await fetchProfile(newSession.user.id)
          if (!active) return
          setProfile(loadedProfile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('onAuthStateChange crash:', error)
        if (active) {
          setProfile(null)
        }
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
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setPage('home')
    setAuthPage('login')
  }

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Chargement...</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#2b0a78',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          Actualiser
        </button>
      </div>
    )
  }

  if (!session) {
    if (authPage === 'register-assistant') {
      return (
        <RegisterAssistantPage
          onBackToLogin={() => setAuthPage('login')}
        />
      )
    }

    return (
      <LoginPage
        onOpenRegisterAssistant={() => setAuthPage('register-assistant')}
      />
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Chargement profil...</p>
        <button
          type="button"
          onClick={logout}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#d91e18',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          Réinitialiser session
        </button>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  function renderPage() {
    if (page === 'home') {
      return (
        <HomePage
          onNavigate={setPage}
          profile={profile}
          onLogout={logout}
        />
      )
    }

    if (page === 'classes') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={profile}
            onLogout={logout}
          />
        )
      }
      return <ClassesPage profile={profile} />
    }

    if (page === 'students') {
      return <StudentsPage profile={profile} />
    }

    if (page === 'couples') {
      return <CouplesPage profile={profile} />
    }

    if (page === 'seances') {
      return <SeancesPage profile={profile} />
    }

    if (page === 'paiements') {
      return <PaiementsPage profile={profile} />
    }

    if (page === 'bilans') {
      return <BilansPage profile={profile} />
    }

    if (page === 'create-assistant') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={profile}
            onLogout={logout}
          />
        )
      }
      return <CreateAssistantPage />
    }

    return (
      <HomePage
        onNavigate={setPage}
        profile={profile}
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
          profile={profile}
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
}

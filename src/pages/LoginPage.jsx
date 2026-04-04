import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginPage({ onOpenRegisterAssistant }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

// Commentaire
  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage("Email ou mot de passe incorrect")
      return
    }

    setMessage('Connexion réussie')
  }
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Connexion administrateur</h2>

        <form onSubmit={handleLogin}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email admin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onOpenRegisterAssistant}
          >
            Connexion assistant
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7f1fb',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
  },
  title: {
    textAlign: 'center',
    color: '#2b0a78',
    marginTop: 0,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  secondaryButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: '#d4148e',
    fontWeight: 'bold',
  },
}

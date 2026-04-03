import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AssistantSecretPage({ onValidated, onBackToLogin }) {
  const [secret, setSecret] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleValidate(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('assistant_secret', secret.trim())
      .maybeSingle()

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage('Erreur vérification secret')
      return
    }

    if (!data) {
      setMessage('Secret invalide')
      return
    }

    onValidated(data)
  }

  async function handleBack() {
    if (onBackToLogin) {
      await onBackToLogin()
      return
    }

    await supabase.auth.signOut()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <button style={styles.backButton} onClick={handleBack} type="button">
          ← Retour
        </button>

        <h2 style={styles.title}>Code secret assistant</h2>

        <form onSubmit={handleValidate}>
          <input
            style={styles.input}
            placeholder="Entrer le code secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Vérification...' : 'Valider'}
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
  backButton: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: '#d4148e',
    fontWeight: 'bold',
  },
}

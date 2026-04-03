import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AssistantLoginPage({ onLoginSuccess, onBack }) {
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')

    if (!nom.trim() || !code.trim() || !password.trim()) {
      setMessage('Tous les champs sont obligatoires')
      return
    }

    setLoading(true)

    // 🔍 Chercher la classe
    const { data: classe, error } = await supabase
      .from('classes')
      .select('*')
      .eq('assistant_code', code.trim())
      .maybeSingle()

    if (error) {
      console.log(error)
      setMessage('Erreur serveur')
      setLoading(false)
      return
    }

    if (!classe) {
      setMessage('Code assistant invalide')
      setLoading(false)
      return
    }

    if (classe.assistant_password !== password.trim()) {
      setMessage('Mot de passe incorrect')
      setLoading(false)
      return
    }

    // ✅ créer session locale
    const assistantSession = {
      role: 'assistant',
      nom: nom.trim(),
      class_id: classe.id,
      class_nom: classe.nom,
    }

    localStorage.setItem('assistant_session', JSON.stringify(assistantSession))

    onLoginSuccess(assistantSession)
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Connexion assistant</h2>

        <form onSubmit={handleLogin}>
          <input
            style={styles.input}
            placeholder="Ton nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Code assistant"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.button} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <button
            type="button"
            style={styles.secondary}
            onClick={onBack}
          >
            Retour
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
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
  },
  card: {
    width: 360,
    background: '#fff',
    padding: 20,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    padding: 12,
    background: '#2b0a78',
    color: '#fff',
    border: 'none',
    marginBottom: 10,
  },
  secondary: {
    width: '100%',
    padding: 12,
  },
  message: {
    color: 'red',
    textAlign: 'center',
  },
}

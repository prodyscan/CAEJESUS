import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function RegisterAssistantPage({ onBackToLogin }) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [assistantCode, setAssistantCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setMessage('')

    if (!nom.trim()) {
      setMessage("Le nom est obligatoire")
      return
    }

    if (!email.trim()) {
      setMessage("L'email est obligatoire")
      return
    }

    if (!password.trim()) {
      setMessage('Le mot de passe est obligatoire')
      return
    }

    if (!assistantCode.trim()) {
      setMessage('Le code assistant est obligatoire')
      return
    }

    setLoading(true)

    // 🔍 Vérifier le code assistant
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('assistant_code', assistantCode.trim())
      .maybeSingle()

    if (classError) {
      console.log(classError)
      setMessage('Erreur vérification code assistant')
      setLoading(false)
      return
    }

    if (!classData) {
      setMessage('Code assistant invalide')
      setLoading(false)
      return
    }

    // 🔐 Création du compte
    const { data: signupData, error: signupError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      })

    if (signupError) {
      console.log(signupError)
      setMessage(signupError.message || "Erreur création du compte")
      setLoading(false)
      return
    }

    const userId = signupData.user?.id

    if (!userId) {
      setMessage("Compte créé, mais utilisateur introuvable")
      setLoading(false)
      return
    }

    // ✅ Création du profil (CORRIGÉ : insert au lieu de upsert)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          nom: nom.trim(),
          email: email.trim(),
          role: 'assistant',
          class_id: classData.id,
        },
      ])

    if (profileError) {
      console.log(profileError)
      setMessage(
        profileError.message ||
          "Compte créé, mais erreur de profil assistant"
      )
      setLoading(false)
      return
    }

    // ✅ Succès total
    setMessage(
      'Compte assistant créé avec succès. Tu peux maintenant te connecter.'
    )
    setNom('')
    setEmail('')
    setPassword('')
    setAssistantCode('')
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Créer un compte assistant</h2>

        <form onSubmit={handleRegister}>
          <input
            style={styles.input}
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

          <input
            style={styles.input}
            type="email"
            placeholder="Email"
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

          <input
            style={styles.input}
            placeholder="Code assistant"
            value={assistantCode}
            onChange={(e) => setAssistantCode(e.target.value)}
          />

          <button style={styles.primaryButton} type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onBackToLogin}
          >
            Retour connexion
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
  primaryButton: {
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

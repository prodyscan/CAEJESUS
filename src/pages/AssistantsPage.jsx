import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyForm = {
  nom: '',
  email: '',
  password: '',
  class_id: '',
}

export default function AssistantsPage() {
  const [classes, setClasses] = useState([])
  const [assistants, setAssistants] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClasses()
    getAssistants()
  }, [])

  async function getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('nom', { ascending: true })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement classes')
      return
    }

    setClasses(data || [])
  }

  async function getAssistants() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        classes (
          id,
          nom,
          annee
        )
      `)
      .eq('role', 'assistant')

    if (error) {
      console.log(error)
      setMessage('Erreur chargement assistants')
      return
    }

    setAssistants(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function createAssistant(e) {
    e.preventDefault()
    setMessage('')

    if (!form.nom.trim()) {
      setMessage("Le nom de l'assistant est obligatoire")
      return
    }

    if (!form.email.trim()) {
      setMessage("L'email est obligatoire")
      return
    }

    if (!form.password.trim()) {
      setMessage("Le mot de passe est obligatoire")
      return
    }

    if (!form.class_id) {
      setMessage('Choisis une classe')
      return
    }

    setLoading(true)

    try {
      const sessionRes = await supabase.auth.getSession()
      const accessToken = sessionRes.data.session?.access_token

      if (!accessToken) {
        setLoading(false)
        setMessage('Session invalide')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-assistant', {
        body: {
          nom: form.nom.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          class_id: form.class_id,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      setLoading(false)

      if (error) {
        console.log(error)
        setMessage(error.message || 'Erreur création assistant')
        return
      }

      if (!data?.success) {
        setMessage(data?.message || 'Erreur création assistant')
        return
      }

      setMessage('Assistant créé avec succès')
      setForm(emptyForm)
      getAssistants()
    } catch (err) {
      setLoading(false)
      console.log(err)
      setMessage('Erreur création assistant')
    }
  }

  async function unlinkAssistant(profileId) {
    const ok = window.confirm("Retirer cet assistant de sa classe ?")
    if (!ok) return

    const { error } = await supabase
      .from('profiles')
      .update({ class_id: null })
      .eq('id', profileId)

    if (error) {
      console.log(error)
      setMessage('Erreur modification assistant')
      return
    }

    setMessage('Assistant mis à jour')
    getAssistants()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Créer assistant</h2>

        <form onSubmit={createAssistant}>
          <input
            style={styles.input}
            name="nom"
            placeholder="Nom assistant"
            value={form.nom}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="email"
            type="email"
            placeholder="Email assistant"
            value={form.email}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="password"
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
          />

          <select
            style={styles.input}
            name="class_id"
            value={form.class_id}
            onChange={handleChange}
          >
            <option value="">Choisir une classe</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom} - {classe.annee}ère année
              </option>
            ))}
          </select>

          <button style={styles.primaryButtonFull} type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer assistant'}
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste des assistants</h3>

        {assistants.length === 0 ? (
          <p>Aucun assistant enregistré.</p>
        ) : (
          assistants.map((assistant) => (
            <div key={assistant.id} style={styles.itemCard}>
              <strong style={styles.itemName}>{assistant.nom || 'Assistant'}</strong>
              <p style={styles.meta}>Classe : {assistant.classes?.nom || 'Aucune'}</p>
              <p style={styles.meta}>Année : {assistant.classes?.annee || '-'}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => unlinkAssistant(assistant.id)}
                >
                  Retirer la classe
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: 20,
    maxWidth: 760,
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    background: '#f7f1fb',
    minHeight: '100vh',
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
  },
  title: {
    marginTop: 0,
    marginBottom: 16,
    textAlign: 'center',
    color: '#2b0a78',
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: '#6f5b84',
    textAlign: 'center',
    fontSize: 24,
  },
  input: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  itemName: {
    color: '#2b0a78',
    fontSize: 20,
  },
  meta: {
    margin: '6px 0',
    color: '#666',
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryButtonFull: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}

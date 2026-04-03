import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyClassForm = {
  nom: '',
  annee: '1',
  pays: '',
  ville: '',
  assistant_nom: '',
  assistant_code: '',
  assistant_password: '',
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(emptyClassForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getClasses()
  }, [])

  async function getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement classes')
      return
    }

    setClasses(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function saveClass(e) {
    e.preventDefault()
    setMessage('')

    if (!form.nom.trim()) {
      setMessage('Le nom de la classe est obligatoire')
      return
    }

    if (!form.assistant_code.trim()) {
      setMessage('Le code assistant est obligatoire')
      return
    }

    if (!form.assistant_password.trim()) {
      setMessage("Le mot de passe assistant est obligatoire")
      return
    }

    setLoading(true)

    const payload = {
      nom: form.nom.trim(),
      annee: Number(form.annee),
      pays: form.pays.trim(),
      ville: form.ville.trim(),
      assistant_nom: form.assistant_nom.trim(),
      assistant_code: form.assistant_code.trim(),
      assistant_password: form.assistant_password.trim(),
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('classes')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('classes')
        .insert([payload])

      error = result.error
    }

    setLoading(false)

    if (error) {
      console.log(error)

      if (error.message?.toLowerCase().includes('duplicate')) {
        setMessage('Ce code assistant existe déjà')
        return
      }

      setMessage('Erreur enregistrement classe')
      return
    }

    setMessage(editingId ? 'Classe modifiée' : 'Classe ajoutée')
    setForm(emptyClassForm)
    setEditingId(null)
    getClasses()
  }

  function editClass(classe) {
    setEditingId(classe.id)
    setForm({
      nom: classe.nom || '',
      annee: String(classe.annee || '1'),
      pays: classe.pays || '',
      ville: classe.ville || '',
      assistant_nom: classe.assistant_nom || '',
      assistant_code: classe.assistant_code || '',
      assistant_password: classe.assistant_password || '',
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyClassForm)
    setMessage('')
  }

  async function deleteClass(id) {
    const ok = window.confirm('Supprimer cette classe ?')
    if (!ok) return

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression classe')
      return
    }

    setMessage('Classe supprimée')
    getClasses()
  }

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return classes

    return classes.filter((classe) => {
      const text = [
        classe.nom,
        String(classe.annee || ''),
        classe.pays,
        classe.ville,
        classe.assistant_nom,
        classe.assistant_code,
        classe.assistant_password,
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(term)
    })
  }, [classes, search])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier classe' : 'Classes'}
        </h2>

        <form onSubmit={saveClass}>
          <input
            style={styles.input}
            name="nom"
            placeholder="Nom de la classe"
            value={form.nom}
            onChange={handleChange}
          />

          <select
            style={styles.input}
            name="annee"
            value={form.annee}
            onChange={handleChange}
          >
            <option value="1">1ère année</option>
            <option value="2">2ème année</option>
            <option value="3">3ème année</option>
          </select>

          <input
            style={styles.input}
            name="pays"
            placeholder="Pays"
            value={form.pays}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="ville"
            placeholder="Ville"
            value={form.ville}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="assistant_nom"
            placeholder="Nom de l'assistant"
            value={form.assistant_nom}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="assistant_code"
            placeholder="Code assistant"
            value={form.assistant_code}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="assistant_password"
            placeholder="Mot de passe assistant"
            value={form.assistant_password}
            onChange={handleChange}
          />

          <button style={styles.primaryButtonFull} type="submit" disabled={loading}>
            {loading
              ? 'Enregistrement...'
              : editingId
              ? 'Modifier classe'
              : 'Ajouter classe'}
          </button>

          {editingId && (
            <button
              type="button"
              style={styles.secondaryButtonFull}
              onClick={cancelEdit}
            >
              Annuler modification
            </button>
          )}
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Recherche rapide</h3>

        <input
          style={styles.input}
          placeholder="Chercher par classe, assistant, code, mot de passe, ville, pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <p style={styles.resultText}>
          {filteredClasses.length} résultat{filteredClasses.length > 1 ? 's' : ''}
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste des classes</h3>

        {filteredClasses.length === 0 ? (
          <p>Aucune classe trouvée.</p>
        ) : (
          filteredClasses.map((classe) => (
            <div key={classe.id} style={styles.itemCard}>
              <strong style={styles.className}>{classe.nom}</strong>
              <p style={styles.meta}>Année : {classe.annee}</p>
              <p style={styles.meta}>Pays : {classe.pays || '-'}</p>
              <p style={styles.meta}>Ville : {classe.ville || '-'}</p>
              <p style={styles.meta}>Assistant : {classe.assistant_nom || '-'}</p>
              <p style={styles.meta}>Code assistant : {classe.assistant_code || '-'}</p>
              <p style={styles.meta}>Mot de passe assistant : {classe.assistant_password || '-'}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => editClass(classe)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deleteClass(classe.id)}
                >
                  Supprimer
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
  resultText: {
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
    color: '#6f5b84',
    fontWeight: 'bold',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  className: {
    color: '#2b0a78',
    fontSize: 20,
  },
  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  dangerButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
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
    marginTop: 10,
    marginBottom: 10,
  },
  secondaryButtonFull: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}

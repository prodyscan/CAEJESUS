import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import SeanceDetailPage from './SeanceDetailPage'

const emptyForm = {
  class_id: '',
  chapitre: '',
  date_seance: '',
  numero_seance: '',
}

export default function SeancesPage({ profile }) {
  const [seances, setSeances] = useState([])
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId = profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    getClasses()
    getSeances()
  }, [profile])

  async function getClasses() {
    let query = supabase
      .from('classes')
      .select('*')
      .order('nom', { ascending: true })

    if (!isAdmin && assistantClassId) {
      query = query.eq('id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement classes')
      return
    }

    setClasses(data || [])
  }

  async function getSeances() {
    let query = supabase
      .from('seances')
      .select(`
        *,
        classes (
          id,
          nom,
          annee
        )
      `)
      .order('created_at', { ascending: false })

    if (!isAdmin && assistantClassId) {
      query = query.eq('class_id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement séances')
      return
    }

    setSeances(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function getNextSeanceNumber(classId) {
    const { data, error } = await supabase
      .from('seances')
      .select('numero_seance')
      .eq('class_id', classId)
      .order('numero_seance', { ascending: false })
      .limit(1)

    if (error) {
      console.log(error)
      return 1
    }

    const lastNumber = data?.[0]?.numero_seance || 0
    return lastNumber + 1
  }

  async function saveSeance(e) {
    e.preventDefault()
    setMessage('')

    const finalClassId = isAdmin ? form.class_id : assistantClassId

    if (!finalClassId) {
      setMessage('Choisis une classe')
      return
    }

    if (!form.chapitre.trim()) {
      setMessage('Le chapitre est obligatoire')
      return
    }

    setLoading(true)

    let numeroFinal = form.numero_seance ? Number(form.numero_seance) : null

    if (!numeroFinal) {
      numeroFinal = await getNextSeanceNumber(finalClassId)
    }

    const payload = {
      class_id: finalClassId,
      chapitre: form.chapitre.trim(),
      date_seance: form.date_seance || new Date().toISOString().slice(0, 10),
      numero_seance: numeroFinal,
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('seances')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const existingSameNumber = seances.find(
        (s) =>
          s.class_id === finalClassId &&
          Number(s.numero_seance) === Number(numeroFinal)
      )

      if (existingSameNumber) {
        setLoading(false)
        setMessage('Ce numéro de séance existe déjà pour cette classe')
        return
      }

      const result = await supabase
        .from('seances')
        .insert([payload])

      error = result.error
    }

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement séance')
      return
    }

    setMessage(editingId ? 'Séance modifiée' : 'Séance ajoutée')
    setForm(emptyForm)
    setEditingId(null)
    getSeances()
  }

  function editSeance(seance) {
    setEditingId(seance.id)
    setForm({
      class_id: seance.class_id || '',
      chapitre: seance.chapitre || '',
      date_seance: seance.date_seance || '',
      numero_seance: seance.numero_seance ? String(seance.numero_seance) : '',
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  async function deleteSeance(id) {
    const ok = window.confirm('Supprimer cette séance ?')
    if (!ok) return

    const { error } = await supabase
      .from('seances')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression séance')
      return
    }

    setMessage('Séance supprimée')
    getSeances()
  }

  function openSeance(id) {
    setSelectedSeanceId(id)
  }

  function closeSeanceDetail() {
    setSelectedSeanceId(null)
    getSeances()
  }

  if (selectedSeanceId) {
    return (
      <SeanceDetailPage
        seanceId={selectedSeanceId}
        onBack={closeSeanceDetail}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier séance' : 'Séances'}
        </h2>

        <form onSubmit={saveSeance}>
          {isAdmin ? (
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
          ) : (
            <div style={styles.infoBox}>
              Classe : {classes[0]?.nom || '-'}
            </div>
          )}

          <input
            style={styles.input}
            name="chapitre"
            placeholder="Chapitre"
            value={form.chapitre}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            type="date"
            name="date_seance"
            value={form.date_seance}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="numero_seance"
            type="number"
            placeholder="Numéro de séance (laisser vide pour auto)"
            value={form.numero_seance}
            onChange={handleChange}
          />

          <button style={styles.primaryButtonFull} type="submit" disabled={loading}>
            {loading
              ? 'Enregistrement...'
              : editingId
              ? 'Modifier séance'
              : 'Ajouter séance'}
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
        <h3 style={styles.sectionTitle}>Liste des séances</h3>

        {seances.length === 0 ? (
          <p>Aucune séance enregistrée.</p>
        ) : (
          seances.map((seance) => (
            <div key={seance.id} style={styles.itemCard}>
              <strong style={styles.seanceName}>{seance.chapitre}</strong>

              <p style={styles.meta}>Classe : {seance.classes?.nom || '-'}</p>
              <p style={styles.meta}>Année : {seance.classes?.annee || '-'}</p>
              <p style={styles.meta}>Date : {seance.date_seance || '-'}</p>
              <p style={styles.meta}>Numéro : {seance.numero_seance || '-'}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.openButton}
                  onClick={() => openSeance(seance.id)}
                >
                  Ouvrir séance
                </button>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => editSeance(seance)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deleteSeance(seance.id)}
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
  infoBox: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #eadcf9',
    background: '#fff7fc',
    color: '#2b0a78',
    fontWeight: 'bold',
    boxSizing: 'border-box',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  seanceName: {
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
  openButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#7b61c9',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
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
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}

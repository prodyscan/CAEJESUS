import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function PointagePage() {
  const [seances, setSeances] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSeanceId, setSelectedSeanceId] = useState('')
  const [selectedSeance, setSelectedSeance] = useState(null)
  const [presencesMap, setPresencesMap] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    getSeances()
  }, [])

  async function getSeances() {
    const { data, error } = await supabase
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

    if (error) {
      console.log(error)
      setMessage('Erreur chargement séances')
      return
    }

    setSeances(data || [])
  }

  async function handleSeanceChange(e) {
    const seanceId = e.target.value
    setSelectedSeanceId(seanceId)
    setMessage('')

    if (!seanceId) {
      setSelectedSeance(null)
      setStudents([])
      setPresencesMap({})
      return
    }

    const found = seances.find((s) => s.id === seanceId)
    setSelectedSeance(found || null)

    if (!found?.class_id) {
      setStudents([])
      setPresencesMap({})
      return
    }

    await getStudentsByClass(found.class_id)
    await getPresencesBySeance(seanceId)
  }

  async function getStudentsByClass(classId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('nom', { ascending: true })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement étudiants')
      return
    }

    setStudents(data || [])
  }

  async function getPresencesBySeance(seanceId) {
    const { data, error } = await supabase
      .from('presences')
      .select('*')
      .eq('seance_id', seanceId)

    if (error) {
      console.log(error)
      setMessage('Erreur chargement présences')
      return
    }

    const map = {}
    ;(data || []).forEach((item) => {
      map[item.student_id] = item.statut
    })
    setPresencesMap(map)
  }

  async function markPresence(studentId, statut) {
    if (!selectedSeanceId) {
      setMessage('Choisis d’abord une séance')
      return
    }

    const { error } = await supabase
      .from('presences')
      .upsert(
        [
          {
            seance_id: selectedSeanceId,
            student_id: studentId,
            statut,
          },
        ],
        { onConflict: 'seance_id,student_id' }
      )

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement pointage')
      return
    }

    setPresencesMap((prev) => ({
      ...prev,
      [studentId]: statut,
    }))

    setMessage('Pointage enregistré')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Pointage</h2>

        <select
          style={styles.input}
          value={selectedSeanceId}
          onChange={handleSeanceChange}
        >
          <option value="">Choisir une séance</option>
          {seances.map((seance) => (
            <option key={seance.id} value={seance.id}>
              {seance.chapitre} - {seance.classes?.nom || '-'} - {seance.date_seance}
            </option>
          ))}
        </select>

        {selectedSeance && (
          <div style={styles.infoBox}>
            <p><strong>Classe :</strong> {selectedSeance.classes?.nom || '-'}</p>
            <p><strong>Année :</strong> {selectedSeance.classes?.annee || '-'}</p>
            <p><strong>Chapitre :</strong> {selectedSeance.chapitre}</p>
            <p><strong>Date :</strong> {selectedSeance.date_seance}</p>
          </div>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h2>Étudiants de la classe</h2>

        {students.length === 0 ? (
          <p>Aucun étudiant trouvé pour cette séance.</p>
        ) : (
          students.map((student) => {
            const statut = presencesMap[student.id]

            return (
              <div key={student.id} style={styles.studentCard}>
                <div>
                  <strong>{student.nom} {student.prenom}</strong>
                  <p style={styles.meta}>Matricule : {student.matricule || '-'}</p>
                  <p style={styles.meta}>
                    Statut actuel : {statut || 'Non pointé'}
                  </p>
                </div>

                <div style={styles.actionRow}>
                  <button
                    style={statut === 'present' ? styles.presentActive : styles.presentButton}
                    onClick={() => markPresence(student.id, 'present')}
                  >
                    Présent
                  </button>

                  <button
                    style={statut === 'absent' ? styles.absentActive : styles.absentButton}
                    onClick={() => markPresence(student.id, 'absent')}
                  >
                    Absent
                  </button>
                </div>
              </div>
            )
          })
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
  },
  card: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    border: '1px solid #bbb',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  infoBox: {
    background: '#f7f7f7',
    border: '1px solid #e1e1e1',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  studentCard: {
    border: '1px solid #e3e3e3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    background: '#fafafa',
  },
  meta: {
    margin: '4px 0',
    color: '#555',
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  presentButton: {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#2e7d32',
    color: '#fff',
    fontSize: 14,
  },
  absentButton: {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#c62828',
    color: '#fff',
    fontSize: 14,
  },
  presentActive: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '2px solid #1b5e20',
    background: '#43a047',
    color: '#fff',
    fontSize: 14,
  },
  absentActive: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '2px solid #8e0000',
    background: '#e53935',
    color: '#fff',
    fontSize: 14,
  },
}

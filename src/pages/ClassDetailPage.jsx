import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import SeanceDetailPage from './SeanceDetailPage'

export default function ClassDetailPage({ classId, onBack }) {
  const [classe, setClasse] = useState(null)
  const [students, setStudents] = useState([])
  const [seances, setSeances] = useState([])
  const [rapports, setRapports] = useState([])
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadClassData()
  }, [classId])

  async function loadClassData() {
    setMessage('')

    const { data: classeData, error: classeError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    if (classeError) {
      console.log(classeError)
      setMessage('Erreur chargement classe')
      return
    }

    setClasse(classeData)

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('nom', { ascending: true })

    if (studentsError) {
      console.log(studentsError)
      setMessage('Erreur chargement fidèles')
    } else {
      setStudents(studentsData || [])
    }

    const { data: seancesData, error: seancesError } = await supabase
      .from('seances')
      .select('*')
      .eq('class_id', classId)
      .order('numero_seance', { ascending: true })

    if (seancesError) {
      console.log(seancesError)
      setMessage('Erreur chargement séances')
    } else {
      setSeances(seancesData || [])
    }

    const { data: rapportsData, error: rapportsError } = await supabase
      .from('rapports_seance')
      .select('*')
      .eq('class_id', classId)

    if (rapportsError) {
      console.log(rapportsError)
      setMessage('Erreur chargement rapports')
    } else {
      setRapports(rapportsData || [])
    }
  }

  const rapportMap = useMemo(() => {
    const map = {}
    ;(rapports || []).forEach((r) => {
      map[r.seance_id] = r
    })
    return map
  }, [rapports])

  if (selectedSeanceId) {
    return (
      <SeanceDetailPage
        seanceId={selectedSeanceId}
        onBack={() => {
          setSelectedSeanceId(null)
          loadClassData()
        }}
      />
    )
  }

  return (
    <div style={styles.page}>
      <button type="button" style={styles.backButton} onClick={onBack}>
        ← Retour aux classes
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>{classe?.nom || 'Classe'}</h2>

        <p style={styles.meta}><strong>Année :</strong> {classe?.annee || '-'}</p>
        <p style={styles.meta}><strong>Pays :</strong> {classe?.pays || '-'}</p>
        <p style={styles.meta}><strong>Ville :</strong> {classe?.ville || '-'}</p>
        <p style={styles.meta}><strong>Assistant :</strong> {classe?.assistant_nom || '-'}</p>
        <p style={styles.meta}><strong>Code assistant :</strong> {classe?.assistant_code || '-'}</p>
        <p style={styles.meta}><strong>Mot de passe assistant :</strong> {classe?.assistant_password || '-'}</p>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Résumé</h3>

        <div style={styles.grid}>
          <div style={styles.box}>
            <strong>{students.length}</strong>
            <span>Fidèles</span>
          </div>

          <div style={styles.box}>
            <strong>{seances.length}</strong>
            <span>Séances</span>
          </div>

          <div style={styles.box}>
            <strong>{rapports.length}</strong>
            <span>Rapports</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Fidèles de la classe</h3>

        {students.length === 0 ? (
          <p>Aucun fidèle dans cette classe.</p>
        ) : (
          students.map((student) => (
            <div key={student.id} style={styles.itemCard}>
              <strong style={styles.itemTitle}>
                {student.nom} {student.prenom}
              </strong>

              <p style={styles.meta}>Matricule : {student.matricule || '-'}</p>
              <p style={styles.meta}>Sexe : {student.sexe || '-'}</p>
              <p style={styles.meta}>Ministère : {student.ministere || '-'}</p>
              <p style={styles.meta}>Profession : {student.profession || '-'}</p>
              <p style={styles.meta}>Dénomination : {student.denomination || '-'}</p>
              <p style={styles.meta}>Quartier : {student.quartier || '-'}</p>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Séances de la classe</h3>

        {seances.length === 0 ? (
          <p>Aucune séance pour cette classe.</p>
        ) : (
          seances.map((seance) => {
            const rapport = rapportMap[seance.id]

            return (
              <div key={seance.id} style={styles.itemCard}>
                <strong style={styles.itemTitle}>
                  {seance.chapitre || '-'}
                </strong>

                <p style={styles.meta}>Numéro : {seance.numero_seance || '-'}</p>
                <p style={styles.meta}>Date : {seance.date_seance || '-'}</p>
                <p style={styles.meta}>Rapport : {rapport ? 'Disponible' : 'Non disponible'}</p>

                <div style={styles.row}>
                  <button
                    type="button"
                    style={styles.openButton}
                    onClick={() => setSelectedSeanceId(seance.id)}
                  >
                    Ouvrir séance
                  </button>
                </div>

                {rapport && (
                  <div style={styles.rapportBox}>
                    <p style={styles.meta}>
                      <strong>Rapport :</strong> {rapport.rapport || '-'}
                    </p>
                    <p style={styles.meta}>
                      <strong>Témoignage :</strong> {rapport.temoignage || '-'}
                    </p>
                  </div>
                )}
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
    background: '#f7f1fb',
    minHeight: '100vh',
  },
  backButton: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #2b0a78',
    background: '#fff',
    color: '#2b0a78',
    marginBottom: 14,
    fontWeight: 'bold',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    width: '100%',
  },
  box: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'center',
    color: '#2b0a78',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  itemTitle: {
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
  openButton: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  rapportBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: '#fff7fc',
    border: '1px solid #f0cde5',
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}

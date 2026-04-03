import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'

export default function StudentDetailPage({ studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [seances, setSeances] = useState([])
  const [presences, setPresences] = useState({})

  useEffect(() => {
    loadData()
  }, [studentId])

  async function loadData() {
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    setStudent(studentData)

    if (!studentData?.class_id) return

    const { data: seancesData } = await supabase
      .from('seances')
      .select('*')
      .eq('class_id', studentData.class_id)
      .order('numero_seance', { ascending: true })

    setSeances(seancesData || [])

    const { data: pres } = await supabase
      .from('presences')
      .select('*')
      .eq('student_id', studentId)

    const map = {}
    ;(pres || []).forEach((p) => {
      map[p.seance_id] = p.statut
    })

    setPresences(map)
  }

  function getCoursFaits() {
    return Object.values(presences).filter((v) => v === 'present').length
  }

  function getCoursRates() {
    return seances.length - getCoursFaits()
  }

  function isContributionOk() {
    const mois = Math.floor(seances.length / 4)
    return (student?.contribution_avance || 0) >= mois
  }

  if (!student) {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={onBack}>
          ← Retour
        </button>
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        ← Retour
      </button>

      <div style={styles.card}>
        <h2>
          {student.nom} {student.prenom}
        </h2>

        <p><strong>Matricule :</strong> {student.matricule || '-'}</p>
        <p>Inscription : {student.inscription_paye ? 'Payée' : 'Non payée'}</p>
        <p>Contribution à jour : {isContributionOk() ? 'Oui' : 'Non'}</p>
      </div>

      <div style={styles.card}>
        <h3>QR Code étudiant</h3>

        {student.matricule ? (
          <div style={styles.qrBox}>
            <QRCodeSVG value={student.matricule} size={220} />
            <p style={styles.qrText}>{student.matricule}</p>
          </div>
        ) : (
          <p>Aucun matricule trouvé.</p>
        )}
      </div>

      <div style={styles.card}>
        <p><strong>Total séances :</strong> {seances.length}</p>
        <p><strong>Cours suivis :</strong> {getCoursFaits()}</p>
        <p><strong>Cours ratés :</strong> {getCoursRates()}</p>
      </div>

      <div style={styles.card}>
        <h3>Détail des séances</h3>

        {seances.length === 0 ? (
          <p>Aucune séance pour cette classe.</p>
        ) : (
          seances.map((s) => (
            <div key={s.id} style={styles.seanceItem}>
              {s.chapitre} →{' '}
              {presences[s.id] === 'present'
                ? 'Présent'
                : presences[s.id] === 'absent'
                ? 'Absent'
                : 'Absent'}
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
  },
  backButton: {
    marginBottom: 16,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #999',
    background: '#f5f5f5',
  },
  card: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  qrText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  seanceItem: {
    marginBottom: 8,
    padding: 10,
    border: '1px solid #ddd',
    borderRadius: 8,
  },
}

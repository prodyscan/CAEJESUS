import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyForm = {
  student_id: '',
  date_rattrapage: new Date().toISOString().slice(0, 10),
  observation: '',
}

export default function RattrapagesPage({ profile }) {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [seances, setSeances] = useState([])
  const [presences, setPresences] = useState([])
  const [rattrapages, setRattrapages] = useState([])
  const [filterClassId, setFilterClassId] = useState('all')
  const [searchStudent, setSearchStudent] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [selectedCoursIds, setSelectedCoursIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    if (isAdmin) {
      setFilterClassId('all')
    } else {
      setFilterClassId(assistantClassId || 'all')
    }
  }, [isAdmin, assistantClassId])

  useEffect(() => {
    loadAll()
  }, [profile])

  useEffect(() => {
    setSelectedCoursIds([])
    setForm((prev) => ({
      ...prev,
      student_id: '',
      date_rattrapage: new Date().toISOString().slice(0, 10),
      observation: '',
    }))
  }, [filterClassId])

  async function loadAll() {
    setMessage('')
    await Promise.all([
      getClasses(),
      getStudents(),
      getSeances(),
      getPresences(),
      getRattrapages(),
    ])
  }

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
      setMessage('Erreur chargement centres')
      return
    }

    setClasses(data || [])
  }

  async function getStudents() {
    let query = supabase
      .from('students')
      .select('*')
      .order('nom', { ascending: true })

    if (!isAdmin && assistantClassId) {
      query = query.eq('class_id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement étudiants')
      return
    }

    setStudents(data || [])
  }

  async function getSeances() {
    let query = supabase
      .from('seances')
      .select('*')
      .order('date_seance', { ascending: true })

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

  async function getPresences() {
    const { data, error } = await supabase
      .from('presences')
      .select('*')

    if (error) {
      console.log(error)
      setMessage('Erreur chargement présences')
      return
    }

    setPresences(data || [])
  }

  async function getRattrapages() {
    const { data, error } = await supabase
      .from('rattrapages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement rattrapages')
      return
    }

    setRattrapages(data || [])
  }

  function getClassById(classId) {
    return classes.find((c) => String(c.id) === String(classId)) || null
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === 'student_id') {
      setSelectedCoursIds([])
    }
  }

  const filteredStudents = useMemo(() => {
    let result = students

    if (filterClassId !== 'all') {
      result = result.filter(
        (student) => String(student.class_id) === String(filterClassId)
      )
    }

    const query = searchStudent.trim().toLowerCase()

    if (!query) return result

    return result.filter((student) => {
      const fullName =
        `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
      const matricule = (student.matricule || '').toLowerCase()

      return fullName.includes(query) || matricule.includes(query)
    })
  }, [students, filterClassId, searchStudent])

  const selectedStudent = useMemo(() => {
    return (
      students.find((s) => String(s.id) === String(form.student_id)) || null
    )
  }, [students, form.student_id])

  const coursARattraper = useMemo(() => {
    if (!selectedStudent) return []

    const lignes = []

    const studentPresences = presences.filter(
      (p) => String(p.student_id) === String(selectedStudent.id)
    )

    const absences = studentPresences.filter((p) => p.statut === 'absent')

    absences.forEach((absence) => {
      const seance = seances.find(
        (s) => String(s.id) === String(absence.seance_id)
      )
      if (!seance) return

      const classe = getClassById(seance.class_id)

      const chapitres = String(seance.chapitre || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (chapitres.length === 0) {
        const dejaRattrape = rattrapages.some(
          (r) =>
            String(r.student_id) === String(selectedStudent.id) &&
            String(r.seance_id) === String(seance.id) &&
            String(r.chapitre_index || 0) === '0'
        )

        if (!dejaRattrape) {
          lignes.push({
            id: `absence-${seance.id}-0`,
            seance_id: seance.id,
            chapitre_index: 0,
            chapitre: '-',
            date_seance: seance.date_seance || '-',
            numero_seance: seance.numero_seance || '-',
            class_name: classe?.nom || '-',
            annee: classe?.annee || '-',
            origine: 'absence',
          })
        }

        return
      }

      chapitres.forEach((chapitre, index) => {
        const dejaRattrape = rattrapages.some(
          (r) =>
            String(r.student_id) === String(selectedStudent.id) &&
            String(r.seance_id) === String(seance.id) &&
            String(r.chapitre_index) === String(index)
        )

        if (dejaRattrape) return

        lignes.push({
          id: `absence-${seance.id}-${index}`,
          seance_id: seance.id,
          chapitre_index: index,
          chapitre,
          date_seance: seance.date_seance || '-',
          numero_seance: seance.numero_seance || '-',
          class_name: classe?.nom || '-',
          annee: classe?.annee || '-',
          origine: 'absence',
        })
      })
    })

    if (selectedStudent.est_transfere) {
      const ancienValide = Number(
        selectedStudent.seances_validees_avant_transfert || 0
      )

      const seancesDuCentre = seances
        .filter(
          (s) => String(s.class_id) === String(selectedStudent.class_id)
        )
        .sort((a, b) => {
          const da = new Date(a.date_seance || 0).getTime()
          const db = new Date(b.date_seance || 0).getTime()
          return da - db
        })

      const tousLesCoursCentre = []

      seancesDuCentre.forEach((seance) => {
        const classe = getClassById(seance.class_id)

        const chapitres = String(seance.chapitre || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)

        if (chapitres.length === 0) {
          tousLesCoursCentre.push({
            id: `transfert-${seance.id}-0`,
            seance_id: seance.id,
            chapitre_index: 0,
            chapitre: '-',
            date_seance: seance.date_seance || '-',
            numero_seance: seance.numero_seance || '-',
            class_name: classe?.nom || '-',
            annee: classe?.annee || '-',
            origine: 'transfert',
          })
          return
        }

        chapitres.forEach((chapitre, index) => {
          tousLesCoursCentre.push({
            id: `transfert-${seance.id}-${index}`,
            seance_id: seance.id,
            chapitre_index: index,
            chapitre,
            date_seance: seance.date_seance || '-',
            numero_seance: seance.numero_seance || '-',
            class_name: classe?.nom || '-',
            annee: classe?.annee || '-',
            origine: 'transfert',
          })
        })
      })

      const coursManquantsTransfert = tousLesCoursCentre.slice(ancienValide)

      coursManquantsTransfert.forEach((item) => {
        const dejaRattrape = rattrapages.some(
          (r) =>
            String(r.student_id) === String(selectedStudent.id) &&
            String(r.seance_id) === String(item.seance_id) &&
            String(r.chapitre_index || 0) === String(item.chapitre_index || 0)
        )

        if (dejaRattrape) return

        const dejaDansListe = lignes.some(
          (ligne) =>
            String(ligne.seance_id) === String(item.seance_id) &&
            String(ligne.chapitre_index || 0) ===
              String(item.chapitre_index || 0)
        )

        if (dejaDansListe) return

        lignes.push(item)
      })
    }

    return lignes
  }, [selectedStudent, presences, seances, rattrapages, classes])

  const historiqueRattrapages = useMemo(() => {
    return rattrapages
      .filter((r) => {
        if (filterClassId === 'all') return true
        return String(r.class_id) === String(filterClassId)
      })
      .map((r) => {
        const student = students.find(
          (s) => String(s.id) === String(r.student_id)
        )
        const seance = seances.find(
          (s) => String(s.id) === String(r.seance_id)
        )

        return {
          ...r,
          studentName: `${student?.nom || '-'} ${student?.prenom || ''}`.trim(),
          matricule: student?.matricule || '-',
          chapitre: r.chapitre_label || '-',
          date_seance: seance?.date_seance || '-',
        }
      })
  }, [rattrapages, students, seances, filterClassId])

  function toggleCours(coursId) {
    setSelectedCoursIds((prev) => {
      const exists = prev.includes(coursId)
      if (exists) {
        return prev.filter((id) => id !== coursId)
      }
      return [...prev, coursId]
    })
  }

  async function saveRattrapage(e) {
    e.preventDefault()
    setMessage('')

    if (!form.student_id) {
      setMessage("Choisis d'abord un étudiant")
      return
    }

    if (selectedCoursIds.length === 0) {
      setMessage('Choisis au moins un cours à rattraper')
      return
    }

    setLoading(true)

    const payload = selectedCoursIds.map((coursId) => {
      const item = coursARattraper.find((c) => c.id === coursId)

      return {
        student_id: form.student_id,
        seance_id: item.seance_id,
        class_id: selectedStudent?.class_id || null,
        chapitre_index: item.chapitre_index,
        chapitre_label: item.chapitre,
        date_rattrapage:
          form.date_rattrapage || new Date().toISOString().slice(0, 10),
        observation: form.observation.trim(),
      }
    })

    const { error } = await supabase
      .from('rattrapages')
      .insert(payload)

    setLoading(false)

    if (error) {
      console.log(error)
      const errorMessage = error.message?.toLowerCase() || ''

      if (
        errorMessage.includes('duplicate') ||
        errorMessage.includes('unique')
      ) {
        setMessage('Un ou plusieurs cours ont déjà été rattrapés')
        return
      }

      setMessage('Erreur enregistrement rattrapage')
      return
    }

    setMessage('Rattrapage enregistré')
    setForm({
      ...emptyForm,
      date_rattrapage: new Date().toISOString().slice(0, 10),
    })
    setSelectedCoursIds([])
    getRattrapages()
  }

  async function deleteRattrapage(id) {
    const ok = window.confirm('Supprimer ce rattrapage ?')
    if (!ok) return

    const { error } = await supabase
      .from('rattrapages')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression rattrapage')
      return
    }

    setMessage('Rattrapage supprimé')
    getRattrapages()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Rattrapages</h2>

        {isAdmin && (
          <select
            style={styles.input}
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
          >
            <option value="all">Tous les centres</option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom} - {classe.annee}ère année
              </option>
            ))}
          </select>
        )}

        <input
          style={styles.input}
          placeholder="Rechercher un étudiant..."
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
        />

        <form onSubmit={saveRattrapage}>
          <select
            style={styles.input}
            name="student_id"
            value={form.student_id}
            onChange={handleChange}
          >
            <option value="">Choisir un étudiant</option>
            {filteredStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nom} {student.prenom}{' '}
                {student.matricule ? `- ${student.matricule}` : ''}
              </option>
            ))}
          </select>

          {selectedStudent && (
            <div style={styles.infoBox}>
              <p>
                <strong>Étudiant :</strong> {selectedStudent.nom}{' '}
                {selectedStudent.prenom}
              </p>
              <p>
                <strong>Centre :</strong>{' '}
                {getClassById(selectedStudent.class_id)?.nom || '-'}
              </p>
              <p>
                <strong>Matricule :</strong> {selectedStudent.matricule || '-'}
              </p>
            </div>
          )}

          <input
            style={styles.input}
            type="date"
            name="date_rattrapage"
            value={form.date_rattrapage}
            onChange={handleChange}
          />

          <textarea
            style={styles.textarea}
            name="observation"
            placeholder="Observation (optionnel)"
            value={form.observation}
            onChange={handleChange}
          />

          <div style={styles.cardMini}>
            <h3 style={styles.sectionTitle}>Cours à rattraper</h3>

            {!selectedStudent ? (
              <p>Choisis un étudiant pour voir ses cours à rattraper.</p>
            ) : coursARattraper.length === 0 ? (
              <p>Aucun cours à rattraper.</p>
            ) : (
              coursARattraper.map((item) => {
                const checked = selectedCoursIds.includes(item.id)

                return (
                  <label key={item.id} style={styles.checkboxCard}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCours(item.id)}
                    />

                    <div style={styles.checkboxContent}>
                      <strong style={styles.courseTitle}>
                        {item.chapitre}
                      </strong>

                      <p style={styles.meta}>
                        Date séance : {item.date_seance}
                      </p>

                      <p style={styles.meta}>
                        Numéro séance : {item.numero_seance}
                      </p>

                      <p style={styles.meta}>
                        Centre : {item.class_name}
                      </p>

                      <p style={styles.meta}>
                        Année : {item.annee}
                      </p>

                      {item.origine === 'transfert' ? (
                        <p style={styles.coursTransfert}>
                          Cours manquant après transfert
                        </p>
                      ) : (
                        <p style={styles.coursRate}>Cours raté</p>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <button
            type="submit"
            style={styles.primaryButtonFull}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Valider rattrapage'}
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Historique des rattrapages</h3>

        {historiqueRattrapages.length === 0 ? (
          <p>Aucun rattrapage enregistré.</p>
        ) : (
          historiqueRattrapages.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              <strong style={styles.studentName}>{item.studentName}</strong>

              <p style={styles.meta}>Matricule : {item.matricule}</p>
              <p style={styles.meta}>Cours : {item.chapitre}</p>
              <p style={styles.meta}>
                Date séance ratée : {item.date_seance}
              </p>
              <p style={styles.coursRattrape}>
                Rattrapé le : {item.date_rattrapage}
              </p>
              <p style={styles.meta}>
                Observation : {item.observation || '-'}
              </p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deleteRattrapage(item.id)}
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
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },

  card: {
    background: '#ffffff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  cardMini: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    fontWeight: 'bold',
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

  textarea: {
    width: '100%',
    minHeight: 90,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    resize: 'vertical',
    background: '#fff',
  },

  infoBox: {
    background: '#fff7fc',
    border: '2px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    color: '#2b0a78',
  },

  checkboxCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },

  checkboxContent: {
    flex: 1,
  },

  courseTitle: {
    color: '#2b0a78',
    fontSize: 18,
    whiteSpace: 'pre-wrap',
  },

  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },

  studentName: {
    color: '#2b0a78',
    fontSize: 20,
  },

  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },

  coursRate: {
    color: '#d91e18',
    fontWeight: 'bold',
    margin: '8px 0 0',
  },

  coursTransfert: {
    color: '#1565c0',
    fontWeight: 'bold',
    margin: '8px 0 0',
  },

  coursRattrape: {
    color: '#1565c0',
    fontWeight: 'bold',
    margin: '8px 0',
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
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 15,
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

const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/exams — list professor's exams
router.get('/', auth, async (req, res) => {
  try {
    const [exams] = await db.query(
      `SELECT e.*, 
        (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) AS question_count,
        (SELECT COUNT(*) FROM candidates WHERE exam_id = e.id AND is_completed = 1) AS completed_count
       FROM exams e WHERE e.professor_id = ? ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/exams/:id — single exam with questions
router.get('/:id', auth, async (req, res) => {
  try {
    const [exams] = await db.query('SELECT * FROM exams WHERE id = ? AND professor_id = ?', [req.params.id, req.user.id]);
    if (exams.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });

    const [questions] = await db.query(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index',
      [req.params.id]
    );
    for (const q of questions) {
      const [choices] = await db.query('SELECT * FROM choices WHERE question_id = ? ORDER BY order_index', [q.id]);
      q.choices = choices;
    }
    res.json({ ...exams[0], questions });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/exams — create exam
router.post('/', auth, async (req, res) => {
  const { title, description, duration_per_question, instructions, is_active, require_location } = req.body;
  if (!title) return res.status(400).json({ message: 'Titre requis' });
  try {
    const [result] = await db.query(
      'INSERT INTO exams (professor_id, title, description, duration_per_question, instructions, is_active, require_location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', duration_per_question || 30, instructions || '', is_active !== false, require_location !== false]
    );
    res.status(201).json({ id: result.insertId, message: 'Examen créé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT /api/exams/:id — update exam
router.put('/:id', auth, async (req, res) => {
  const { title, description, duration_per_question, instructions, is_active, require_location } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM exams WHERE id = ? AND professor_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });

    await db.query(
      'UPDATE exams SET title=?, description=?, duration_per_question=?, instructions=?, is_active=?, require_location=? WHERE id=?',
      [title, description, duration_per_question, instructions, is_active, require_location, req.params.id]
    );
    res.json({ message: 'Examen mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM exams WHERE id = ? AND professor_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });
    await db.query('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Examen supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /api/exams/:id/candidates — results
router.get('/:id/candidates', auth, async (req, res) => {
  try {
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND professor_id = ?', [req.params.id, req.user.id]);
    if (exam.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });

    const [candidates] = await db.query(
      `SELECT c.*, 
        ST_X(POINT(c.longitude, c.latitude)) as lng,
        ST_Y(POINT(c.longitude, c.latitude)) as lat
       FROM candidates c WHERE c.exam_id = ? ORDER BY c.started_at DESC`,
      [req.params.id]
    );
    res.json(candidates);
  } catch (err) {
    // fallback without spatial
    const [candidates] = await db.query(
      'SELECT * FROM candidates WHERE exam_id = ? ORDER BY started_at DESC',
      [req.params.id]
    );
    res.json(candidates);
  }
});

// GET /api/exams/:id/export — export to excel data
router.get('/:id/export', auth, async (req, res) => {
  try {
    const [exam] = await db.query('SELECT * FROM exams WHERE id = ? AND professor_id = ?', [req.params.id, req.user.id]);
    if (exam.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });

    const [candidates] = await db.query(
      'SELECT email, first_name, last_name, apogee_code, score, correct_answers, total_questions, latitude, longitude, started_at, completed_at FROM candidates WHERE exam_id = ? ORDER BY last_name',
      [req.params.id]
    );

    const XLSX = require('xlsx');
    const data = candidates.map(c => ({
      'Nom': c.last_name,
      'Prénom': c.first_name,
      'Email': c.email,
      'Code Apogée': c.apogee_code,
      'Score /100': c.score || 0,
      'Bonnes réponses': c.correct_answers || 0,
      'Total questions': c.total_questions || 0,
      'Latitude': c.latitude || '',
      'Longitude': c.longitude || '',
      'Début': c.started_at,
      'Fin': c.completed_at || 'Non terminé'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Résultats');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="resultats_${exam[0].title}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: 'Erreur export', error: err.message });
  }
});

module.exports = router;

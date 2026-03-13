const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/candidate/exam/:examId — get public exam info + questions (no correct answers)
router.get('/exam/:examId', async (req, res) => {
  try {
    const [exams] = await db.query(
      'SELECT id, title, description, duration_per_question, instructions, require_location FROM exams WHERE id = ? AND is_active = 1',
      [req.params.examId]
    );
    if (exams.length === 0) return res.status(404).json({ message: 'Examen non trouvé ou inactif' });

    const [questions] = await db.query(
      'SELECT id, question_text, media_type, media_url, order_index FROM questions WHERE exam_id = ? ORDER BY order_index',
      [req.params.examId]
    );
    for (const q of questions) {
      const [choices] = await db.query(
        'SELECT id, choice_text, order_index FROM choices WHERE question_id = ? ORDER BY order_index',
        [q.id]
      );
      q.choices = choices; // no is_correct field exposed
    }
    res.json({ ...exams[0], questions });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/candidate/register — register candidate before exam
router.post('/register', async (req, res) => {
  const { exam_id, email, first_name, last_name, apogee_code, latitude, longitude } = req.body;
  if (!exam_id || !email || !first_name || !last_name || !apogee_code)
    return res.status(400).json({ message: 'Tous les champs sont requis' });

  try {
    // Check exam exists
    const [exams] = await db.query('SELECT id, require_location FROM exams WHERE id = ? AND is_active = 1', [exam_id]);
    if (exams.length === 0) return res.status(404).json({ message: 'Examen non trouvé' });

    // Check already completed
    const [existing] = await db.query(
      'SELECT id, is_completed FROM candidates WHERE exam_id = ? AND apogee_code = ?',
      [exam_id, apogee_code]
    );
    if (existing.length > 0 && existing[0].is_completed)
      return res.status(409).json({ message: 'Vous avez déjà passé cet examen', already_completed: true });

    if (existing.length > 0)
      return res.json({ candidate_id: existing[0].id, message: 'Session reprise' });

    const ip = req.ip || req.connection.remoteAddress;
    const [result] = await db.query(
      'INSERT INTO candidates (exam_id, email, first_name, last_name, apogee_code, latitude, longitude, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [exam_id, email, first_name, last_name, apogee_code, latitude || null, longitude || null, ip]
    );
    res.status(201).json({ candidate_id: result.insertId, message: 'Candidat enregistré' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/candidate/answer — submit one answer
router.post('/answer', async (req, res) => {
  const { candidate_id, question_id, choice_id } = req.body;
  if (!candidate_id || !question_id)
    return res.status(400).json({ message: 'Données manquantes' });

  try {
    // Check candidate exists and not completed
    const [candidates] = await db.query('SELECT id, is_completed FROM candidates WHERE id = ?', [candidate_id]);
    if (candidates.length === 0) return res.status(404).json({ message: 'Candidat non trouvé' });
    if (candidates[0].is_completed) return res.status(409).json({ message: 'Examen déjà terminé' });

    // Check if already answered this question
    const [existing] = await db.query(
      'SELECT id FROM candidate_answers WHERE candidate_id = ? AND question_id = ?',
      [candidate_id, question_id]
    );

    let is_correct = false;
    if (choice_id) {
      const [choice] = await db.query('SELECT is_correct FROM choices WHERE id = ?', [choice_id]);
      if (choice.length > 0) is_correct = choice[0].is_correct;
    }

    if (existing.length > 0) {
      await db.query(
        'UPDATE candidate_answers SET choice_id=?, is_correct=?, answered_at=NOW() WHERE candidate_id=? AND question_id=?',
        [choice_id || null, is_correct, candidate_id, question_id]
      );
    } else {
      await db.query(
        'INSERT INTO candidate_answers (candidate_id, question_id, choice_id, is_correct) VALUES (?, ?, ?, ?)',
        [candidate_id, question_id, choice_id || null, is_correct]
      );
    }
    res.json({ is_correct, message: 'Réponse enregistrée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/candidate/finish — finish exam and compute score
router.post('/finish', async (req, res) => {
  const { candidate_id } = req.body;
  if (!candidate_id) return res.status(400).json({ message: 'candidate_id requis' });

  try {
    const [candidates] = await db.query('SELECT * FROM candidates WHERE id = ?', [candidate_id]);
    if (candidates.length === 0) return res.status(404).json({ message: 'Candidat non trouvé' });
    if (candidates[0].is_completed)
      return res.json({ score: candidates[0].score, message: 'Examen déjà terminé' });

    const [answers] = await db.query(
      'SELECT COUNT(*) as total, SUM(is_correct) as correct FROM candidate_answers WHERE candidate_id = ?',
      [candidate_id]
    );
    const total = answers[0].total || 0;
    const correct = answers[0].correct || 0;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    await db.query(
      'UPDATE candidates SET is_completed=1, completed_at=NOW(), score=?, correct_answers=?, total_questions=? WHERE id=?',
      [score, correct, total, candidate_id]
    );
    res.json({ score, correct, total, message: 'Examen terminé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

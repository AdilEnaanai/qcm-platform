const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Verify exam ownership
async function verifyExamOwner(examId, userId) {
  const [rows] = await db.query('SELECT id FROM exams WHERE id = ? AND professor_id = ?', [examId, userId]);
  return rows.length > 0;
}

// GET /api/exams/:examId/questions
router.get('/', auth, async (req, res) => {
  try {
    if (!await verifyExamOwner(req.params.examId, req.user.id))
      return res.status(403).json({ message: 'Accès refusé' });

    const [questions] = await db.query(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index',
      [req.params.examId]
    );
    for (const q of questions) {
      const [choices] = await db.query('SELECT * FROM choices WHERE question_id = ? ORDER BY order_index', [q.id]);
      q.choices = choices;
    }
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST /api/exams/:examId/questions
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    if (!await verifyExamOwner(req.params.examId, req.user.id))
      return res.status(403).json({ message: 'Accès refusé' });

    const { question_text, media_type, points, order_index, choices } = req.body;
    if (!question_text) return res.status(400).json({ message: 'Texte de question requis' });

    let media_url = null;
    if (req.file) {
      media_url = `/uploads/${req.file.filename}`;
    }

    // Calculer le prochain order_index
const [[{ maxOrder }]] = await db.query(
  'SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM questions WHERE exam_id = ?',
  [req.params.examId]
);
const nextOrder = maxOrder + 1;
    const [result] = await db.query(
  'INSERT INTO questions (exam_id, question_text, media_type, media_url, points, order_index) VALUES (?, ?, ?, ?, ?, ?)',
  [req.params.examId, question_text, media_type || 'none', media_url, points || 1, nextOrder]
);
    const questionId = result.insertId;

    // Insert choices
    const parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : choices;
    if (parsedChoices && parsedChoices.length > 0) {
      for (let i = 0; i < parsedChoices.length; i++) {
        const c = parsedChoices[i];
        await db.query(
          'INSERT INTO choices (question_id, choice_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
          [questionId, c.choice_text, c.is_correct || false, i]
        );
      }
    }

    res.status(201).json({ id: questionId, message: 'Question créée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT /api/exams/:examId/questions/:id
router.put('/:id', auth, upload.single('media'), async (req, res) => {
  try {
    if (!await verifyExamOwner(req.params.examId, req.user.id))
      return res.status(403).json({ message: 'Accès refusé' });

    const { question_text, media_type, points, order_index, choices } = req.body;

    let media_url = req.body.existing_media_url || null;
    if (req.file) media_url = `/uploads/${req.file.filename}`;

    await db.query(
      'UPDATE questions SET question_text=?, media_type=?, media_url=?, points=?, order_index=? WHERE id=? AND exam_id=?',
      [question_text, media_type || 'none', media_url, points || 1, order_index || 0, req.params.id, req.params.examId]
    );

    // Replace choices
    await db.query('DELETE FROM choices WHERE question_id = ?', [req.params.id]);
    const parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : choices;
    if (parsedChoices && parsedChoices.length > 0) {
      for (let i = 0; i < parsedChoices.length; i++) {
        const c = parsedChoices[i];
        await db.query(
          'INSERT INTO choices (question_id, choice_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
          [req.params.id, c.choice_text, c.is_correct || false, i]
        );
      }
    }

    res.json({ message: 'Question mise à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE /api/exams/:examId/questions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!await verifyExamOwner(req.params.examId, req.user.id))
      return res.status(403).json({ message: 'Accès refusé' });
    await db.query('DELETE FROM questions WHERE id = ? AND exam_id = ?', [req.params.id, req.params.examId]);
    res.json({ message: 'Question supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

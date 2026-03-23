const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

// Verify exam ownership
async function verifyExamOwner(examId, userId) {
  const [rows] = await db.query('SELECT id FROM exams WHERE id = ? AND professor_id = ?', [examId, userId]);
  return rows.length > 0;
}

// POST /api/exams/:examId/generate-questions
router.post('/', auth, async (req, res) => {
  try {
    if (!await verifyExamOwner(req.params.examId, req.user.id))
      return res.status(403).json({ message: 'Accès refusé' });

    const { topic, count = 5, level = 'intermédiaire', language = 'français', save = false } = req.body;

    if (!topic) return res.status(400).json({ message: 'Le sujet est requis' });
    if (count < 1 || count > 20) return res.status(400).json({ message: 'Entre 1 et 20 questions' });

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ message: 'Clé API Anthropic non configurée' });

    const prompt = `Tu es un expert en création d'examens universitaires. Génère exactement ${count} question(s) QCM (Questionnaire à Choix Multiple) sur le sujet suivant : "${topic}".

Niveau : ${level}
Langue : ${language}

RÈGLES STRICTES :
- Chaque question doit avoir exactement 4 choix de réponse
- UNE SEULE réponse correcte par question
- Les questions doivent être claires, précises et pédagogiques
- Les distracteurs (mauvaises réponses) doivent être plausibles mais clairement incorrects

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, exactement dans ce format :
{
  "questions": [
    {
      "question_text": "Texte de la question ?",
      "points": 1,
      "choices": [
        { "choice_text": "Réponse correcte", "is_correct": true },
        { "choice_text": "Mauvaise réponse 1", "is_correct": false },
        { "choice_text": "Mauvaise réponse 2", "is_correct": false },
        { "choice_text": "Mauvaise réponse 3", "is_correct": false }
      ]
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ message: 'Erreur API Anthropic', error: err });
    }

    const data = await response.json();
    const text = data.content[0].text;

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ message: 'Réponse IA invalide', raw: text });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ message: 'Format de réponse IA invalide' });
    }

    // If save=true, directly insert into DB
    if (save) {
      const [existing] = await db.query('SELECT COUNT(*) as cnt FROM questions WHERE exam_id = ?', [req.params.examId]);
      let orderIndex = existing[0].cnt;

      for (const q of parsed.questions) {
        const [result] = await db.query(
          'INSERT INTO questions (exam_id, question_text, media_type, media_url, points, order_index) VALUES (?, ?, ?, ?, ?, ?)',
          [req.params.examId, q.question_text, 'none', null, q.points || 1, orderIndex++]
        );
        const questionId = result.insertId;
        for (let i = 0; i < q.choices.length; i++) {
          const c = q.choices[i];
          await db.query(
            'INSERT INTO choices (question_id, choice_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
            [questionId, c.choice_text, c.is_correct, i]
          );
        }
      }
      return res.json({ message: `${parsed.questions.length} questions générées et sauvegardées`, saved: true, questions: parsed.questions });
    }

    res.json({ questions: parsed.questions, saved: false });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

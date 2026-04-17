import { Router } from 'express'
import { sql } from '../lib/db'
import { generateReport } from '../utils/reportGenerator'

const router = Router()

router.post('/submit', async (req, res) => {
  try {
    const { assessment_type_id, email, name, answers } = req.body

    if (!assessment_type_id || !answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'assessment_type_id and answers are required' })
      return
    }

    const [assessmentType] = await sql`SELECT id FROM assessment_types WHERE id = ${assessment_type_id}`
    if (!assessmentType) {
      res.status(404).json({ error: 'Assessment type not found' })
      return
    }

    // Resolve question codes to full question rows for metadata
    const questionCodes = Object.keys(answers)
    const questions =
      questionCodes.length > 0
        ? await sql`
            SELECT q.id, q.question_code, q.question_text, q.question_type,
                   c.name AS category_name
            FROM questions q
            JOIN categories c ON c.id = q.category_id
            WHERE q.question_code = ANY(${questionCodes})
              AND c.assessment_type_id = ${assessment_type_id}
          `
        : []

    const questionMap = new Map(questions.map((q: Record<string, unknown>) => [q.question_code as string, q]))

    const [assessment] = await sql`
      INSERT INTO assessments (assessment_type_id, email, name)
      VALUES (${assessment_type_id}, ${email ?? null}, ${name ?? null})
      RETURNING id
    `

    if (questionCodes.length > 0) {
      const answerRows = questionCodes
        .filter(code => answers[code] !== undefined && answers[code] !== '')
        .map(code => {
          const q = questionMap.get(code)
          return {
            assessment_id: assessment.id,
            question_id: q ? q.id : null,
            question_code: code,
            question_text: q ? q.question_text : code,
            category_name: q ? q.category_name : 'Unknown',
            answer_value: JSON.stringify(answers[code]),
          }
        })

      for (const row of answerRows) {
        await sql`
          INSERT INTO assessment_answers
            (assessment_id, question_id, question_code, question_text, category_name, answer_value)
          VALUES
            (${row.assessment_id}, ${row.question_id}, ${row.question_code},
             ${row.question_text}, ${row.category_name}, ${row.answer_value})
        `
      }
    }

    res.status(201).json({ success: true, assessment: { id: assessment.id } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [assessment] = await sql`
      SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at
      FROM assessments a
      WHERE a.id = ${req.params.id}
    `
    if (!assessment) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    if (req.query.format === 'detailed') {
      const rawAnswers = await sql`
        SELECT aa.question_code, aa.question_text, aa.category_name, aa.answer_value,
               q.question_type
        FROM assessment_answers aa
        LEFT JOIN questions q ON q.id = aa.question_id
        WHERE aa.assessment_id = ${assessment.id}
        ORDER BY aa.id ASC
      `

      const dynamic_answers = rawAnswers.map((r: Record<string, unknown>) => ({
        question_code: r.question_code as string,
        question_text: r.question_text as string,
        category_name: r.category_name as string,
        answer_value: tryParseJson(r.answer_value as string),
        question_type: r.question_type as string | undefined,
      }))

      const report = generateReport(dynamic_answers)

      res.json({ success: true, assessment: { ...assessment, dynamic_answers, report } })
    } else {
      res.json({ success: true, assessment })
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/search', async (req, res) => {
  try {
    const { email, name } = req.body
    if (!email && !name) {
      res.status(400).json({ error: 'email or name required' })
      return
    }

    let assessments
    if (email && name) {
      assessments = await sql`
        SELECT id, assessment_type_id, email, name, submitted_at, created_at
        FROM assessments
        WHERE email ILIKE ${'%' + email + '%'}
          AND name ILIKE ${'%' + name + '%'}
        ORDER BY submitted_at DESC
        LIMIT 50
      `
    } else if (email) {
      assessments = await sql`
        SELECT id, assessment_type_id, email, name, submitted_at, created_at
        FROM assessments
        WHERE email ILIKE ${'%' + email + '%'}
        ORDER BY submitted_at DESC
        LIMIT 50
      `
    } else {
      assessments = await sql`
        SELECT id, assessment_type_id, email, name, submitted_at, created_at
        FROM assessments
        WHERE name ILIKE ${'%' + name + '%'}
        ORDER BY submitted_at DESC
        LIMIT 50
      `
    }

    res.json({ success: true, assessments })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

function tryParseJson(val: string | null | undefined): unknown {
  if (val == null) return null
  try {
    return JSON.parse(val as string)
  } catch {
    return val
  }
}

export default router

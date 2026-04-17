import { Router, type Response } from 'express'
import { sql } from '../../lib/db'
import { generateReport } from '../../utils/reportGenerator'

const router = Router()

function blockViewer(res: Response): boolean {
  if (res.locals.user?.role === 'admin-viewer') {
    res.status(403).json({ error: 'Forbidden' })
    return true
  }
  return false
}

function tryParseJson(val: unknown): unknown {
  if (val == null) return null
  if (typeof val !== 'string') return val
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const assessmentTypeId = req.query.assessment_type_id
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    let rows
    if (assessmentTypeId && q) {
      const pat = `%${q}%`
      rows = await sql`
        SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at,
               at.name AS assessment_type_name, at.slug AS assessment_type_slug
        FROM assessments a
        LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
        WHERE a.assessment_type_id = ${assessmentTypeId as string}
          AND (a.email ILIKE ${pat} OR a.name ILIKE ${pat})
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (assessmentTypeId) {
      rows = await sql`
        SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at,
               at.name AS assessment_type_name, at.slug AS assessment_type_slug
        FROM assessments a
        LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
        WHERE a.assessment_type_id = ${assessmentTypeId as string}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (q) {
      const pat = `%${q}%`
      rows = await sql`
        SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at,
               at.name AS assessment_type_name, at.slug AS assessment_type_slug
        FROM assessments a
        LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
        WHERE a.email ILIKE ${pat} OR a.name ILIKE ${pat}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at,
               at.name AS assessment_type_name, at.slug AS assessment_type_slug
        FROM assessments a
        LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM assessments`

    res.json({ success: true, assessments: rows, pagination: { limit, offset, total: count } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [assessment] = await sql`
      SELECT a.id, a.assessment_type_id, a.email, a.name, a.submitted_at, a.created_at,
             at.name AS assessment_type_name, at.slug AS assessment_type_slug
      FROM assessments a
      LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
      WHERE a.id = ${req.params.id}
    `
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' })
      return
    }

    const rawAnswers = await sql`
      SELECT aa.id, aa.question_code, aa.question_text, aa.category_name, aa.answer_value,
             q.question_type
      FROM assessment_answers aa
      LEFT JOIN questions q ON q.id = aa.question_id
      WHERE aa.assessment_id = ${assessment.id}
      ORDER BY aa.id ASC
    `

    const dynamic_answers = rawAnswers.map((r: Record<string, unknown>) => ({
      question_code: r.question_code,
      question_text: r.question_text,
      category_name: r.category_name,
      answer_value: tryParseJson(r.answer_value),
      question_type: r.question_type,
    }))

    const report = generateReport(dynamic_answers as any)

    res.json({ success: true, assessment: { ...assessment, dynamic_answers, report } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    await sql`DELETE FROM assessment_answers WHERE assessment_id = ${id}`
    const result = await sql`DELETE FROM assessments WHERE id = ${id} RETURNING id`
    if (result.length === 0) {
      res.status(404).json({ error: 'Assessment not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

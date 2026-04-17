import { Router, type Response } from 'express'
import { sql } from '../../lib/db'

const router = Router()

const QUESTION_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'url',
  'date',
  'select',
  'multi_select',
  'radio',
  'checkbox',
  'scale',
  'yes_no',
  'percentage_range',
  'file',
  'rich_text',
]

function blockViewer(res: Response): boolean {
  if (res.locals.user?.role === 'admin-viewer') {
    res.status(403).json({ error: 'Forbidden' })
    return true
  }
  return false
}

function toJsonOrNull(val: unknown): string | null {
  if (val === undefined || val === null) return null
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val)
  } catch {
    return null
  }
}

router.get('/', async (req, res) => {
  try {
    const { category_id, assessment_type_id } = req.query

    let rows
    if (category_id) {
      rows = await sql`
        SELECT q.id, q.category_id, q.question_code, q.question_text, q.question_type,
               q.is_required, q.help_text, q.placeholder, q.parent_id, q.display_order,
               q.options, q.validation_rules, q.created_at, q.updated_at
        FROM questions q
        WHERE q.category_id = ${category_id as string}
        ORDER BY q.display_order ASC, q.id ASC
      `
    } else if (assessment_type_id) {
      rows = await sql`
        SELECT q.id, q.category_id, q.question_code, q.question_text, q.question_type,
               q.is_required, q.help_text, q.placeholder, q.parent_id, q.display_order,
               q.options, q.validation_rules, q.created_at, q.updated_at,
               c.name AS category_name
        FROM questions q
        JOIN categories c ON c.id = q.category_id
        WHERE c.assessment_type_id = ${assessment_type_id as string}
        ORDER BY c.display_order ASC, q.display_order ASC, q.id ASC
      `
    } else {
      rows = await sql`
        SELECT q.id, q.category_id, q.question_code, q.question_text, q.question_type,
               q.is_required, q.help_text, q.placeholder, q.parent_id, q.display_order,
               q.options, q.validation_rules, q.created_at, q.updated_at
        FROM questions q
        ORDER BY q.category_id ASC, q.display_order ASC, q.id ASC
      `
    }

    res.json({ success: true, questions: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [question] = await sql`
      SELECT id, category_id, question_code, question_text, question_type,
             is_required, help_text, placeholder, parent_id, display_order,
             options, validation_rules, created_at, updated_at
      FROM questions WHERE id = ${req.params.id}
    `
    if (!question) {
      res.status(404).json({ error: 'Question not found' })
      return
    }
    res.json({ success: true, question })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const {
      category_id,
      question_code,
      question_text,
      question_type,
      is_required = false,
      help_text,
      placeholder,
      parent_id,
      display_order = 0,
      options,
      validation_rules,
    } = req.body ?? {}

    if (!category_id || !question_code || !question_text || !question_type) {
      res
        .status(400)
        .json({ error: 'category_id, question_code, question_text, question_type are required' })
      return
    }

    if (!QUESTION_TYPES.includes(question_type)) {
      res.status(400).json({ error: `Invalid question_type. Allowed: ${QUESTION_TYPES.join(', ')}` })
      return
    }

    const [cat] = await sql`SELECT id FROM categories WHERE id = ${category_id}`
    if (!cat) {
      res.status(400).json({ error: 'category_id not found' })
      return
    }

    const [dup] = await sql`
      SELECT id FROM questions
      WHERE category_id = ${category_id} AND question_code = ${question_code}
    `
    if (dup) {
      res.status(409).json({ error: 'question_code already exists in this category' })
      return
    }

    const [question] = await sql`
      INSERT INTO questions (
        category_id, question_code, question_text, question_type, is_required,
        help_text, placeholder, parent_id, display_order, options, validation_rules
      ) VALUES (
        ${category_id}, ${question_code}, ${question_text}, ${question_type},
        ${Boolean(is_required)}, ${help_text ?? null}, ${placeholder ?? null},
        ${parent_id ?? null}, ${Number(display_order) || 0},
        ${toJsonOrNull(options)}, ${toJsonOrNull(validation_rules)}
      )
      RETURNING id, category_id, question_code, question_text, question_type,
                is_required, help_text, placeholder, parent_id, display_order,
                options, validation_rules, created_at, updated_at
    `
    res.status(201).json({ success: true, question })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const [existing] = await sql`SELECT id, category_id FROM questions WHERE id = ${id}`
    if (!existing) {
      res.status(404).json({ error: 'Question not found' })
      return
    }

    const {
      category_id,
      question_code,
      question_text,
      question_type,
      is_required,
      help_text,
      placeholder,
      parent_id,
      display_order,
      options,
      validation_rules,
    } = req.body ?? {}

    if (question_type !== undefined && !QUESTION_TYPES.includes(question_type)) {
      res.status(400).json({ error: `Invalid question_type. Allowed: ${QUESTION_TYPES.join(', ')}` })
      return
    }

    if (category_id !== undefined) {
      const [cat] = await sql`SELECT id FROM categories WHERE id = ${category_id}`
      if (!cat) {
        res.status(400).json({ error: 'category_id not found' })
        return
      }
    }

    if (question_code !== undefined) {
      const targetCategory = category_id ?? existing.category_id
      const [dup] = await sql`
        SELECT id FROM questions
        WHERE category_id = ${targetCategory}
          AND question_code = ${question_code}
          AND id <> ${id}
      `
      if (dup) {
        res.status(409).json({ error: 'question_code already exists in this category' })
        return
      }
    }

    const [question] = await sql`
      UPDATE questions SET
        category_id = COALESCE(${category_id ?? null}, category_id),
        question_code = COALESCE(${question_code ?? null}, question_code),
        question_text = COALESCE(${question_text ?? null}, question_text),
        question_type = COALESCE(${question_type ?? null}, question_type),
        is_required = COALESCE(${is_required ?? null}, is_required),
        help_text = COALESCE(${help_text ?? null}, help_text),
        placeholder = COALESCE(${placeholder ?? null}, placeholder),
        parent_id = COALESCE(${parent_id ?? null}, parent_id),
        display_order = COALESCE(${display_order ?? null}, display_order),
        options = COALESCE(${toJsonOrNull(options)}, options),
        validation_rules = COALESCE(${toJsonOrNull(validation_rules)}, validation_rules),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, category_id, question_code, question_text, question_type,
                is_required, help_text, placeholder, parent_id, display_order,
                options, validation_rules, created_at, updated_at
    `
    res.json({ success: true, question })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const result = await sql`DELETE FROM questions WHERE id = ${id} RETURNING id`
    if (result.length === 0) {
      res.status(404).json({ error: 'Question not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router, type Response } from 'express'
import { sql } from '../../lib/db'

const router = Router()

function blockViewer(res: Response): boolean {
  if (res.locals.user?.role === 'admin-viewer') {
    res.status(403).json({ error: 'Forbidden' })
    return true
  }
  return false
}

router.get('/', async (req, res) => {
  try {
    const { assessment_type_id } = req.query
    const rows = assessment_type_id
      ? await sql`
          SELECT id, assessment_type_id, name, description, display_order,
                 created_at, updated_at
          FROM categories
          WHERE assessment_type_id = ${assessment_type_id as string}
          ORDER BY display_order ASC, id ASC
        `
      : await sql`
          SELECT id, assessment_type_id, name, description, display_order,
                 created_at, updated_at
          FROM categories
          ORDER BY assessment_type_id ASC, display_order ASC, id ASC
        `
    res.json({ success: true, categories: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [category] = await sql`
      SELECT id, assessment_type_id, name, description, display_order,
             created_at, updated_at
      FROM categories WHERE id = ${req.params.id}
    `
    if (!category) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    const questions = await sql`
      SELECT id, question_code, question_text, question_type, is_required,
             help_text, placeholder, parent_id, display_order, options,
             validation_rules, created_at, updated_at
      FROM questions
      WHERE category_id = ${category.id}
      ORDER BY display_order ASC, id ASC
    `
    res.json({ success: true, category: { ...category, questions } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const { assessment_type_id, name, description, display_order = 0 } = req.body ?? {}
    if (!assessment_type_id || !name) {
      res.status(400).json({ error: 'assessment_type_id and name are required' })
      return
    }
    const [type] = await sql`SELECT id FROM assessment_types WHERE id = ${assessment_type_id}`
    if (!type) {
      res.status(400).json({ error: 'assessment_type_id not found' })
      return
    }

    const [category] = await sql`
      INSERT INTO categories (assessment_type_id, name, description, display_order)
      VALUES (${assessment_type_id}, ${name}, ${description ?? null}, ${Number(display_order) || 0})
      RETURNING id, assessment_type_id, name, description, display_order,
                created_at, updated_at
    `
    res.status(201).json({ success: true, category })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const [existing] = await sql`SELECT id FROM categories WHERE id = ${id}`
    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    const { assessment_type_id, name, description, display_order } = req.body ?? {}

    if (assessment_type_id !== undefined) {
      const [type] = await sql`SELECT id FROM assessment_types WHERE id = ${assessment_type_id}`
      if (!type) {
        res.status(400).json({ error: 'assessment_type_id not found' })
        return
      }
    }

    const [category] = await sql`
      UPDATE categories SET
        assessment_type_id = COALESCE(${assessment_type_id ?? null}, assessment_type_id),
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        display_order = COALESCE(${display_order ?? null}, display_order),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, assessment_type_id, name, description, display_order,
                created_at, updated_at
    `
    res.json({ success: true, category })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const result = await sql`DELETE FROM categories WHERE id = ${id} RETURNING id`
    if (result.length === 0) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

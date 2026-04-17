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

function toJsonOrNull(val: unknown): string | null {
  if (val === undefined || val === null) return null
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val)
  } catch {
    return null
  }
}

router.get('/', async (_req, res) => {
  try {
    const types = await sql`
      SELECT id, name, slug, description, icon, is_active, settings,
             display_order, created_at, updated_at
      FROM assessment_types
      ORDER BY display_order ASC, id ASC
    `
    res.json({ success: true, assessmentTypes: types })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [type] = await sql`
      SELECT id, name, slug, description, icon, is_active, settings,
             display_order, created_at, updated_at
      FROM assessment_types WHERE id = ${req.params.id}
    `
    if (!type) {
      res.status(404).json({ error: 'Assessment type not found' })
      return
    }

    const categories = await sql`
      SELECT id, name, description, display_order, created_at, updated_at
      FROM categories
      WHERE assessment_type_id = ${type.id}
      ORDER BY display_order ASC, id ASC
    `

    const categoriesWithQuestions = await Promise.all(
      categories.map(async (cat: Record<string, unknown>) => {
        const questions = await sql`
          SELECT id, question_code, question_text, question_type, is_required,
                 help_text, placeholder, parent_id, display_order, options,
                 validation_rules, created_at, updated_at
          FROM questions
          WHERE category_id = ${cat.id as number}
          ORDER BY display_order ASC, id ASC
        `
        return { ...cat, questions }
      })
    )

    res.json({ success: true, assessmentType: { ...type, categories: categoriesWithQuestions } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const { name, slug, description, icon, is_active = true, settings, display_order = 0 } =
      req.body ?? {}

    if (!name || !slug) {
      res.status(400).json({ error: 'name and slug are required' })
      return
    }

    const [dup] = await sql`SELECT id FROM assessment_types WHERE slug = ${slug}`
    if (dup) {
      res.status(409).json({ error: 'Slug already in use' })
      return
    }

    const [type] = await sql`
      INSERT INTO assessment_types (name, slug, description, icon, is_active, settings, display_order)
      VALUES (${name}, ${slug}, ${description ?? null}, ${icon ?? null},
              ${Boolean(is_active)}, ${toJsonOrNull(settings)}, ${Number(display_order) || 0})
      RETURNING id, name, slug, description, icon, is_active, settings,
                display_order, created_at, updated_at
    `
    res.status(201).json({ success: true, assessmentType: type })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const [existing] = await sql`SELECT id FROM assessment_types WHERE id = ${id}`
    if (!existing) {
      res.status(404).json({ error: 'Assessment type not found' })
      return
    }

    const { name, slug, description, icon, is_active, settings, display_order } = req.body ?? {}

    if (slug !== undefined) {
      const [dup] = await sql`SELECT id FROM assessment_types WHERE slug = ${slug} AND id <> ${id}`
      if (dup) {
        res.status(409).json({ error: 'Slug already in use' })
        return
      }
    }

    const [type] = await sql`
      UPDATE assessment_types SET
        name = COALESCE(${name ?? null}, name),
        slug = COALESCE(${slug ?? null}, slug),
        description = COALESCE(${description ?? null}, description),
        icon = COALESCE(${icon ?? null}, icon),
        is_active = COALESCE(${is_active ?? null}, is_active),
        settings = COALESCE(${toJsonOrNull(settings)}, settings),
        display_order = COALESCE(${display_order ?? null}, display_order),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, slug, description, icon, is_active, settings,
                display_order, created_at, updated_at
    `
    res.json({ success: true, assessmentType: type })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const result = await sql`DELETE FROM assessment_types WHERE id = ${id} RETURNING id`
    if (result.length === 0) {
      res.status(404).json({ error: 'Assessment type not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

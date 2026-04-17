import { Router } from 'express'
import { sql } from '../lib/db'

const router = Router()

async function buildAssessmentType(type: Record<string, unknown>) {
  const categories = await sql`
    SELECT id, name, description, display_order
    FROM categories
    WHERE assessment_type_id = ${type.id as number}
    ORDER BY display_order ASC, id ASC
  `

  const categoriesWithQuestions = await Promise.all(
    categories.map(async (cat: Record<string, unknown>) => {
      const questions = await sql`
        SELECT id, question_code, question_text, question_type, is_required,
               help_text, placeholder, parent_id, display_order, options, validation_rules
        FROM questions
        WHERE category_id = ${cat.id as number}
        ORDER BY display_order ASC, id ASC
      `
      return { ...cat, questions }
    })
  )

  return { ...type, categories: categoriesWithQuestions }
}

router.get('/', async (req, res) => {
  try {
    const types = await sql`
      SELECT id, name, slug, description, icon, is_active, settings, display_order
      FROM assessment_types
      WHERE is_active = TRUE
      ORDER BY display_order ASC, id ASC
    `
    res.json({ success: true, assessmentTypes: types })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/slug/:slug', async (req, res) => {
  try {
    const [type] = await sql`
      SELECT id, name, slug, description, icon, is_active, settings, display_order
      FROM assessment_types
      WHERE slug = ${req.params.slug}
    `
    if (!type) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const assessmentType = await buildAssessmentType(type)
    res.json({ success: true, assessmentType })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [type] = await sql`
      SELECT id, name, slug, description, icon, is_active, settings, display_order
      FROM assessment_types
      WHERE id = ${req.params.id}
    `
    if (!type) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const assessmentType = await buildAssessmentType(type)
    res.json({ success: true, assessmentType })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

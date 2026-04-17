import { Router } from 'express'
import { sql } from '../lib/db'

const router = Router()

router.get('/category/:categoryId', async (req, res) => {
  try {
    const questions = await sql`
      SELECT id, question_code, question_text, question_type, is_required,
             help_text, placeholder, parent_id, display_order, options, validation_rules
      FROM questions
      WHERE category_id = ${req.params.categoryId}
      ORDER BY display_order ASC, id ASC
    `
    res.json({ success: true, questions })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

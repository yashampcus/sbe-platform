import { Router } from 'express'
import { sql } from '../../lib/db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [userCount] = await sql`SELECT COUNT(*)::int AS count FROM users`
    const [assessmentCount] = await sql`SELECT COUNT(*)::int AS count FROM assessments`
    const [typeCount] = await sql`SELECT COUNT(*)::int AS count FROM assessment_types`
    const [categoryCount] = await sql`SELECT COUNT(*)::int AS count FROM categories`
    const [questionCount] = await sql`SELECT COUNT(*)::int AS count FROM questions`

    const [todayCount] = await sql`
      SELECT COUNT(*)::int AS count FROM assessments
      WHERE created_at >= CURRENT_DATE
    `
    const [weekCount] = await sql`
      SELECT COUNT(*)::int AS count FROM assessments
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `
    const [monthCount] = await sql`
      SELECT COUNT(*)::int AS count FROM assessments
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    const byType = await sql`
      SELECT at.id, at.name, at.slug, COUNT(a.id)::int AS count
      FROM assessment_types at
      LEFT JOIN assessments a ON a.assessment_type_id = at.id
      GROUP BY at.id, at.name, at.slug
      ORDER BY count DESC, at.name ASC
    `

    const recent = await sql`
      SELECT a.id, a.email, a.name, a.assessment_type_id, a.submitted_at, a.created_at,
             at.name AS assessment_type_name
      FROM assessments a
      LEFT JOIN assessment_types at ON at.id = a.assessment_type_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `

    res.json({
      success: true,
      stats: {
        totals: {
          users: userCount.count,
          assessments: assessmentCount.count,
          assessmentTypes: typeCount.count,
          categories: categoryCount.count,
          questions: questionCount.count,
        },
        assessments: {
          today: todayCount.count,
          last7Days: weekCount.count,
          last30Days: monthCount.count,
        },
        byType,
        recent,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import { requireAdmin } from '../../lib/adminAuth'

import statsRouter from './stats'
import appSettingsRouter from './appSettings'
import usersRouter from './users'
import assessmentTypesRouter from './assessmentTypes'
import categoriesRouter from './categories'
import questionsRouter from './questions'
import assessmentsRouter from './assessments'

const router = Router()

router.use(requireAdmin)

router.use('/stats', statsRouter)
router.use('/app-settings', appSettingsRouter)
router.use('/users', usersRouter)
router.use('/assessment-types', assessmentTypesRouter)
router.use('/categories', categoriesRouter)
router.use('/questions', questionsRouter)
router.use('/assessments', assessmentsRouter)

export default router

'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { assessmentTypesAPI, assessmentAPI } from '@/lib/api'
import QuestionInput from '@/components/assessment/QuestionInput'
import AssessmentPreview from '@/components/assessment/AssessmentPreview'
import SuccessPage from '@/components/assessment/SuccessPage'
import Dropdown from '@/components/common/Dropdown'
import { SafeDescriptionHtml } from '@/components/common/RichTextEditor'
import { useBranding } from '@/contexts/BrandingContext'
import BrandLogo from '@/components/common/BrandLogo'

interface Question {
  id?: number
  questionCode?: string
  question_code?: string
  code?: string
  questionText?: string
  question_text?: string
  questionType?: string
  isRequired?: boolean
  helpText?: string
  placeholder?: string
  parent_id?: number
  parentId?: number
  options?: Record<string, any>
  children?: Question[]
  validationRules?: Record<string, any>
  // added during load
  questionNumber?: number
  categoryName?: string
  categoryId?: number
  answerKey?: string
  originalQuestionCode?: string
}

interface Category {
  id: number
  name: string
  description?: string
  questions: Question[]
}

interface AssessmentType {
  id: number
  name: string
  slug?: string
  description?: string
  icon?: string
  is_active?: boolean
  isActive?: boolean
  settings?: { singleQuestionMode?: boolean }
}

interface FormData {
  answers: Record<string, string>
  assessment_type_id: number | null
}

export default function Assessment() {
  const { config: branding } = useBranding()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([])
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | null>(null)
  const [formData, setFormData] = useState<FormData>({ answers: {}, assessment_type_id: null })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [allQuestionsList, setAllQuestionsList] = useState<Question[]>([])
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [submittedAssessmentId, setSubmittedAssessmentId] = useState<number | null>(null)

  useEffect(() => {
    loadAssessmentTypes().catch(err => setError(`Failed to load: ${err.message}`))
  }, [])

  const loadAssessmentTypes = async () => {
    try {
      const res = await assessmentTypesAPI.getAll()
      if (res?.success && res?.assessmentTypes?.length > 0) {
        setAssessmentTypes(res.assessmentTypes)
        const firstType = res.assessmentTypes[0]
        setSelectedAssessmentType(firstType)
        setFormData(prev => ({ ...prev, assessment_type_id: firstType.id }))
        await loadQuestions(firstType.id)
      }
    } catch (err: any) {
      setError('Failed to load assessment types. Please check your connection and try again.')
    }
  }

  const loadQuestions = async (assessmentTypeId: number) => {
    try {
      setLoading(true)
      setError('')
      const typeRes = await assessmentTypesAPI.getById(assessmentTypeId)
      if (!typeRes?.success || !typeRes?.assessmentType) {
        setError('Assessment type not found or has no questions')
        setLoading(false)
        return
      }
      const cats: Category[] = typeRes.assessmentType.categories || []
      setCategories(cats)

      const flattenedQuestions: Question[] = []
      let questionNumber = 1
      cats.forEach(category => {
        ;(category.questions || []).forEach(question => {
          if (question.questionType !== 'group' && !question.parent_id && !question.parentId) {
            flattenedQuestions.push({
              ...question,
              questionNumber,
              categoryName: category.name,
              categoryId: category.id,
              answerKey: String(questionNumber),
              originalQuestionCode: question.questionCode || question.question_code || question.code || `q_${question.id}`,
              children: question.children || [],
            })
            questionNumber++
          }
        })
      })
      setAllQuestionsList(flattenedQuestions)
      setCurrentQuestionIndex(0)
      setShowPreview(false)

      const initialAnswers: Record<string, string> = {}
      flattenedQuestions.forEach(q => { if (q.answerKey) initialAnswers[q.answerKey] = '' })
      setFormData(prev => ({ ...prev, answers: initialAnswers, assessment_type_id: assessmentTypeId }))
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment questions.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string; type: string } }
  ) => {
    const { name, value, type } = e.target
    const actualValue = type === 'checkbox' ? String((e.target as HTMLInputElement).checked) : String(value)

    setFormData(prev => {
      const newAnswers = { ...prev.answers, [name]: actualValue }
      const question = allQuestionsList.find(q => q.answerKey === name)
      if (question?.questionType === 'yes_no' && question.children?.length) {
        const showWhen = question.options?.show_children_when || 'yes'
        const v = actualValue.toLowerCase().trim()
        const isYes = v === 'yes' || v === '1' || v === 'true'
        const isNo = v === 'no' || v === '0' || v === 'false'
        const shouldShow = showWhen === 'any' ? (isYes || isNo) : showWhen === 'no' ? isNo : isYes
        if (!shouldShow) {
          question.children.forEach(child => {
            const childKey = child.questionCode || child.question_code || child.code || `q_${child.id}`
            if (childKey) newAnswers[childKey] = ''
          })
        }
      }
      return { ...prev, answers: newAnswers }
    })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const filteredAnswers: Record<string, string> = {}
      Object.keys(formData.answers).forEach(key => {
        const val = formData.answers[key]
        if (val !== null && val !== undefined && val !== '' && String(val).trim() !== '') {
          filteredAnswers[key] = val
        }
      })

      const questionCodeMap: Record<string, string> = {}
      allQuestionsList.forEach(q => {
        if (q.answerKey && q.originalQuestionCode) questionCodeMap[q.answerKey] = q.originalQuestionCode
      })

      const mappedAnswers: Record<string, string> = {}
      Object.keys(filteredAnswers).forEach(key => {
        mappedAnswers[questionCodeMap[key] || key] = filteredAnswers[key]
      })

      const res = await assessmentAPI.submit({
        answers: mappedAnswers,
        assessment_type_id: formData.assessment_type_id || selectedAssessmentType?.id || null,
      })

      if (res.success) {
        const assessmentId = res.assessment?.id
        if (assessmentId) setSubmittedAssessmentId(assessmentId)
        setSubmissionSuccess(true)
        setShowPreview(false)
        setCurrentQuestionIndex(0)
      } else {
        setError(res.error || 'Submission failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    const initialAnswers: Record<string, string> = {}
    allQuestionsList.forEach(q => { if (q.answerKey) initialAnswers[q.answerKey] = '' })
    setFormData(prev => ({ ...prev, answers: initialAnswers }))
    setCurrentQuestionIndex(0)
    setShowPreview(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < allQuestionsList.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setShowPreview(true)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderChildQuestions = (children: Question[], level = 0): React.ReactNode => {
    return children.map((child) => {
      const childAnswerKey = child.questionCode || child.question_code || child.code || `q_${child.id}`
      const childValue = formData.answers[childAnswerKey!] || ''
      const childYesNoVal = childValue.toLowerCase().trim()
      const isChildYes = childYesNoVal === 'yes' || childYesNoVal === '1' || childYesNoVal === 'true'
      const isChildGroup = child.questionType === 'group'
      const isChildOtherWithKids = child.questionType !== 'yes_no' && child.questionType !== 'group' && (child.children?.length || 0) > 0
      const showSub = (isChildYes || isChildGroup || isChildOtherWithKids) && (child.children?.length || 0) > 0

      return (
        <div
          key={child.id || childAnswerKey}
          className="question-group"
          style={{
            marginBottom: '15px', marginTop: '15px',
            paddingLeft: `${20 + level * 20}px`,
            borderLeft: `${4 + level}px solid ${level === 0 ? '#667eea' : '#48bb78'}`,
            background: level === 0 ? '#f8f9ff' : '#f0fff4',
            padding: '15px', borderRadius: '8px',
          }}
        >
          <label className="question-label" style={{ fontSize: level === 0 ? '1em' : '0.95em' }}>
            <SafeDescriptionHtml as="span" html={child.questionText || child.question_text || ''} />
            {child.isRequired && <span className="required">*</span>}
          </label>
          {child.helpText && <p className="question-help" style={{ fontSize: '0.9em' }}><SafeDescriptionHtml html={child.helpText} /></p>}
          <QuestionInput
            question={{ ...child, questionCode: childAnswerKey }}
            value={childValue}
            onChange={handleChange}
            formData={formData}
          />
          {showSub && child.children && (
            <div style={{ marginTop: '15px' }}>{renderChildQuestions(child.children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  const renderQuestion = (question: Question, questionNum: number) => {
    const answerKey = question.answerKey || String(questionNum)
    const value = formData.answers[answerKey] || ''
    const yesNoVal = value.toLowerCase().trim()
    const isYes = yesNoVal === 'yes' || yesNoVal === '1' || yesNoVal === 'true'
    const isNo = yesNoVal === 'no' || yesNoVal === '0' || yesNoVal === 'false'
    const showWhen = question.options?.show_children_when || 'yes'
    const isGroup = question.questionType === 'group'
    const isOtherWithKids = question.questionType !== 'yes_no' && question.questionType !== 'group' && (question.children?.length || 0) > 0
    const isYesNoAnswered = question.questionType === 'yes_no' && (isYes || isNo)
    const showChildren = (isYesNoAnswered || isGroup || isOtherWithKids) && (question.children?.length || 0) > 0

    const childrenToRender = question.questionType === 'yes_no' && question.children
      ? question.children.filter(child => {
          const raw = child.options?.show_when ?? child.options?.showWhen ?? showWhen
          const w = typeof raw === 'string' ? raw.toLowerCase().trim() : 'any'
          if (!w || w === 'any') return true
          if (w === 'yes') return isYes
          if (w === 'no') return isNo
          return false
        })
      : (question.children || [])

    return (
      <div key={question.id} className="question-group">
        <label className="question-label">
          {questionNum}. <SafeDescriptionHtml as="span" html={question.questionText || ''} />
          {question.isRequired && <span className="required">*</span>}
        </label>
        {question.helpText && <SafeDescriptionHtml html={question.helpText} className="question-help" />}
        <QuestionInput
          question={{ ...question, questionCode: answerKey }}
          value={value}
          onChange={handleChange}
          formData={formData}
        />
        {showChildren && childrenToRender.length > 0 && (
          <div className="conditional-questions" style={{ marginTop: '15px', paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
            {renderChildQuestions(childrenToRender, 0)}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading" style={{ textAlign: 'center', padding: '50px' }}>
          <div className="spinner"></div>
          <p>Loading assessment questions...</p>
        </div>
      </div>
    )
  }

  if (assessmentTypes.length === 0 && !loading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: '#667eea', marginBottom: '20px' }}>No Active Assessments</h2>
          <p style={{ color: '#666', fontSize: '1.1em', marginBottom: '30px' }}>There are currently no active assessment types available.</p>
          <p style={{ color: '#999', fontSize: '0.9em' }}>Please contact your administrator or check back later.</p>
        </div>
      </div>
    )
  }

  if (error && categories.length === 0) {
    return (
      <div className="container">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Error Loading Assessment</h2>
          <p style={{ color: 'red', margin: '20px 0' }}>{error}</p>
          <button onClick={() => selectedAssessmentType && loadQuestions(selectedAssessmentType.id)} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  const isSingleQuestionMode = selectedAssessmentType?.settings?.singleQuestionMode || false

  if (submissionSuccess) {
    return (
      <SuccessPage
        assessmentType={selectedAssessmentType}
        assessmentId={submittedAssessmentId}
        onStartNew={() => {
          setSubmissionSuccess(false)
          setSubmittedAssessmentId(null)
          handleReset()
        }}
      />
    )
  }

  if (showPreview && isSingleQuestionMode) {
    return (
      <AssessmentPreview
        allQuestionsList={allQuestionsList}
        formData={formData}
        selectedAssessmentType={selectedAssessmentType}
        onEditQuestion={index => { setShowPreview(false); setCurrentQuestionIndex(index); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onBackToLast={() => { setShowPreview(false); setCurrentQuestionIndex(Math.max(0, allQuestionsList.length - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
      />
    )
  }

  const typeDropdown = assessmentTypes.length > 1 ? (
    <div className="assessment-type-selector" style={{ marginTop: 14 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 800, color: '#111827' }}>Select Assessment Type:</label>
      <Dropdown
        value={selectedAssessmentType?.id?.toString() || ''}
        onChange={typeId => {
          const type = assessmentTypes.find(t => t.id.toString() === typeId)
          if (type) {
            setCategories([])
            setAllQuestionsList([])
            setCurrentQuestionIndex(0)
            setShowPreview(false)
            setFormData(prev => ({ ...prev, assessment_type_id: type.id, answers: {} }))
            setSelectedAssessmentType(type)
            loadQuestions(type.id)
          }
        }}
        options={assessmentTypes.map(type => ({ value: type.id.toString(), label: type.name, icon: type.icon || '' }))}
        placeholder="Select Assessment Type..."
      />
    </div>
  ) : null

  if (isSingleQuestionMode && allQuestionsList.length > 0) {
    const currentQuestion = allQuestionsList[currentQuestionIndex]
    const answerKey = currentQuestion.answerKey!
    const currentAnswer = formData.answers[answerKey] || ''
    const isLastQuestion = currentQuestionIndex === allQuestionsList.length - 1
    const yesNoVal = currentAnswer.toLowerCase().trim()
    const isYes = yesNoVal === 'yes' || yesNoVal === '1' || yesNoVal === 'true'
    const isNo = yesNoVal === 'no' || yesNoVal === '0' || yesNoVal === 'false'
    const showWhen = currentQuestion.options?.show_children_when || 'yes'
    const isGroup = currentQuestion.questionType === 'group'
    const isOtherWithKids = currentQuestion.questionType !== 'yes_no' && currentQuestion.questionType !== 'group' && (currentQuestion.children?.length || 0) > 0
    const isYesNoAnswered = currentQuestion.questionType === 'yes_no' && (isYes || isNo)
    const showChildren = (isYesNoAnswered || isGroup || isOtherWithKids) && (currentQuestion.children?.length || 0) > 0
    const childrenToRender = currentQuestion.questionType === 'yes_no' && currentQuestion.children
      ? currentQuestion.children.filter(child => {
          const raw = child.options?.show_when ?? child.options?.showWhen ?? showWhen
          const w = typeof raw === 'string' ? raw.toLowerCase().trim() : 'any'
          if (!w || w === 'any') return true
          if (w === 'yes') return isYes
          if (w === 'no') return isNo
          return false
        })
      : (currentQuestion.children || [])

    return (
      <div className="app-shell">
        <div className="app-nav">
          <div className="app-brand">
            <BrandLogo logoUrl={branding?.logoUrl} appName={branding?.appName} width={branding?.logoWidth ?? 56} height={branding?.logoHeight ?? 56} rounded={12} background="rgba(0,0,0,0.04)" foreground="#111827" />
            <div className="app-brand__name">{branding?.appName || 'SBEAMP'}</div>
          </div>
          <div className="app-actions">
            <Link href="/check-results" className="app-btn">🔍 Check Submission</Link>
          </div>
        </div>
        <div className="app-main">
          <div className="app-card">
            <div className="app-card__header">
              <div className="app-card__title">📝 {selectedAssessmentType?.name || 'Assessment'}</div>
              {selectedAssessmentType?.description && <SafeDescriptionHtml html={selectedAssessmentType.description} className="app-card__subtitle" />}
              {typeDropdown}
            </div>
            <div className="app-card__body">
              <form>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ color: '#667eea', fontWeight: '600' }}>
                    Question {currentQuestionIndex + 1} of {allQuestionsList.length}
                  </span>
                  {currentQuestion.categoryName && (
                    <span style={{ color: '#888', fontSize: '0.9em' }}>{currentQuestion.categoryName}</span>
                  )}
                </div>
                <section>
                  <label className="question-label">
                    {currentQuestion.questionNumber}. <SafeDescriptionHtml as="span" html={currentQuestion.questionText || ''} />
                    {currentQuestion.isRequired && <span className="required">*</span>}
                  </label>
                  {currentQuestion.helpText && <p className="question-help">{currentQuestion.helpText}</p>}
                  <QuestionInput
                    question={{ ...currentQuestion, questionCode: answerKey }}
                    value={currentAnswer}
                    onChange={handleChange}
                    formData={formData}
                  />
                </section>
                {showChildren && childrenToRender.length > 0 && (
                  <div style={{ marginTop: '20px' }}>{renderChildQuestions(childrenToRender, 0)}</div>
                )}
                <div className="form-actions" style={{ marginTop: '30px', justifyContent: 'space-between' }}>
                  <button type="button" onClick={handlePrevious} className="reset-btn" disabled={currentQuestionIndex === 0} style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}>← Previous</button>
                  <button type="button" onClick={handleSaveAndNext} className="submit-btn" disabled={!!(currentQuestion.isRequired && !currentAnswer)}>
                    {isLastQuestion ? 'Continue to review →' : '💾 Save & Next →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  let questionNumber = 1
  return (
    <div className="app-shell">
      <div className="app-nav">
        <div className="app-brand">
          <BrandLogo logoUrl={branding?.logoUrl} appName={branding?.appName} width={branding?.logoWidth ?? 56} height={branding?.logoHeight ?? 56} rounded={12} background="rgba(0,0,0,0.04)" foreground="#111827" />
          <div className="app-brand__name">{branding?.appName || 'SBEAMP'}</div>
        </div>
        <div className="app-actions">
          <Link href="/check-results" className="app-btn">🔍 Check Submission</Link>
        </div>
      </div>
      <div className="app-main">
        <div className="app-card">
          <div className="app-card__header">
            <div className="app-card__title">{selectedAssessmentType?.name || 'AI Adoption Readiness Assessment'}</div>
            {selectedAssessmentType?.description ? (
              <SafeDescriptionHtml html={selectedAssessmentType.description} className="app-card__subtitle" />
            ) : (
              <div className="app-card__subtitle">Please complete all sections to help us understand your organization&apos;s readiness for AI transformation</div>
            )}
            {typeDropdown}
          </div>
          <div className="app-card__body">
            {error && (
              <div className="error-message" style={{ margin: '20px', padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '5px' }}>
                ⚠️ {error}
              </div>
            )}
            <form id="assessmentForm" onSubmit={handleSubmit}>
              {categories.map((category, categoryIndex) => {
                const mainQuestions = category.questions.filter(q => !q.parentId && !q.parent_id && q.questionType !== 'group')
                const groupQuestions = category.questions.filter(q => q.questionType === 'group')
                const sectionNumber = categoryIndex + 1
                return (
                  <section key={category.id} className="form-section">
                    <h2>Section {sectionNumber}: {category.name}</h2>
                    {category.description && (
                      <SafeDescriptionHtml html={category.description} style={{ marginBottom: '20px', color: '#666' }} className="category-description" />
                    )}
                    {mainQuestions.map(question => {
                      const num = questionNumber++
                      return renderQuestion(question, num)
                    })}
                    {groupQuestions.map(groupQuestion => {
                      const num = questionNumber++
                      return (
                        <div key={groupQuestion.id} className="question-group">
                          <label className="question-label">
                            {num}. {groupQuestion.questionText}
                            {groupQuestion.isRequired && <span className="required">*</span>}
                          </label>
                          {groupQuestion.helpText && <p className="question-help">{groupQuestion.helpText}</p>}
                          <div className="commitment-group">
                            {groupQuestion.children?.map(child => (
                              <div key={child.id} className="commitment-item">
                                <label>{child.questionText}</label>
                                <QuestionInput
                                  question={child}
                                  value={formData.answers[child.questionCode || `q_${child.id}`] || ''}
                                  onChange={handleChange}
                                  formData={formData}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </section>
                )
              })}
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={submitting || loading}>
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
                <button type="button" className="reset-btn" onClick={handleReset} disabled={submitting || loading}>Reset Form</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

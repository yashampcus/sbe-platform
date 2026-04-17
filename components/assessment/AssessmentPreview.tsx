'use client'
import React from 'react'
import Link from 'next/link'
import { useBranding } from '@/contexts/BrandingContext'
import BrandLogo from '@/components/common/BrandLogo'

interface Question {
  questionCode?: string
  question_code?: string
  code?: string
  id?: number
  answerKey?: string
  questionNumber?: number
  questionText?: string
  question_text?: string
  questionType?: string
  categoryName?: string
  children?: Question[]
}

interface FormData {
  answers?: Record<string, string>
}

interface AssessmentType {
  name?: string
  icon?: string
}

interface AssessmentPreviewProps {
  allQuestionsList: Question[]
  formData: FormData
  selectedAssessmentType?: AssessmentType | null
  onEditQuestion: (index: number) => void
  onBackToLast: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function AssessmentPreview({
  allQuestionsList,
  formData,
  selectedAssessmentType,
  onEditQuestion,
  onBackToLast,
  onSubmit,
  submitting,
}: AssessmentPreviewProps) {
  const { config: branding } = useBranding()

  const getChildKey = (q: Question) =>
    q?.questionCode || q?.question_code || q?.code || (q?.id ? `q_${q.id}` : undefined)

  const shouldShowChildren = (question: Question, answerValue: string) => {
    if (!question?.children || question.children.length === 0) return false
    const type = question.questionType
    const v = String(answerValue || '').toLowerCase().trim()
    const answeredYes = v === 'yes' || v === '1' || v === 'true'
    if (type === 'yes_no') return answeredYes
    return true
  }

  const renderQuestionTree = (
    question: Question,
    { level, topIndex }: { level: number; topIndex: number }
  ): React.ReactNode => {
    const isTopLevel = level === 0
    const answerKey = isTopLevel ? question.answerKey : getChildKey(question)
    if (!answerKey) return null
    const answer = formData.answers?.[answerKey] ?? ''
    const displayAnswer = answer === '' || answer === null || answer === undefined ? 'Not answered' : String(answer)
    const showKids = shouldShowChildren(question, answer)

    return (
      <div
        key={`${answerKey}-${level}`}
        className="question-group"
        style={{
          marginBottom: level === 0 ? '25px' : '15px',
          padding: level === 0 ? '20px' : '15px',
          background: level === 0 ? '#f8f9ff' : '#ffffff',
          borderRadius: '8px',
          border: level === 0 ? '1px solid #e0e7ff' : `2px solid ${level === 1 ? '#667eea' : '#48bb78'}`,
          marginLeft: level > 0 ? `${level * 18}px` : '0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <strong style={{ color: level === 0 ? '#667eea' : level === 1 ? '#667eea' : '#48bb78', fontSize: level === 0 ? '1.1em' : '1em' }}>
              {isTopLevel ? `Question ${question.questionNumber}: ` : '↳ '}
              {question.questionText || question.question_text}
            </strong>
            {isTopLevel && question.categoryName && (
              <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#999' }}>Category: {question.categoryName}</p>
            )}
          </div>
          {isTopLevel && (
            <button
              type="button"
              onClick={() => onEditQuestion(topIndex)}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: '600' }}
            >
              ✏️ Edit
            </button>
          )}
        </div>
        <div style={{ padding: '15px', background: 'white', borderRadius: '6px', border: '1px solid #ddd', marginTop: '10px' }}>
          <strong>Answer:</strong> {displayAnswer}
        </div>
        {showKids && question.children && (
          <div style={{ marginTop: '14px' }}>
            {question.children.map(child => renderQuestionTree(child, { level: level + 1, topIndex }))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-nav">
        <div className="app-brand">
          <BrandLogo logoUrl={branding?.logoUrl} appName={branding?.appName} width={branding?.logoWidth ?? 108} height={branding?.logoHeight ?? 108} rounded={12} padding={4} background="rgba(0,0,0,0.04)" foreground="#111827" />
          <div className="app-brand__name">{branding?.appName || 'SBEAMP'}</div>
        </div>
        <div className="app-actions">
          <Link href="/check-results" className="app-btn">🔍 Check Submission</Link>
        </div>
      </div>

      <div className="app-main">
        <div className="app-card">
          <div className="app-card__header">
            <div className="app-card__title">📋 Review Your Answers</div>
            {selectedAssessmentType?.name && (
              <div className="app-card__subtitle">
                {selectedAssessmentType.icon || '📝'} {selectedAssessmentType.name}
              </div>
            )}
          </div>
          <div className="app-card__body">
            <p style={{ color: '#4b5563', marginBottom: '18px' }}>
              Please review all your answers before final submission. You can go back to edit any question.
            </p>
            {allQuestionsList.map((question, index) =>
              renderQuestionTree(question, { level: 0, topIndex: index })
            )}
            <div className="form-actions" style={{ marginTop: '30px' }}>
              <button type="button" onClick={onBackToLast} className="reset-btn" style={{ marginRight: '10px' }}>
                ← Back to Last Question
              </button>
              <button type="button" onClick={onSubmit} className="submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : '✅ Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

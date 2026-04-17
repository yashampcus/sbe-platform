'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { assessmentAPI, assessmentTypesAPI } from '@/lib/api'
import { SafeDescriptionHtml } from '@/components/common/RichTextEditor'
import { useBranding } from '@/contexts/BrandingContext'
import BrandLogo from '@/components/common/BrandLogo'

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dateString }
}

function formatAnswer(value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const s = String(value)
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.join(', ')
  } catch {}
  return s
}

export default function AssessmentResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { config: branding } = useBranding()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assessment, setAssessment] = useState<any>(null)
  const [assessmentType, setAssessmentType] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    assessmentAPI.getById(id, 'detailed')
      .then(res => {
        if (res.success) setAssessment(res.assessment)
        else setError(res.error || 'Failed to load assessment')
      })
      .catch(err => setError(err.message || 'Failed to load assessment results'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!assessment?.assessment_type_id) return
    assessmentTypesAPI.getById(assessment.assessment_type_id)
      .then(res => { if (res?.success && res?.assessmentType) setAssessmentType(res.assessmentType) })
      .catch(() => {})
  }, [assessment?.assessment_type_id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ color: '#666', fontSize: '1.1em' }}>Loading assessment results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#e53e3e', marginBottom: '15px' }}>Error Loading Assessment</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button onClick={() => router.push('/')} style={{ padding: '12px 24px', fontSize: '1em', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Go to Home</button>
          </div>
        </div>
      </div>
    )
  }

  if (!assessment) return null

  const dynamicAnswers: any[] = assessment.dynamicAnswers || assessment.dynamic_answers || []

  const orderedCategoryNames: string[] = []
  const orderedRootQuestionCodes: string[] = []
  const codeToCategoryFromType: Record<string, string> = {}
  const formOrderSequence: string[] = []

  if (assessmentType?.categories) {
    const cats = [...(assessmentType.categories || [])].sort((a: any, b: any) => (a.display_order ?? 999) - (b.display_order ?? 999))
    let formIndex = 0
    cats.forEach((cat: any) => {
      const catName = cat.name || ''
      if (catName) orderedCategoryNames.push(catName)
      const questions = (cat.questions || []).filter((q: any) => !(q.parent_id ?? q.parentId)).sort((a: any, b: any) => (a.display_order ?? 999) - (b.display_order ?? 999))
      questions.forEach((q: any) => {
        formIndex++
        const code = q.questionCode ?? q.question_code
        if (code) {
          const codeStr = String(code)
          orderedRootQuestionCodes.push(codeStr)
          if (catName) codeToCategoryFromType[codeStr] = catName
          formOrderSequence.push(codeStr)
        }
        const children = (q.children || []).sort((a: any, b: any) => (a.display_order ?? 999) - (b.display_order ?? 999))
        children.forEach((_: any, j: number) => { formOrderSequence.push(`${formIndex}_child_${j}`) })
      })
    })
  }

  const answersByCategory: Record<string, any[]> = {}
  dynamicAnswers.forEach(answer => {
    let categoryName = answer.categoryName || answer.category_name || codeToCategoryFromType[answer.questionCode ?? answer.question_code ?? ''] || 'Uncategorized'
    if (!String(categoryName).trim()) categoryName = 'Uncategorized'
    if (!answersByCategory[categoryName]) answersByCategory[categoryName] = []
    answersByCategory[categoryName].push(answer)
  })

  const namesInOrder = [
    ...orderedCategoryNames.filter(n => answersByCategory[n]?.length),
    ...Object.keys(answersByCategory).filter(k => !orderedCategoryNames.includes(k)),
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <BrandLogo logoUrl={branding?.logoUrl} appName={branding?.appName} width={branding?.logoWidth ?? 56} height={branding?.logoHeight ?? 56} rounded={12} background="rgba(0,0,0,0.04)" foreground="#111827" />
              <div style={{ fontWeight: '700', letterSpacing: '1px', color: '#333' }}>{branding?.appName || 'SBEAMP'}</div>
            </div>
            <h1 style={{ fontSize: '2.5em', margin: '0 0 10px 0', color: '#333', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>📊 Assessment Results</h1>
            <p style={{ color: '#666', margin: '0' }}>Assessment ID: <strong>#{assessment.id}</strong></p>
          </div>
          <Link href="/" style={{ padding: '12px 24px', fontSize: '1em', fontWeight: '600', color: '#667eea', background: 'white', border: '2px solid #667eea', borderRadius: '10px', textDecoration: 'none' }}>🏠 Home</Link>
        </div>

        <div style={{ marginBottom: '40px', padding: '20px', background: '#f8f9ff', borderRadius: '10px', border: '1px solid #e0e7ff' }}>
          <div style={{ color: '#667eea', fontSize: '0.9em', marginBottom: '5px' }}>Submitted At</div>
          <div style={{ fontSize: '1.2em', fontWeight: '600', color: '#333' }}>{formatDate(assessment.submitted_at || assessment.created_at)}</div>
        </div>

        <div>
          <h2 style={{ fontSize: '2em', margin: '0 0 30px 0', color: '#333' }}>Your Answers</h2>
          {namesInOrder.length > 0 ? namesInOrder.map((categoryName, index) => {
            const categoryAnswers = answersByCategory[categoryName]
            return (
              <div key={categoryName} style={{ marginBottom: '30px', padding: '30px', background: '#f8f9ff', borderRadius: '15px', border: '2px solid #e0e7ff' }}>
                <h3 style={{ fontSize: '1.5em', margin: '0 0 20px 0', color: '#667eea', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#667eea', color: 'white', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em', fontWeight: '600' }}>{index + 1}</span>
                  {categoryName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {categoryAnswers.map((answer, i) => {
                    const questionText = answer.questionText || answer.question_text || `Question ${answer.questionCode || i + 1}`
                    const answerValue = formatAnswer(answer.answer_value ?? answer.answerValue ?? answer.answer)
                    return (
                      <div key={answer.questionCode || i} style={{ padding: '20px', background: 'white', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '1.1em', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                          <SafeDescriptionHtml as="span" html={questionText} />
                        </div>
                        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', color: '#333', borderLeft: '4px solid #667eea' }}>
                          <strong style={{ color: '#667eea' }}>Answer:</strong> {answerValue}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }) : (
            <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '15px', color: '#666' }}>
              <p style={{ fontSize: '1.2em' }}>No answers found for this assessment.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e0e0e0', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={() => router.push('/')} style={{ padding: '14px 32px', fontSize: '1.1em', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            📝 Start New Assessment
          </button>
        </div>
      </div>
    </div>
  )
}

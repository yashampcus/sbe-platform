interface Answer {
  question_code: string
  question_text: string
  category_name: string
  answer_value: unknown
  question_type?: string
}

interface CategoryScore {
  category: string
  score: number
  maxScore: number
  percentage: number
  questionCount: number
}

interface Report {
  overallScore: number
  overallMax: number
  overallPercentage: number
  categoryScores: CategoryScore[]
  strengths: string[]
  improvements: string[]
}

export function generateReport(answers: Answer[]): Report {
  const categoryMap = new Map<string, { scores: number[]; max: number[]; count: number }>()

  for (const answer of answers) {
    if (!categoryMap.has(answer.category_name)) {
      categoryMap.set(answer.category_name, { scores: [], max: [], count: 0 })
    }
    const cat = categoryMap.get(answer.category_name)!
    cat.count++

    const val = answer.answer_value
    const type = answer.question_type

    if (type === 'scale' && typeof val === 'number') {
      cat.scores.push(val)
      cat.max.push(5)
    } else if (type === 'yes_no') {
      if (val === 'yes' || val === true) {
        cat.scores.push(1)
        cat.max.push(1)
      } else if (val === 'no' || val === false) {
        cat.scores.push(0)
        cat.max.push(1)
      }
    } else if (type === 'percentage_range' && typeof val === 'string') {
      const match = val.match(/(\d+)/)
      if (match) {
        const pct = parseInt(match[1], 10)
        cat.scores.push(pct / 20)
        cat.max.push(5)
      }
    }
  }

  const categoryScores: CategoryScore[] = []
  let totalScore = 0
  let totalMax = 0

  for (const [category, data] of categoryMap) {
    const score = data.scores.reduce((a, b) => a + b, 0)
    const max = data.max.reduce((a, b) => a + b, 0)
    const percentage = max > 0 ? Math.round((score / max) * 100) : 0
    categoryScores.push({ category, score, maxScore: max, percentage, questionCount: data.count })
    totalScore += score
    totalMax += max
  }

  const overallPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

  const sorted = [...categoryScores].sort((a, b) => b.percentage - a.percentage)
  const strengths = sorted.filter(c => c.percentage >= 70).map(c => c.category).slice(0, 3)
  const improvements = sorted.filter(c => c.percentage < 50).map(c => c.category).slice(-3).reverse()

  return {
    overallScore: totalScore,
    overallMax: totalMax,
    overallPercentage,
    categoryScores,
    strengths,
    improvements,
  }
}

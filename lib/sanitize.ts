import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li']

export function sanitizeDescriptionHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
  })
}

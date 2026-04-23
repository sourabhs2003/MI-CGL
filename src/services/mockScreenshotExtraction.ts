import type { SectionalMockDoc } from '../types'
import { extractMockTextFromImage } from './mockOcr'

type ExtractionKind = 'FULL_MOCK' | 'SECTIONAL' | 'UNKNOWN'

export type MockScreenshotExtraction = {
  type: ExtractionKind | null
  score_obtained: number | null
  score_total: number | null
  rank: number | null
  rank_total: number | null
  percentile: number | null
  accuracy: number | null
  attempted: number | null
  total_questions: number | null
  correct: number | null
  incorrect: number | null
  unattempted: number | null
  reasoning_score: number | null
  ga_score: number | null
  quant_score: number | null
  english_score: number | null
  warning: boolean
}

export type ExtractionProgress =
  | { phase: 'reading'; message: string }
  | { phase: 'uploading'; message: string }
  | { phase: 'ocr'; message: string; progress?: number }
  | { phase: 'done'; message: string }

export type ScreenshotReviewDraft = {
  mockType: 'full' | 'sectional'
  exam: 'SSC CGL Tier 1' | 'SSC CGL Tier 2'
  sectionalSubject: SectionalMockDoc['subject']
  scoreObtained: string
  scoreTotal: string
  rank: string
  rankTotal: string
  percentile: string
  accuracy: string
  attempted: string
  totalQuestions: string
  correct: string
  incorrect: string
  unattempted: string
  reasoningScore: string
  gaScore: string
  quantScore: string
  englishScore: string
  warning: boolean
  source: 'ocr'
}

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

type OpenAIMessageContent = string | Array<{ type?: string; text?: string }> | undefined

const DEFAULT_EXTRACTION: MockScreenshotExtraction = {
  type: null,
  score_obtained: null,
  score_total: null,
  rank: null,
  rank_total: null,
  percentile: null,
  accuracy: null,
  attempted: null,
  total_questions: null,
  correct: null,
  incorrect: null,
  unattempted: null,
  reasoning_score: null,
  ga_score: null,
  quant_score: null,
  english_score: null,
  warning: false,
}

const EXTRACTION_PROMPT = `You are a strict JSON extraction engine for SSC CGL mock test screenshots from the Testbook platform.

Extract visible data only and return strict JSON with exactly these keys:
"type", "score_obtained", "score_total", "rank", "rank_total", "percentile", "accuracy", "attempted", "total_questions", "correct", "incorrect", "unattempted", "reasoning_score", "ga_score", "quant_score", "english_score", "warning"

Rules:
- Return JSON only.
- No markdown.
- No explanations.
- If a value is not visible, return null.
- All numeric values must be numbers, not strings.
- "type" must be one of "FULL_MOCK", "SECTIONAL", or "UNKNOWN".
- If score total is 200 or total questions is 100, set type to "FULL_MOCK".
- If score total is 50 or total questions is 25, set type to "SECTIONAL".
- Section score keys map as:
  reasoning_score -> General Intelligence and Reasoning
  ga_score -> General Awareness
  quant_score -> Quantitative Aptitude
  english_score -> English Comprehension
- Validate:
  attempted = correct + incorrect
  unattempted = total_questions - attempted
  accuracy ~= (correct / attempted) * 100
- If any mismatch occurs, set "warning" to true. Otherwise false.`

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '')
    if (!trimmed) return null
    const numeric = Number(trimmed)
    return Number.isFinite(numeric) ? numeric : null
  }
  return null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeType(value: unknown): ExtractionKind | null {
  if (value === 'FULL_MOCK' || value === 'SECTIONAL' || value === 'UNKNOWN') return value
  return null
}

function parseJsonPayload(input: string): Record<string, unknown> {
  try {
    return JSON.parse(input) as Record<string, unknown>
  } catch {
    const start = input.indexOf('{')
    const end = input.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(input.slice(start, end + 1)) as Record<string, unknown>
    }
    throw new Error('AI returned invalid JSON.')
  }
}

function sanitizeExtraction(input: Record<string, unknown>): MockScreenshotExtraction {
  const output: MockScreenshotExtraction = {
    type: normalizeType(input.type),
    score_obtained: toNullableNumber(input.score_obtained),
    score_total: toNullableNumber(input.score_total),
    rank: toNullableNumber(input.rank),
    rank_total: toNullableNumber(input.rank_total),
    percentile: toNullableNumber(input.percentile),
    accuracy: toNullableNumber(input.accuracy),
    attempted: toNullableNumber(input.attempted),
    total_questions: toNullableNumber(input.total_questions),
    correct: toNullableNumber(input.correct),
    incorrect: toNullableNumber(input.incorrect),
    unattempted: toNullableNumber(input.unattempted),
    reasoning_score: toNullableNumber(input.reasoning_score),
    ga_score: toNullableNumber(input.ga_score),
    quant_score: toNullableNumber(input.quant_score),
    english_score: toNullableNumber(input.english_score),
    warning: Boolean(input.warning),
  }

  if (!output.type) {
    if (output.score_total === 200 || output.total_questions === 100) output.type = 'FULL_MOCK'
    else if (output.score_total === 50 || output.total_questions === 25) output.type = 'SECTIONAL'
    else output.type = 'UNKNOWN'
  }

  output.warning = computeWarning(output)
  return output
}

function computeWarning(data: MockScreenshotExtraction): boolean {
  let warning = Boolean(data.warning)

  if (
    data.attempted != null &&
    data.correct != null &&
    data.incorrect != null &&
    data.correct + data.incorrect !== data.attempted
  ) {
    warning = true
  }

  if (
    data.total_questions != null &&
    data.attempted != null &&
    data.unattempted != null &&
    data.total_questions - data.attempted !== data.unattempted
  ) {
    warning = true
  }

  if (
    data.correct != null &&
    data.attempted != null &&
    data.attempted > 0 &&
    data.accuracy != null
  ) {
    const expected = (data.correct / data.attempted) * 100
    if (Math.abs(expected - data.accuracy) > 1.5) {
      warning = true
    }
  }

  return warning
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[|]/g, '/')
    .replace(/[Oo](?=\s*\/\s*\d)/g, '0')
    .replace(/Qs\s*Attempted/gi, 'Qs. Attempted')
    .replace(/\bAttem pted\b/gi, 'Attempted')
    .replace(/\bPercen tile\b/gi, 'Percentile')
    .replace(/[ \t]+/g, ' ')
}

function asTextContent(content: OpenAIMessageContent): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
  }
  return ''
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read screenshot.'))
    }
    reader.onerror = () => reject(new Error('Could not read screenshot.'))
    reader.readAsDataURL(file)
  })
}

async function callOpenAIExtraction(dataUrl: string): Promise<MockScreenshotExtraction> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key is not configured.')

  const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = import.meta.env.VITE_OPENAI_VISION_MODEL || 'gpt-4o'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract SSC CGL mock data from this Testbook screenshot.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'AI extraction failed.')
  }

  const payload = (await response.json()) as OpenAIChatResponse
  const content = asTextContent(payload.choices?.[0]?.message?.content)
  if (!content) throw new Error('AI extraction returned an empty response.')
  return sanitizeExtraction(parseJsonPayload(content))
}

async function callGenericExtractionEndpoint(dataUrl: string): Promise<MockScreenshotExtraction> {
  const baseUrl = import.meta.env.VITE_GENKIT_URL
  if (!baseUrl) throw new Error('AI extraction endpoint is not configured.')

  const apiKey = import.meta.env.VITE_GENKIT_API_KEY
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      task: 'mock-screenshot-extract',
      prompt: EXTRACTION_PROMPT,
      image: dataUrl,
      schema: {
        type: 'object',
        required: [
          'type',
          'score_obtained',
          'score_total',
          'rank',
          'rank_total',
          'percentile',
          'accuracy',
          'attempted',
          'total_questions',
          'correct',
          'incorrect',
          'unattempted',
          'reasoning_score',
          'ga_score',
          'quant_score',
          'english_score',
          'warning',
        ],
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'AI extraction failed.')
  }

  const data = (await response.json()) as Record<string, unknown>
  const candidate =
    typeof data.output === 'string'
      ? parseJsonPayload(data.output)
      : typeof data.result === 'string'
        ? parseJsonPayload(data.result)
        : typeof data.json === 'string'
          ? parseJsonPayload(data.json)
          : (data.output as Record<string, unknown>) ??
            (data.result as Record<string, unknown>) ??
            (data.json as Record<string, unknown>) ??
            data

  return sanitizeExtraction(candidate)
}

function parseFlexibleFraction(text: string, label: string): { left: number | null; right: number | null } {
  const escaped = escapeRegex(label)
  const labelFirst = new RegExp(`${escaped}[\\s:\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*\\/\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i')
  const valueFirst = new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*\\/\\s*([0-9]+(?:\\.[0-9]+)?)(?:\\s*%?)?[\\s\\n]*${escaped}`, 'i')
  const match = text.match(labelFirst) ?? text.match(valueFirst)
  return {
    left: match ? Number(match[1]) : null,
    right: match ? Number(match[2]) : null,
  }
}

function parseFlexibleRank(text: string): { rank: number | null; total: number | null } {
  const labelFirst = text.match(/Rank[\s:\n]*([0-9,]+)\s*\/\s*([0-9,]+)/i)
  const valueFirst = text.match(/([0-9,]+)\s*\/\s*([0-9,]+)[\s\n]*Rank/i)
  const match = labelFirst ?? valueFirst

  return {
    rank: match ? Number(match[1].replace(/,/g, '')) : null,
    total: match ? Number(match[2].replace(/,/g, '')) : null,
  }
}

function parseFlexibleValue(text: string, label: string): number | null {
  const escaped = escapeRegex(label)
  const labelFirst = new RegExp(`${escaped}[\\s:\\n]*([0-9]+(?:\\.[0-9]+)?)`, 'i')
  const valueFirst = new RegExp(`([0-9]+(?:\\.[0-9]+)?)(?:\\s*%?)?[\\s\\n]*${escaped}`, 'i')
  const match = text.match(labelFirst) ?? text.match(valueFirst)
  return match ? Number(match[1]) : null
}

function inferSectionSubjectFromText(text: string): SectionalMockDoc['subject'] | null {
  const normalized = text.toLowerCase()

  if (/reasoning ability|general intelligence and reasoning|\breasoning\b/.test(normalized)) return 'Reasoning'
  if (/quantitative aptitude|\bquant\b|\bmaths?\b/.test(normalized)) return 'Maths'
  if (/english comprehension|\benglish\b/.test(normalized)) return 'English'
  if (/general awareness|general knowledge|\bgs\b|\bga\b/.test(normalized)) return 'GS'

  return null
}

function hasAllFullSections(text: string): boolean {
  const normalized = text.toLowerCase()
  return (
    normalized.includes('general intelligence and reasoning') &&
    normalized.includes('general awareness') &&
    normalized.includes('quantitative aptitude') &&
    normalized.includes('english comprehension')
  )
}

function fillSingleSectionScore(
  extraction: MockScreenshotExtraction,
  subject: SectionalMockDoc['subject'] | null,
): MockScreenshotExtraction {
  if (subject == null || extraction.score_obtained == null) return extraction

  const next = { ...extraction }
  if (subject === 'Reasoning' && next.reasoning_score == null) next.reasoning_score = extraction.score_obtained
  if (subject === 'GS' && next.ga_score == null) next.ga_score = extraction.score_obtained
  if (subject === 'Maths' && next.quant_score == null) next.quant_score = extraction.score_obtained
  if (subject === 'English' && next.english_score == null) next.english_score = extraction.score_obtained
  return next
}

function extractWithOcrText(text: string): MockScreenshotExtraction {
  const normalized = normalizeOcrText(text)
  const rank = parseFlexibleRank(normalized)
  const score = parseFlexibleFraction(normalized, 'Score')
  const attempted =
    parseFlexibleFraction(normalized, 'Qs. Attempted').left != null
      ? parseFlexibleFraction(normalized, 'Qs. Attempted')
      : parseFlexibleFraction(normalized, 'Attempted')
  const inferredSection = inferSectionSubjectFromText(normalized)
  const inferredType: ExtractionKind =
    score.right === 200 || attempted.right === 100
      ? 'FULL_MOCK'
      : score.right === 50 || attempted.right === 25 || (inferredSection != null && !hasAllFullSections(normalized) && score.right != null)
        ? 'SECTIONAL'
        : 'UNKNOWN'

  const resultBase: MockScreenshotExtraction = {
    type: inferredType,
    score_obtained: score.left,
    score_total: score.right,
    rank: rank.rank,
    rank_total: rank.total,
    percentile: parseFlexibleValue(normalized, 'Percentile'),
    accuracy: parseFlexibleValue(normalized, 'Accuracy'),
    attempted: attempted.left,
    total_questions: attempted.right,
    correct: parseFlexibleValue(normalized, 'Correct'),
    incorrect: parseFlexibleValue(normalized, 'Incorrect'),
    unattempted: parseFlexibleValue(normalized, 'Unattempted'),
    reasoning_score: parseFlexibleFraction(normalized, 'General Intelligence and Reasoning').left,
    ga_score: parseFlexibleFraction(normalized, 'General Awareness').left,
    quant_score: parseFlexibleFraction(normalized, 'Quantitative Aptitude').left,
    english_score: parseFlexibleFraction(normalized, 'English Comprehension').left,
    warning: false,
  }

  const result = fillSingleSectionScore(resultBase, inferredSection)
  result.warning = computeWarning(result)
  return result
}

function getConfiguredExtractor(): 'openai' | 'endpoint' | 'ocr' {
  if (import.meta.env.VITE_OPENAI_API_KEY) return 'openai'
  if (import.meta.env.VITE_GENKIT_URL) return 'endpoint'
  return 'ocr'
}

export async function extractMockScreenshot(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<MockScreenshotExtraction> {
  onProgress?.({ phase: 'reading', message: 'Preparing screenshot...' })
  const extractor = getConfiguredExtractor()

  if (extractor === 'ocr') {
    onProgress?.({ phase: 'ocr', message: 'Scanning screenshot locally...' })
    const text = await extractMockTextFromImage(file, (progress, status) => {
      onProgress?.({
        phase: 'ocr',
        progress,
        message: `Scanning screenshot locally: ${status}`,
      })
    })
    const result = extractWithOcrText(text)
    onProgress?.({ phase: 'done', message: 'Screenshot processed.' })
    return result
  }

  const dataUrl = await fileToDataUrl(file)
  onProgress?.({ phase: 'uploading', message: 'Extracting mock details...' })

  try {
    const result =
      extractor === 'openai'
        ? await callOpenAIExtraction(dataUrl)
        : await callGenericExtractionEndpoint(dataUrl)
    onProgress?.({ phase: 'done', message: 'Screenshot processed.' })
    return result
  } catch (error) {
    onProgress?.({ phase: 'ocr', message: 'AI extraction failed. Trying local fallback...' })
    const text = await extractMockTextFromImage(file, (progress, status) => {
      onProgress?.({
        phase: 'ocr',
        progress,
        message: `Trying local fallback: ${status}`,
      })
    })
    const fallback = extractWithOcrText(text)
    fallback.warning = true
    if (Object.values(fallback).every((value) => value == null || value === false)) {
      throw error instanceof Error ? error : new Error('Could not process screenshot.')
    }
    onProgress?.({ phase: 'done', message: 'Screenshot processed with fallback.' })
    return fallback
  }
}

function numberToField(value: number | null): string {
  return value == null ? '' : String(value)
}

function inferSectionalSubject(extraction: MockScreenshotExtraction): SectionalMockDoc['subject'] {
  const visibleSections = [
    extraction.reasoning_score != null ? 'Reasoning' : null,
    extraction.ga_score != null ? 'GS' : null,
    extraction.quant_score != null ? 'Maths' : null,
    extraction.english_score != null ? 'English' : null,
  ].filter((value): value is SectionalMockDoc['subject'] => value !== null)

  if (visibleSections.length === 1) return visibleSections[0]
  return 'Maths'
}

export function toScreenshotReviewDraft(extraction: MockScreenshotExtraction): ScreenshotReviewDraft {
  const mockType = extraction.type === 'SECTIONAL' ? 'sectional' : 'full'

  return {
    mockType,
    exam: 'SSC CGL Tier 1',
    sectionalSubject: inferSectionalSubject(extraction),
    scoreObtained: numberToField(extraction.score_obtained),
    scoreTotal: numberToField(extraction.score_total),
    rank: numberToField(extraction.rank),
    rankTotal: numberToField(extraction.rank_total),
    percentile: numberToField(extraction.percentile),
    accuracy: numberToField(extraction.accuracy),
    attempted: numberToField(extraction.attempted),
    totalQuestions: numberToField(extraction.total_questions),
    correct: numberToField(extraction.correct),
    incorrect: numberToField(extraction.incorrect),
    unattempted: numberToField(extraction.unattempted),
    reasoningScore: numberToField(extraction.reasoning_score),
    gaScore: numberToField(extraction.ga_score),
    quantScore: numberToField(extraction.quant_score),
    englishScore: numberToField(extraction.english_score),
    warning: extraction.warning,
    source: 'ocr',
  }
}

export function emptyScreenshotReviewDraft(): ScreenshotReviewDraft {
  return toScreenshotReviewDraft(DEFAULT_EXTRACTION)
}

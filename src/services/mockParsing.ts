import type { FullExamType, FullMockSection, MockOverall, SectionalMockDoc } from '../types'

export type ParsedMockAnalysis = {
  exam: FullExamType
  type: 'full' | 'sectional'
  subject?: SectionalMockDoc['subject']
  overall: MockOverall
  sections: FullMockSection[]
}

export type MockDraft = ParsedMockAnalysis

export type ParseMockAnalysisResult = {
  parsed: ParsedMockAnalysis
  draft: MockDraft
  parseMode: 'fallback'
  warnings: string[]
  validationErrors: string[]
}

export function validateMockDraft(_: MockDraft): string[] {
  return []
}

export function toParsedMockAnalysis(draft: MockDraft): ParsedMockAnalysis {
  return draft
}

export async function parseMockAnalysis(_: string): Promise<ParseMockAnalysisResult> {
  const draft: MockDraft = {
    exam: 'SSC CGL Tier 1',
    type: 'full',
    overall: {
      score: 0,
      total: 200,
      attempted: 0,
      accuracy: 0,
      time: 0,
      percentile: 0,
    },
    sections: [],
  }

  return {
    parsed: draft,
    draft,
    parseMode: 'fallback',
    warnings: ['OCR parsing is not active in the rebuilt manual input flow.'],
    validationErrors: [],
  }
}

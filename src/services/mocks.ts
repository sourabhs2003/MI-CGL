import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from '../firebase'
import { todayKey } from '../lib/dates'
import { XP_MOCK_DONE } from '../lib/xp'
import { saveStudySession } from './studySession'
import type { FullExamType, FullMockDoc, FullMockSection, MockDoc, MockOverall, SectionName, SectionalMockDoc } from '../types'

type FullMockInput = Omit<FullMockDoc, 'id' | 'createdAt' | 'type' | 'label' | 'dayKey' | 'schemaVersion' | 'source'>
type SectionalMockInput = Omit<SectionalMockDoc, 'id' | 'createdAt' | 'type' | 'label' | 'dayKey' | 'schemaVersion' | 'source'>

const fixedSections: SectionName[] = ['Reasoning', 'GA', 'Maths', 'English']

function sanitizeOverall(input: unknown, fallbackTotal: number): MockOverall {
  const raw = (input ?? {}) as Record<string, unknown>
  return {
    score: Math.max(0, Number(raw.score) || 0),
    total: Math.max(0, Number(raw.total) || fallbackTotal),
    attempted: Math.max(0, Number(raw.attempted) || 0),
    accuracy: Math.max(0, Math.min(100, Number(raw.accuracy) || 0)),
    time: Math.max(0, Number(raw.time) || 0),
    percentile:
      raw.percentile == null ? undefined : Math.max(0, Math.min(100, Number(raw.percentile) || 0)),
  }
}

function sanitizeFullSection(input: unknown, fallbackName: SectionName): FullMockSection {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = fixedSections.includes(raw.name as SectionName) ? (raw.name as SectionName) : fallbackName
  return {
    name,
    score: Math.max(0, Number(raw.score) || 0),
    total: Math.max(0, Number(raw.total) || 50),
    attempted: Math.max(0, Number(raw.attempted) || 0),
    accuracy: Math.max(0, Math.min(100, Number(raw.accuracy) || 0)),
    time: Math.max(0, Number(raw.time) || 0),
  }
}

function normalizeLegacyOrCurrentMock(id: string, input: Record<string, unknown>): MockDoc {
  const source = input.source === 'ocr' ? 'ocr' : 'manual'
  const schemaVersion = Number(input.schemaVersion) || 2
  const dayKey = typeof input.dayKey === 'string' ? input.dayKey : todayKey()
  const createdAt = input.createdAt

  if (input.type === 'full' || input.type === 'sectional') {
    if (input.type === 'full') {
      const sectionsRaw = Array.isArray(input.sections) ? input.sections : []
      const sectionMap = new Map<SectionName, FullMockSection>()
      for (const [index, fallbackName] of fixedSections.entries()) {
        sectionMap.set(fallbackName, sanitizeFullSection(sectionsRaw[index], fallbackName))
      }
      for (const section of sectionsRaw) {
        const normalized = sanitizeFullSection(section, 'Reasoning')
        sectionMap.set(normalized.name, normalized)
      }
      return {
        id,
        type: 'full',
        label: String(input.label ?? `Full Mock (${String(input.exam ?? 'SSC CGL Tier 1').replace('SSC CGL ', '')})`),
        exam: input.exam === 'SSC CGL Tier 2' ? 'SSC CGL Tier 2' : 'SSC CGL Tier 1',
        overall: sanitizeOverall(input.overall, 200),
        sections: fixedSections.map((name) => sectionMap.get(name) ?? sanitizeFullSection({}, name)),
        source,
        dayKey,
        schemaVersion,
        createdAt,
      }
    }

    return {
      id,
      type: 'sectional',
      label: String(input.label ?? `Sectional Mock • ${String(input.subject ?? 'Maths')}`),
      subject: (input.subject as SectionalMockDoc['subject']) ?? 'Maths',
      overall: sanitizeOverall(input.overall, 50),
      source,
      dayKey,
      schemaVersion,
      createdAt,
    }
  }

  const legacyKind = input.kind === 'sectional' ? 'sectional' : 'full'
  if (legacyKind === 'sectional') {
    return {
      id,
      type: 'sectional',
      label: String(input.label ?? `Sectional Mock • ${String(input.subject ?? 'Maths')}`),
      subject: ((input.subject as SectionalMockDoc['subject']) ?? 'Maths'),
      overall: {
        score: Math.max(0, Number(input.score) || 0),
        total: Math.max(0, Number(input.maxScore) || 50),
        attempted: Math.max(0, Number(input.attempted) || 0),
        accuracy: Math.max(0, Math.min(100, Number(input.accuracyPct) || 0)),
        time: Math.max(0, Number(input.durationMin) || 0),
        percentile: input.percentile == null ? undefined : Math.max(0, Math.min(100, Number(input.percentile) || 0)),
      },
      source,
      dayKey,
      schemaVersion,
      createdAt,
    }
  }

  const legacySections = Array.isArray(input.sections) ? input.sections : []
  const sectionMap = new Map<SectionName, FullMockSection>()
  for (const name of fixedSections) {
    sectionMap.set(name, sanitizeFullSection({}, name))
  }
  for (const section of legacySections) {
    const normalized = sanitizeFullSection(
      {
        name: section && typeof section === 'object' ? (section as Record<string, unknown>).name : undefined,
        score: section && typeof section === 'object' ? (section as Record<string, unknown>).score : 0,
        total: section && typeof section === 'object'
          ? ((section as Record<string, unknown>).total ?? (section as Record<string, unknown>).maxScore)
          : 0,
        attempted: section && typeof section === 'object' ? (section as Record<string, unknown>).attempted : 0,
        accuracy: section && typeof section === 'object'
          ? ((section as Record<string, unknown>).accuracy ?? (section as Record<string, unknown>).accuracyPct)
          : 0,
        time: section && typeof section === 'object'
          ? ((section as Record<string, unknown>).time ?? (section as Record<string, unknown>).durationMin)
          : 0,
      },
      'Reasoning',
    )
    sectionMap.set(normalized.name, normalized)
  }

  return {
    id,
    type: 'full',
    label: String(input.label ?? `Full Mock (${input.kind === 'full_t2' ? 'T2' : 'T1'})`),
    exam: input.kind === 'full_t2' ? 'SSC CGL Tier 2' : 'SSC CGL Tier 1',
    overall: {
      score: Math.max(0, Number(input.score) || 0),
      total: Math.max(0, Number(input.maxScore) || 200),
      attempted: Math.max(0, Number(input.attempted) || 0),
      accuracy: Math.max(0, Math.min(100, Number(input.accuracyPct) || 0)),
      time: Math.max(0, Number(input.durationMin) || 0),
      percentile: input.percentile == null ? undefined : Math.max(0, Math.min(100, Number(input.percentile) || 0)),
    },
    sections: fixedSections.map((name) => sectionMap.get(name) ?? sanitizeFullSection({}, name)),
    source,
    dayKey,
    schemaVersion,
    createdAt,
  }
}

export function subscribeMocks(uid: string, cb: (rows: MockDoc[]) => void) {
  const q = query(collection(getDb(), `users/${uid}/mocks`), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const rows: MockDoc[] = []
      snap.forEach((d) => {
        rows.push(normalizeLegacyOrCurrentMock(d.id, d.data() as Record<string, unknown>))
      })
      cb(rows)
    },
    () => cb([]),
  )
}

export async function addFullMock(uid: string, input: FullMockInput): Promise<void> {
  const payload: Omit<FullMockDoc, 'id' | 'createdAt'> = {
    type: 'full',
    label: `Full Mock (${input.exam === 'SSC CGL Tier 2' ? 'T2' : 'T1'})`,
    exam: input.exam,
    overall: sanitizeOverall(input.overall, 200),
    sections: fixedSections.map((name, index) => sanitizeFullSection(input.sections[index], name)),
    source: 'manual',
    dayKey: todayKey(),
    schemaVersion: 2,
  }

  await saveMock(uid, payload)
  await saveStudySession(uid, {
    subject: 'Mixed',
    topic: `Mock bonus (${input.exam === 'SSC CGL Tier 2' ? 'full_t2' : 'full_t1'})`,
    durationSec: (input.exam === 'SSC CGL Tier 2' ? 120 : 60) * 60,
  })
}

export async function addSectionalMock(uid: string, input: SectionalMockInput): Promise<void> {
  const payload: Omit<SectionalMockDoc, 'id' | 'createdAt'> = {
    type: 'sectional',
    label: `Sectional Mock • ${input.subject}`,
    subject: input.subject,
    overall: sanitizeOverall(input.overall, 50),
    source: 'manual',
    dayKey: todayKey(),
    schemaVersion: 2,
  }

  await saveMock(uid, payload)
  await saveStudySession(uid, {
    subject: input.subject,
    topic: 'Mock bonus (sectional)',
    durationSec: 15 * 60,
  })
}

async function saveMock(uid: string, payload: Omit<MockDoc, 'id' | 'createdAt'>): Promise<void> {
  const db = getDb()
  await runTransaction(db, async (tx) => {
    const mockRef = doc(collection(db, `users/${uid}/mocks`))
    tx.set(mockRef, {
      ...payload,
      createdAt: serverTimestamp(),
    })
    const userRef = doc(db, 'users', uid)
    tx.set(userRef, { xp: increment(XP_MOCK_DONE) }, { merge: true })
  })
}

export async function deleteMock(uid: string, mockId: string): Promise<void> {
  await deleteDoc(doc(getDb(), `users/${uid}/mocks`, mockId))
}

export function getFixedSections(): SectionName[] {
  return [...fixedSections]
}

export function getDefaultFullSections(): FullMockSection[] {
  return fixedSections.map((name) => ({
    name,
    score: 0,
    total: 50,
    attempted: 0,
    accuracy: 0,
    time: 0,
  }))
}

export function getDefaultFullOverall(exam: FullExamType = 'SSC CGL Tier 1'): MockOverall {
  return {
    score: 0,
    total: exam === 'SSC CGL Tier 2' ? 200 : 200,
    attempted: 0,
    accuracy: 0,
    time: 0,
    percentile: 0,
  }
}

export function getDefaultSectionalOverall(): MockOverall {
  return {
    score: 0,
    total: 50,
    attempted: 0,
    accuracy: 0,
    time: 0,
    percentile: 0,
  }
}

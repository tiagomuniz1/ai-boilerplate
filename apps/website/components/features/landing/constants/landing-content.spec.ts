import {
  FAQS,
  FEATURES,
  QR_PATTERN,
  SECURITY_BULLETS,
  STEPS,
  TRUST_ITEMS,
} from './landing-content'

describe('landing content', () => {
  it('has six features numbered 01–06', () => {
    expect(FEATURES).toHaveLength(6)
    expect(FEATURES.map((f) => f.number)).toEqual(['01', '02', '03', '04', '05', '06'])
  })

  it('has three steps', () => {
    expect(STEPS).toHaveLength(3)
  })

  it('has six security bullets', () => {
    expect(SECURITY_BULLETS).toHaveLength(6)
  })

  it('has four trust items', () => {
    expect(TRUST_ITEMS).toHaveLength(4)
  })

  it('has six FAQs, each with a question and an answer', () => {
    expect(FAQS).toHaveLength(6)
    FAQS.forEach((faq) => {
      expect(faq.question.length).toBeGreaterThan(0)
      expect(faq.answer.length).toBeGreaterThan(0)
    })
  })

  it('has a 36-cell QR pattern of only 0s and 1s', () => {
    expect(QR_PATTERN).toHaveLength(36)
    expect(QR_PATTERN.every((bit) => bit === 0 || bit === 1)).toBe(true)
  })
})

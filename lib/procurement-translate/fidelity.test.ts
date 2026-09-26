import { describe, expect, it } from 'vitest'
import { assessProcurementFidelity, type FidelityCode } from './fidelity'
import { PROCUREMENT_GLOSSARY } from './glossary'

function codesOf(source: string, translation: string, priorSources: string[] = []): FidelityCode[] {
  return assessProcurementFidelity({ source, translation, priorSources }).findings.map((finding) => finding.code)
}

function expectFaithful(source: string, translation: string, priorSources: string[] = []): void {
  const report = assessProcurementFidelity({ source, translation, priorSources })
  expect(report.findings, JSON.stringify(report.findings)).toEqual([])
}

const faithful = [
  {
    id: 'incoterm-price',
    ru: 'Поставка на условиях FOB, цена 1200 долларов.',
    en: 'Delivery is FOB, the price is 1200 dollars.',
  },
  {
    id: 'letter-of-credit',
    ru: 'Откройте аккредитив на 10000 евро.',
    en: 'Open a letter of credit for 10000 euros.',
  },
  {
    id: 'lead-time',
    ru: 'Срок поставки 14 дней.',
    en: 'The lead time is 14 days.',
  },
  {
    id: 'net-terms',
    ru: 'Оплата нетто 30.',
    en: 'Payment is net 30.',
  },
  {
    id: 'ownership',
    ru: 'Считайте совокупную стоимость владения.',
    en: 'Calculate the total cost of ownership.',
  },
  {
    id: 'uncertainty',
    ru: 'Цена ориентировочная.',
    en: 'The price is indicative.',
  },
  {
    id: 'buyer',
    ru: 'Покупатель принимает товар.',
    en: 'The buyer accepts the goods.',
  },
] as const

describe('procurement fidelity phrases', () => {
  it('keeps the glossary extendable and small', () => {
    expect(Object.keys(PROCUREMENT_GLOSSARY).sort()).toEqual([
      'abbreviations',
      'basis',
      'documents',
      'incoterms',
      'instruments',
      'parties',
      'terms',
      'units',
    ])
    expect(PROCUREMENT_GLOSSARY.incoterms.some((entry) => entry.id === 'fob')).toBe(true)
    expect(PROCUREMENT_GLOSSARY.terms.some((entry) => entry.id === 'cips')).toBe(true)
    expect(PROCUREMENT_GLOSSARY.abbreviations.some((entry) => entry.id === 'rfq')).toBe(true)
  })

  for (const phrase of faithful) {
    it(`${phrase.id}: russian to english keeps the commercial meaning`, () => {
      expectFaithful(phrase.ru, phrase.en)
    })

    it(`${phrase.id}: english to russian keeps the commercial meaning`, () => {
      expectFaithful(phrase.en, phrase.ru)
    })
  }

  it('accepts a spelled-out incoterm and a net term as the same commercial facts', () => {
    expectFaithful('Поставка франко борт.', 'Delivery is free on board.')
    expectFaithful('Оплата нетто 30.', 'Payment is within 30 days.')
  })

  it('shows the price pair when 1200 dollars becomes 12000 dollars', () => {
    const changed = assessProcurementFidelity({
      source: 'The price is 1200 dollars.',
      translation: 'Цена 12000 долларов.',
    })
    const price = changed.findings.find((finding) => finding.code === 'number')
    expect(price?.sourceFragment).toMatch(/1200(?!\d)/)
    expect(price?.translationFragment).toMatch(/12000/)
    expectFaithful('The price is 1200 dollars.', 'Цена 1200 долларов.')
  })

  it('treats a thousands separator and a percent sign as the same figure', () => {
    expectFaithful('The price is 1,200 dollars.', 'Цена 1200 долларов.')
    expectFaithful('Неустойка 10,5%.', 'The penalty is 10.5 percent.')
  })

  it('flags a swapped incoterm and keeps the code when both sides say it', () => {
    const swapped = assessProcurementFidelity({
      source: 'Поставка на условиях FOB.',
      translation: 'Delivery is CIF.',
    })
    expect(swapped.findings.map((finding) => finding.code)).toContain('incoterm')
    expect(swapped.findings.find((finding) => finding.code === 'incoterm')?.sourceFragment).toBe('fob')
    expectFaithful('Поставка на условиях FOB.', 'Delivery is FOB.')
    expectFaithful('Delivered at place unloaded.', 'Поставка DPU.')
  })

  it('does not invent an incoterm the speaker did not say', () => {
    expect(codesOf('Проверьте поставку.', 'Check the CIF shipment.')).toContain('incoterm')
    expectFaithful('Проверьте поставку.', 'Check the shipment.')
  })

  it('flags a dropped or swapped payment instrument, including one invented later', () => {
    expect(codesOf('Откройте аккредитив на 10000 евро.', 'Open a bank guarantee for 10000 euros.')).toContain(
      'instrument'
    )
    const prior = ['Откройте аккредитив на 10000 евро.']
    expectFaithful('Сумма та же.', 'The letter of credit amount is the same.', prior)
    expect(codesOf('Сумма та же.', 'The bank guarantee amount is the same.', prior)).toContain('instrument')
  })

  it('flags a lost negation on a payment instrument', () => {
    expect(codesOf('Аккредитив не требуется.', 'A letter of credit is required.')).toContain('negation')
    expectFaithful('Аккредитив не требуется.', 'A letter of credit is not required.')
  })

  it('flags a changed currency, lead time, and delivery rhythm', () => {
    expect(codesOf('Цена 100 долларов.', 'The price is 100 euros.')).toContain('unit')
    expect(codesOf('Срок поставки 14 дней.', 'The lead time is 14 weeks.')).toContain('duration')
    expect(codesOf('Поставка ежемесячно.', 'Delivery is quarterly.')).toContain('frequency')
    expect(codesOf('Оплата нетто 30.', 'Payment is net 60.')).toContain('duration')
  })

  it('flags a party swap and a document swap', () => {
    const swappedParty = assessProcurementFidelity({
      source: 'Покупатель принимает товар.',
      translation: 'The supplier accepts the goods.',
    })
    expect(swappedParty.findings.map((finding) => finding.code)).toContain('party')
    expect(swappedParty.findings.find((finding) => finding.code === 'party')?.sourceFragment).toBe('покупател')
    expectFaithful('Покупатель принимает товар.', 'The buyer accepts the goods.')
    expect(codesOf('Выставите счет-фактуру.', 'Issue the purchase order.')).toContain('document')
    expectFaithful('Выставите счет-фактуру.', 'Issue the invoice.')
  })

  it('does not treat the contractor as the contract', () => {
    expectFaithful('Подрядчик подписывает.', 'The contractor signs.')
    expect(codesOf('Договор подписан.', 'The contractor signed.')).toContain('document')
    expectFaithful('Договор подписан.', 'The contract is signed.')
  })

  it('flags included and excluded only when a price is in the utterance', () => {
    expect(codesOf('100 dollars included.', '100 долларов не включено.')).toContain('basis')
    expectFaithful('100 dollars included.', '100 долларов включено.')
    expect(codesOf('Ship it included.', 'Отгрузите, это не включено.')).not.toContain('basis')
  })

  it('flags before and after award without linking a bare lead time', () => {
    expect(codesOf('Подпишем после присуждения.', 'We will sign before the award.')).toContain('relation')
    expectFaithful('Подпишем после присуждения.', 'We will sign after the award.')
    expect(codesOf('Срок поставки 14 дней.', 'The lead time is 14 days.')).not.toContain('relation')
  })

  it('catches a party, an incoterm, and the award order in other languages', () => {
    expect(codesOf('El comprador acepta.', 'Le fournisseur accepte.')).toContain('party')
    expect(codesOf('买方接受。', '卖方接受。')).toContain('party')
    expect(codesOf('Entrega FOB.', 'Livraison CIF.')).toContain('incoterm')
    expect(codesOf('Firmaremos después de la adjudicación.', 'Nous signerons avant attribution.')).toContain('relation')
    expect(codesOf('Envíe la factura.', 'Send the quotation.')).toContain('document')
  })

  it('does not turn a plain shipment into an incoterm or simplify a CIPS term', () => {
    expect(codesOf('Нужно отгрузить товар.', 'Ship it CIF.')).toContain('incoterm')
    expect(codesOf('Считайте совокупную стоимость владения.', 'Look at the price.')).toContain('term')
    expectFaithful('Считайте совокупную стоимость владения.', 'Calculate total cost of ownership.')
    expect(codesOf('Работаем по стандарту CIPS.', 'We work to the CIP standard.')).toEqual(
      expect.arrayContaining(['incoterm', 'term'])
    )
  })

  it('does not treat a preposition as commercial uncertainty', () => {
    expectFaithful('Расскажите о цене.', 'Tell me about the price.')
  })

  it('does not guess an ambiguous abbreviation', () => {
    expect(codesOf('CIP is unchanged.', 'CIPS is unchanged.')).toContain('abbreviation')
    expectFaithful('CIP is unchanged.', 'CIP is unchanged.')
    expect(codesOf('LC is confirmed.', 'The letter of credit is confirmed.')).toContain('abbreviation')
    expectFaithful('LC is confirmed.', 'LC is confirmed.')
    expectFaithful('Send the RFQ.', 'Отправьте запрос котировок.')
  })

  it('notices when a firm price becomes only indicative', () => {
    expect(codesOf('Цена 100 долларов.', 'The indicative price is 100 dollars.')).toContain('uncertainty')
    expectFaithful('Цена ориентировочная, 100 долларов.', 'The indicative price is 100 dollars.')
  })

  it('returns no findings for an empty transcript', () => {
    expect(assessProcurementFidelity({ source: '', translation: '100 dollars' }).findings).toEqual([])
    expect(assessProcurementFidelity({ source: 'FOB.', translation: '' }).findings).toEqual([])
  })
})

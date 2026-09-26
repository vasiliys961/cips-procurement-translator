/**
 * Vocabulary for the realtime CIPS procurement translator.
 *
 * This is not a prompt and it is not sent to the speech model.
 * gpt-realtime-translate does not accept custom instructions.
 * The fidelity check uses these forms only to compare a finished
 * transcript with its translation.
 *
 * CIPS is the Chartered Institute of Procurement & Supply. The list
 * follows that professional language: Incoterms, parties, payment
 * instruments, and the terms a buyer and a supplier actually say.
 * Add a form when a real conversation shows a gap. Keep each list short.
 */

export type GlossaryEntry = {
  id: string
  forms: readonly string[]
  /** Meanings a short form must not be expanded into without the source saying so. */
  expansions?: readonly string[]
  ambiguous?: boolean
}

export const PROCUREMENT_GLOSSARY = {
  instruments: [
    { id: 'letter-of-credit', forms: ['аккредитив', 'letter of credit', 'lettre de credit', 'carta de credito', 'carta di credito', 'carta de credito', '信用证', 'lc'] },
    { id: 'bank-guarantee', forms: ['банковская гарантия', 'банковской гарантии', 'банковскую гарантию', 'bank guarantee', 'garantie bancaire', 'garantia bancaria', '银行保函'] },
    { id: 'performance-bond', forms: ['гарантия исполнения', 'гарантии исполнения', 'performance bond', 'performance guarantee', 'garantia de cumplimiento', '履约保函'] },
    { id: 'retention', forms: ['удержани', 'retention', 'retention money', 'retenue de garantie', 'retencion', '保留金'] },
    { id: 'advance-payment', forms: ['аванс', 'предоплат', 'advance payment', 'pago anticipado', 'paiement d avance', '预付款'] },
    { id: 'documentary-collection', forms: ['инкассо', 'документарное инкассо', 'documentary collection', 'remise documentaire', '托收'] },
  ],
  terms: [
    { id: 'cips', forms: ['cips', 'chartered institute of procurement', 'королевский институт закупок'] },
    { id: 'tco', forms: ['tco', 'total cost of ownership', 'совокупная стоимость владения', 'совокупную стоимость владения', 'совокупной стоимости владения', 'cout total de possession', 'costo total de propiedad'] },
    { id: 'category-management', forms: ['category management', 'категорийн', 'gestion par categories', 'gestion de categorias'] },
    { id: 'strategic-sourcing', forms: ['strategic sourcing', 'стратегический сорсинг', 'стратегическ сорсинг'] },
    { id: 'should-cost', forms: ['should cost', 'should-cost', 'нормативная себестоимость', 'должная себестоимость'] },
    { id: 'kraljic', forms: ['kraljic', 'кралич'] },
    { id: 'srm', forms: ['srm', 'supplier relationship management', 'управление взаимоотношениями с поставщиками'] },
    { id: 'liquidated-damages', forms: ['liquidated damages', 'заранее оцененные убытки', 'dommages liquides', 'danos liquidados'] },
    { id: 'force-majeure', forms: ['force majeure', 'форс мажор', 'fuerza mayor', 'force majeure'] },
    { id: 'otif', forms: ['otif', 'on time in full', 'вовремя и полностью'] },
    { id: 'three-way-match', forms: ['three way match', 'трехсторонн сопоставлен', 'three way matching'] },
    { id: 'due-diligence', forms: ['due diligence', 'должная осмотрительность', 'дью дилидженс'] },
    { id: 'whole-life-cost', forms: ['whole life cost', 'стоимость жизненного цикла', 'cout global de possession'] },
    { id: 'sla', forms: ['sla', 'service level agreement', 'соглашение об уровне обслуживания', 'соглашение об уровне сервиса'] },
    { id: 'kpi', forms: ['kpi', 'key performance indicator', 'ключевой показатель эффективности', 'ключевые показатели эффективности'] },
  ],
  abbreviations: [
    { id: 'rfq', forms: ['rfq', 'request for quotation', 'запрос котировок'] },
    { id: 'rfp', forms: ['rfp', 'request for proposal', 'запрос предложений'] },
    { id: 'rfi', forms: ['rfi', 'request for information', 'запрос информации'] },
    { id: 'itt', forms: ['itt', 'invitation to tender', 'приглашение к тендеру'] },
    { id: 'po', forms: ['po', 'purchase order', 'заказ на поставку', 'orden de compra', 'bon de commande'] },
    { id: 'moq', forms: ['moq', 'minimum order quantity', 'минимальная партия'] },
    { id: 'eoq', forms: ['eoq', 'economic order quantity', 'оптимальный размер заказа'] },
    { id: 'bom', forms: ['bom', 'bill of materials', 'спецификация материалов'] },
    { id: 'nda', forms: ['nda', 'non disclosure', 'соглашение о неразглашении'] },
    { id: 'grn', forms: ['grn', 'goods received note', 'приходный ордер', 'приходная накладная'] },
    { id: 'sow', forms: ['sow', 'statement of work'] },
    { id: 'dps', forms: ['dps', 'dynamic purchasing system', 'динамическая закупочная система'] },
    { id: 'p2p', forms: ['p2p', 'procure to pay', 'от закупки до оплаты'] },
    {
      id: 'lc',
      forms: ['lc'],
      expansions: ['letter of credit', 'аккредитив', 'life cycle', 'lifecycle', 'жизненный цикл', 'learning curve'],
      ambiguous: true,
    },
    {
      id: 'cip',
      forms: ['cip'],
      expansions: ['carriage and insurance paid', 'cips', 'continuous improvement', 'перевозка и страхование оплачены'],
      ambiguous: true,
    },
    {
      id: 'pr',
      forms: ['pr'],
      expansions: ['purchase requisition', 'public relations', 'заявка на закупку'],
      ambiguous: true,
    },
    {
      id: 'meat',
      forms: ['meat'],
      expansions: ['most economically advantageous tender', 'наиболее экономически выгодное'],
      ambiguous: true,
    },
  ] as GlossaryEntry[],
  incoterms: [
    { id: 'exw', forms: ['exw', 'ex works', 'франко завод'] },
    { id: 'fca', forms: ['fca', 'free carrier', 'франко перевозчик'] },
    { id: 'fas', forms: ['fas', 'free alongside ship', 'франко вдоль борта'] },
    { id: 'fob', forms: ['fob', 'фоб', 'free on board', 'франко борт'] },
    { id: 'cfr', forms: ['cfr', 'c&f', 'cost and freight', 'стоимость и фрахт'] },
    { id: 'cif', forms: ['cif', 'сиф', 'cost insurance and freight', 'стоимость страхование и фрахт'] },
    { id: 'cpt', forms: ['cpt', 'carriage paid to', 'перевозка оплачена до'] },
    { id: 'cip', forms: ['cip', 'carriage and insurance paid to', 'перевозка и страхование оплачены до'] },
    { id: 'dap', forms: ['dap', 'дап', 'delivered at place'] },
    { id: 'dpu', forms: ['dpu', 'delivered at place unloaded'] },
    { id: 'ddp', forms: ['ddp', 'ддп', 'delivered duty paid', 'поставка с оплатой пошлины'] },
  ],
  parties: [
    { id: 'buyer', forms: ['покупател', 'заказчик', 'buyer', 'comprador', 'acheteur', 'kaufer', 'acquirente', '买方', '買い手', '구매자', 'pembeli', 'nguoi mua', 'người mua'] },
    { id: 'supplier', forms: ['поставщик', 'supplier', 'vendor', 'seller', 'продавец', 'продавца', 'proveedor', 'fournisseur', 'lieferant', 'fornitore', 'fornecedor', '供应商', '卖方', '売り手', '공급업체', 'pemasok', 'nha cung cap', 'nhà cung cấp'] },
    { id: 'contractor', forms: ['подрядчик', 'contractor', 'contratista', 'auftragnehmer', 'appaltatore', '承包商'] },
    { id: 'subcontractor', forms: ['субподрядчик', 'subcontractor', 'subcontratista', '分包商'] },
  ],
  documents: [
    { id: 'purchase-order', forms: ['purchase order', 'заказ на поставку', 'orden de compra', 'bon de commande', '采购订单', 'po'] },
    { id: 'framework', forms: ['framework agreement', 'framework contract', 'рамочн', 'acuerdo marco', 'accord cadre', 'rahmenvertrag'] },
    { id: 'invoice', forms: ['invoice', 'инвойс', 'счет фактур', 'factura', 'facture', 'rechnung', 'fattura', 'fatura', '发票'] },
    { id: 'bill-of-lading', forms: ['bill of lading', 'коносамент', 'conocimiento de embarque', 'connaissement', '提单'] },
    { id: 'quotation', forms: ['quotation', 'коммерческое предложение', 'cotizacion', 'devis', 'angebot', '报价'] },
    { id: 'tender', forms: ['tender', 'тендер', 'invitation to tender', 'licitacion', 'appel d offres', '招标'] },
    { id: 'contract', forms: ['contract', 'contracts', 'договор', 'контракт', 'contrato', 'contrat', 'vertrag', '合同'] },
    { id: 'requisition', forms: ['purchase requisition', 'заявка на закупку', 'requisicion', '采购申请'] },
  ],
  basis: [
    { id: 'included', forms: ['included', 'inclusive', 'включен', 'incluido', 'inclus', 'inklusive', 'incluso', 'incluida', '包含在价格', '包含在價格'] },
    { id: 'excluded', forms: ['excluded', 'exclusive', 'not included', 'не включен', 'не входит в цену', 'сверх цены', 'excluido', 'no incluido', 'exclu', 'ausgeschlossen', 'nicht enthalten', 'escluso', '不包含', '除外'] },
    { id: 'open-account', forms: ['open account', 'открытый счет', 'cuenta abierta', 'compte ouvert'] },
    { id: 'milestone', forms: ['milestone', 'по этап', 'по вехам', 'hito de pago', 'jalon'] },
  ],
  units: [
    { id: 'percent', forms: ['percent', 'процент', 'процента', 'процентов', 'por ciento', 'pour cent', 'prozent', 'per cento', 'por cento'] },
    { id: 'usd', forms: ['usd', 'dollar', 'dollars', 'доллар', 'доллара', 'долларов'] },
    { id: 'eur', forms: ['eur', 'euro', 'euros', 'евро'] },
    { id: 'gbp', forms: ['gbp', 'pound', 'pounds', 'фунт', 'фунта', 'фунтов'] },
    { id: 'cny', forms: ['cny', 'yuan', 'юань', 'юаня', 'юаней'] },
    { id: 'rub', forms: ['rub', 'ruble', 'rubles', 'руб', 'рубля', 'рублей'] },
    { id: 'tonne', forms: ['тонна', 'тонны', 'тонн', 'тонну', 'tonne', 'tonnes'] },
    { id: 'kg', forms: ['кг', 'kg', 'килограмм', 'килограмма', 'килограммов'] },
    { id: 'piece', forms: ['шт', 'штук', 'штуки', 'pcs', 'piece', 'pieces'] },
  ],
} as const satisfies Record<string, readonly GlossaryEntry[]>

export type GlossaryCategory = keyof typeof PROCUREMENT_GLOSSARY

const EXACT_FORMS = new Set([
  'contract',
  'contracts',
  'contrat',
  'contrats',
  'contrato',
  'contratos',
  'cips',
  'cip',
])

export function isCjkText(value: string): boolean {
  return /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(value)
}

export function normalizeProcurementText(text: string): string {
  return text
    .replace(/＄/g, '$')
    .replace(/\$/g, ' usd ')
    .replace(/€/g, ' eur ')
    .replace(/£/g, ' gbp ')
    .replace(/₽/g, ' rub ')
    .replace(/%/g, ' percent ')
    .replace(/\bl\s*\/\s*c\b/gi, ' lc ')
    .replace(/[‐‑–—−-]/g, ' ')
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/œ/gi, 'oe')
    .replace(/\b([dlnj])['’]/gi, '$1 ')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    .replace(/ß/g, 'ss')
    .replace(/₂/g, '2')
    .replace(/μ/g, 'u')
    .replace(/[’']/g, '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formPattern(form: string): string {
  const needle = normalizeProcurementText(form).trim()
  if (!needle) return '$^'
  if (isCjkText(needle)) return escapeRegExp(needle)
  const parts = needle.split(/\s+/).map(escapeRegExp)
  const body = parts.join('\\s+')
  if (EXACT_FORMS.has(needle)) {
    return `(?:^|[^\\p{L}\\p{N}])${body}(?=$|[^\\p{L}\\p{N}])`
  }
  const lastIsShort = parts[parts.length - 1].length <= 3 && parts.length === 1
  const inflected = lastIsShort ? body : `${body}[\\p{L}\\p{N}]*`
  return `(?:^|[^\\p{L}\\p{N}])${inflected}(?=$|[^\\p{L}\\p{N}])`
}

/** True when a glossary form appears, including a Russian inflection of a single word. */
export function textHasForm(text: string, form: string): boolean {
  const needle = normalizeProcurementText(form).trim()
  if (!needle) return false
  return new RegExp(formPattern(form), 'iu').test(normalizeProcurementText(text))
}

export function entryAppears(text: string, forms: readonly string[]): boolean {
  return forms.some((form) => textHasForm(text, form))
}

export function formSpans(text: string, form: string): Array<{ start: number; end: number }> {
  const hay = normalizeProcurementText(text)
  const needle = normalizeProcurementText(form).trim().split(/\s+/)[0] ?? ''
  const spans: Array<{ start: number; end: number }> = []
  for (const match of hay.matchAll(new RegExp(formPattern(form), 'giu'))) {
    const rawStart = match.index ?? 0
    const local = needle ? match[0].indexOf(needle) : 0
    const start = rawStart + (local >= 0 ? local : 0)
    spans.push({ start, end: rawStart + match[0].length })
  }
  return spans
}

export function maskForms(text: string, forms: readonly string[]): string {
  let masked = normalizeProcurementText(text)
  const ranked = [...forms].sort((left, right) => right.length - left.length)
  for (const form of ranked) {
    masked = masked.replace(new RegExp(formPattern(form), 'giu'), (match) => ' '.repeat(match.length))
  }
  return masked
}

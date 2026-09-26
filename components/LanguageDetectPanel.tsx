'use client'

import { useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/config'

type Probe = {
  text: string
  language: string | null
  label: string
  speakable: boolean
}

type Role = 'buyer' | 'supplier'

const COPY: Record<Locale, {
  title: string
  hint: string
  buyer: string
  supplier: string
  say: string
  stop: string
  listening: string
  empty: string
  apply: string
  unknown: string
  noVoice: string
  same: string
}> = {
  en: {
    title: 'Detect languages',
    hint: 'Say one short sentence. Then the other person does the same. The lists above fill in from what was heard.',
    buyer: 'Buyer',
    supplier: 'Supplier',
    say: 'Say something',
    stop: 'Done',
    listening: 'Listening…',
    empty: 'Not heard yet',
    apply: 'Use these languages',
    unknown: 'This language is not in the translator list. Choose it in the lists above.',
    noVoice: 'This language can be heard, but the translator cannot speak it. Pick another supplier language.',
    same: 'Both samples sound like the same language. Say them again in two different languages.',
  },
  es: {
    title: 'Detectar idiomas',
    hint: 'Diga una frase corta. Luego la otra persona hace lo mismo. Las listas de arriba se rellenan con lo oído.',
    buyer: 'Comprador',
    supplier: 'Proveedor',
    say: 'Di algo',
    stop: 'Listo',
    listening: 'Escuchando…',
    empty: 'Aún no se oyó',
    apply: 'Usar estos idiomas',
    unknown: 'Este idioma no está en la lista. Elíjalo arriba.',
    noVoice: 'Este idioma se oye, pero el traductor no puede hablarlo. Elija otro idioma del proveedor.',
    same: 'Las dos muestras suenan al mismo idioma. Díganlas otra vez en dos idiomas distintos.',
  },
  fr: {
    title: 'Détecter les langues',
    hint: 'Dites une courte phrase. Puis l’autre personne fait de même. Les listes ci-dessus se remplissent.',
    buyer: 'Acheteur',
    supplier: 'Fournisseur',
    say: 'Dites quelque chose',
    stop: 'Terminé',
    listening: 'Écoute…',
    empty: 'Pas encore entendu',
    apply: 'Utiliser ces langues',
    unknown: 'Cette langue n’est pas dans la liste. Choisissez-la au-dessus.',
    noVoice: 'Cette langue est entendue, mais le traducteur ne peut pas la parler. Choisissez une autre langue pour le fournisseur.',
    same: 'Les deux extraits sont dans la même langue. Redites-les dans deux langues différentes.',
  },
  ar: {
    title: 'تحديد اللغات',
    hint: 'قل جملة قصيرة. ثم يفعل الشخص الآخر الشيء نفسه. تُملأ القوائم أعلاه مما سُمع.',
    buyer: 'المشتري',
    supplier: 'المورد',
    say: 'قل شيئًا',
    stop: 'تم',
    listening: 'أستمع…',
    empty: 'لم يُسمع بعد',
    apply: 'استخدم هاتين اللغتين',
    unknown: 'هذه اللغة ليست في القائمة. اخترها من القوائم أعلاه.',
    noVoice: 'يمكن سماع هذه اللغة، لكن المترجم لا يستطيع نطقها. اختر لغة أخرى للمريض.',
    same: 'العينتان باللغة نفسها. أعيدا القول بلغتين مختلفتين.',
  },
  hi: {
    title: 'भाषा पहचानें',
    hint: 'एक छोटा वाक्य बोलें। फिर दूसरा व्यक्ति भी बोले। ऊपर की सूचियाँ सुनी हुई भाषा से भर जाएँगी।',
    buyer: 'क्रेता',
    supplier: 'आपूर्तिकर्ता',
    say: 'कुछ बोलें',
    stop: 'हो गया',
    listening: 'सुन रहा हूँ…',
    empty: 'अभी नहीं सुना',
    apply: 'ये भाषाएँ लगाएँ',
    unknown: 'यह भाषा सूची में नहीं है। ऊपर से चुनें।',
    noVoice: 'यह भाषा सुनी जा सकती है, बोली नहीं। आपूर्तिकर्ता की दूसरी भाषा चुनें।',
    same: 'दोनों नमूने एक ही भाषा के हैं। दो अलग भाषाओं में फिर बोलें।',
  },
  'pt-BR': {
    title: 'Detectar idiomas',
    hint: 'Diga uma frase curta. Depois a outra pessoa faz o mesmo. As listas acima se preenchem com o que foi ouvido.',
    buyer: 'Comprador',
    supplier: 'Fornecedor',
    say: 'Diga algo',
    stop: 'Pronto',
    listening: 'Ouvindo…',
    empty: 'Ainda não ouvido',
    apply: 'Usar estes idiomas',
    unknown: 'Este idioma não está na lista. Escolha-o acima.',
    noVoice: 'Este idioma é ouvido, mas o tradutor não pode falá-lo. Escolha outro idioma do fornecedor.',
    same: 'As duas amostras parecem o mesmo idioma. Digam de novo em dois idiomas diferentes.',
  },
  id: {
    title: 'Deteksi bahasa',
    hint: 'Ucapkan satu kalimat pendek. Lalu orang lain melakukan hal yang sama. Daftar di atas terisi dari yang terdengar.',
    buyer: 'Pembeli',
    supplier: 'Pemasok',
    say: 'Ucapkan sesuatu',
    stop: 'Selesai',
    listening: 'Mendengarkan…',
    empty: 'Belum terdengar',
    apply: 'Pakai bahasa ini',
    unknown: 'Bahasa ini tidak ada dalam daftar. Pilih di atas.',
    noVoice: 'Bahasa ini bisa didengar, tetapi tidak bisa diucapkan. Pilih bahasa pasien yang lain.',
    same: 'Kedua sampel terdengar bahasa yang sama. Ucapkan lagi dalam dua bahasa berbeda.',
  },
  ms: {
    title: 'Kesan bahasa',
    hint: 'Sebut satu ayat pendek. Kemudian orang lain buat perkara yang sama. Senarai di atas diisi daripada apa yang didengar.',
    buyer: 'Pembeli',
    supplier: 'Pembekal',
    say: 'Sebut sesuatu',
    stop: 'Selesai',
    listening: 'Mendengar…',
    empty: 'Belum didengar',
    apply: 'Guna bahasa ini',
    unknown: 'Bahasa ini tiada dalam senarai. Pilih di atas.',
    noVoice: 'Bahasa ini boleh didengar, tetapi tidak boleh dituturkan. Pilih bahasa pembekal yang lain.',
    same: 'Kedua-dua sampel bahasa yang sama. Sebut semula dalam dua bahasa berbeza.',
  },
  tr: {
    title: 'Dilleri algıla',
    hint: 'Kısa bir cümle söyleyin. Sonra diğer kişi aynısını yapsın. Yukarıdaki listeler duyulan dille dolar.',
    buyer: 'Alıcı',
    supplier: 'Tedarikçi',
    say: 'Bir şey söyleyin',
    stop: 'Bitti',
    listening: 'Dinliyorum…',
    empty: 'Henüz duyulmadı',
    apply: 'Bu dilleri kullan',
    unknown: 'Bu dil listede yok. Yukarıdan seçin.',
    noVoice: 'Bu dil duyulur, ama çevirmen söyleyemez. Tedarikçi için başka bir dil seçin.',
    same: 'İki örnek aynı dil gibi. İki farklı dilde yeniden söyleyin.',
  },
  'zh-CN': {
    title: '识别语言',
    hint: '说一句短话。然后另一个人也说一句。上面的语言列表会按听到的内容填入。',
    buyer: '采购方',
    supplier: '供应商',
    say: '说一句',
    stop: '说完了',
    listening: '正在听…',
    empty: '还没听到',
    apply: '使用这两种语言',
    unknown: '翻译器列表里没有这种语言。请在上面的列表里选择。',
    noVoice: '这种语言可以听懂，但不能朗读。请为供应商另选一种语言。',
    same: '两段听起来是同一种语言。请用两种不同的语言再说一次。',
  },
  ru: {
    title: 'Определить языки',
    hint: 'Скажите одну короткую фразу. Потом то же делает другой человек. Списки выше заполнятся по тому, что услышано.',
    buyer: 'Вы',
    supplier: 'Он/она',
    say: 'Скажите фразу',
    stop: 'Готово',
    listening: 'Слушаю…',
    empty: 'Пока не слышно',
    apply: 'Использовать эти языки',
    unknown: 'Этого языка нет в списке переводчика. Выберите его в списках выше.',
    noVoice: 'Этот язык можно услышать, но переводчик не может его произнести. Выберите другой язык поставщика.',
    same: 'Обе фразы звучат на одном языке. Скажите их снова на двух разных языках.',
  },
}

async function recordPhrase(stopSignal: AbortSignal): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  recorder.start()
  const timeout = window.setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop()
  }, 8000)
  const onAbort = () => {
    if (recorder.state !== 'inactive') recorder.stop()
  }
  stopSignal.addEventListener('abort', onAbort)
  await stopped
  window.clearTimeout(timeout)
  stopSignal.removeEventListener('abort', onAbort)
  stream.getTracks().forEach((track) => track.stop())
  return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
}

export default function LanguageDetectPanel({
  locale,
  disabled,
  onApply,
}: {
  locale: Locale
  disabled: boolean
  onApply: (buyer: string, supplier: string) => void
}) {
  const copy = COPY[locale]
  const stopRef = useRef<AbortController | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [buyer, setBuyer] = useState<Probe | null>(null)
  const [supplier, setSupplier] = useState<Probe | null>(null)
  const [error, setError] = useState('')

  const listen = async (next: Role) => {
    if (role || disabled) return
    setError('')
    const stop = new AbortController()
    stopRef.current = stop
    setRole(next)
    try {
      const blob = await recordPhrase(stop.signal)
      const form = new FormData()
      form.append('audio', blob, 'sample.webm')
      const response = await fetch('/api/detect-language', { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(typeof payload?.error === 'string' ? payload.error : copy.unknown)
        return
      }
      const probe: Probe = {
        text: typeof payload.text === 'string' ? payload.text : '',
        language: typeof payload.language === 'string' ? payload.language : null,
        label: typeof payload.label === 'string' && payload.label ? payload.label : copy.unknown,
        speakable: Boolean(payload.speakable),
      }
      if (next === 'buyer') setBuyer(probe)
      else setSupplier(probe)
    } catch {
      setError(copy.unknown)
    } finally {
      stopRef.current = null
      setRole(null)
    }
  }

  const apply = () => {
    if (!buyer?.language || !supplier?.language) return
    if (buyer.language === supplier.language) {
      setError(copy.same)
      return
    }
    if (!supplier.speakable) {
      setError(copy.noVoice)
      return
    }
    onApply(buyer.language, supplier.language)
    setError('')
  }

  const row = (next: Role, probe: Probe | null) => (
    <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{next === 'buyer' ? copy.buyer : copy.supplier}</p>
        <button
          type="button"
          disabled={disabled || (role !== null && role !== next)}
          onClick={() => {
            if (role === next) {
              stopRef.current?.abort()
              return
            }
            void listen(next)
          }}
          className="rounded-full bg-primary-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {role === next ? copy.stop : copy.say}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {role === next ? copy.listening : probe ? `${probe.label}${probe.text ? ` — ${probe.text}` : ''}` : copy.empty}
      </p>
    </div>
  )

  return (
    <section className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
      <h2 className="text-base font-bold text-primary-900">{copy.title}</h2>
      <p className="mt-1 text-sm text-primary-800">{copy.hint}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {row('buyer', buyer)}
        {row('supplier', supplier)}
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={disabled || !buyer?.language || !supplier?.language}
        className="mt-3 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {copy.apply}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}

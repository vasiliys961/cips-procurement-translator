'use client'

import { useState } from 'react'
import AccessGate from '@/components/AccessGate'
import RealtimeTranslatorPanel from '@/components/RealtimeTranslator'
import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config'

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  return (
    <div className="min-h-screen">
      <header className="bg-primary-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-bold tracking-tight">CIPS</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary-200">
              Переводчик для специалиста по закупкам
            </p>
          </div>
          <label className="text-xs font-semibold text-primary-100">
            Язык интерфейса
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="mt-1 block rounded-lg border border-white/20 bg-white px-3 py-2 text-sm font-medium text-primary-900"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <AccessGate>
          <RealtimeTranslatorPanel locale={locale} />
        </AccessGate>
      </main>
    </div>
  )
}

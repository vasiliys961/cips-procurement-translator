'use client'

import { useEffect, useState } from 'react'
import { appUi } from '@/lib/i18n/app-ui'
import AccessGate from '@/components/AccessGate'
import RealtimeTranslatorPanel from '@/components/RealtimeTranslator'
import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, isLocale, type Locale } from '@/lib/i18n/config'

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  const ui = appUi[locale].common
  useEffect(() => {
    try { const saved = localStorage.getItem('translator-ui-locale'); if (isLocale(saved)) setLocale(saved) } catch { /* Optional. */ }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.title = appUi[locale].common.appTitle
  }, [locale])

  return (
    <div className="min-h-screen" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <header className="bg-primary-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-bold tracking-tight">CIPS</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary-200">
              {ui.headerSubtitle}
            </p>
          </div>
          <label className="text-xs font-semibold text-primary-100">
            {ui.interfaceLanguage}
            <select
              value={locale}
              onChange={(event) => {
                const value = event.target.value
                if (!isLocale(value)) return
                setLocale(value)
                try { localStorage.setItem('translator-ui-locale', value) } catch { /* Optional. */ }
              }}
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
      <main className="mx-auto max-w-4xl px-4 py-6">
        <AccessGate locale={locale}>
          <RealtimeTranslatorPanel locale={locale} />
        </AccessGate>
      </main>
    </div>
  )
}

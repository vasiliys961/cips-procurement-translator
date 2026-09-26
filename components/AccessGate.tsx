'use client'

import { FormEvent, useEffect, useState, type ReactNode } from 'react'

export default function AccessGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [draftEmail, setDraftEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setEmail(typeof body?.email === 'string' ? body.email : null)
      })
      .catch(() => {
        if (!cancelled) setEmail(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draftEmail, password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(typeof body?.error === 'string' ? body.error : 'Не удалось войти')
        return
      }
      setPassword('')
      setEmail(typeof body?.email === 'string' ? body.email : draftEmail.trim().toLowerCase())
    } catch {
      setError('Не удалось войти')
    } finally {
      setPending(false)
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setEmail(null)
  }

  if (!ready) {
    return <p className="text-sm text-slate-500">Загрузка…</p>
  }

  if (!email) {
    return (
      <form onSubmit={signIn} className="rounded-2xl border border-primary-100 bg-white p-6 shadow-lg">
        <h1 className="text-lg font-semibold text-primary-900">Вход</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Речевой перевод для специалиста CIPS: переговоры закупщика и поставщика, 18 языков, определение языка по фразе.
          Это рабочий инструмент по языку закупок, а не официальный сервис Королевского института закупок и поставок.
        </p>
        <label className="mt-4 block text-sm font-medium text-primary-900">
          Эл. почта
          <input
            type="email"
            autoComplete="username"
            value={draftEmail}
            onChange={(event) => setDraftEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-primary-200 px-3 py-2 text-base"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-primary-900">
          Пароль
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-primary-200 px-3 py-2 text-base"
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{email}</span>
        <button type="button" onClick={signOut} className="font-semibold text-primary-800 hover:underline">
          Выйти
        </button>
      </div>
      {children}
    </div>
  )
}

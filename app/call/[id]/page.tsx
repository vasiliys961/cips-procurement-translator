import { Suspense } from 'react'
import GuestCall from '@/components/GuestCall'

export default function CallPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-10 text-slate-500">…</main>}>
      <GuestCall roomId={params.id} />
    </Suspense>
  )
}

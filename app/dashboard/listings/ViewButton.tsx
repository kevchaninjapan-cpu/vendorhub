'use client'

import { useRouter } from 'next/navigation'

export function ViewButton({ id }: { id: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      className="text-blue-600 hover:underline"
      onClick={() => router.push(`/admin/listings/${id}`)}
    >
      View
    </button>
  )
}

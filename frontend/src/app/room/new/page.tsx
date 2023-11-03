"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import clientService from "@/lib/ClientService"
export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // @ts-expect-error
    const theme = e.target["theme"].value
    try {
      setIsLoading(true)
      const { roomId } = await clientService.createRoom(theme)
      router.push(roomId)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <form onSubmit={handleSubmit} className="mb-4 rounded bg-white px-8 pb-8 pt-6 shadow-md">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="theme">
            テーマ
          </label>
          <input
            className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            id="theme"
            name="theme"
            required
            type="text"
            placeholder="楽"
          />
        </div>

        <div className="flex items-center justify-center">
          <button
            className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none disabled:bg-slate-400"
            disabled={isLoading}
          >
            ブレインストーミングを始める
          </button>
        </div>
      </form>
    </div>
  )
}

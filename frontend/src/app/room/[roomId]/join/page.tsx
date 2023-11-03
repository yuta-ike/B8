"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { HiCheck } from "react-icons/hi2"

import clientService from "@/lib/ClientService"
import { COLORS } from "@/lib/color"

type HomeProps = {
  params: {
    roomId: string
  }
}

export default function Home({ params: { roomId } }: HomeProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      // @ts-expect-error
      const userId = await clientService.createUser(e.target["username"].value, selectedColor)
      router.push(`/room/${roomId}?user_id=${userId}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center py-2"
      style={{
        backgroundImage:
          "linear-gradient(0deg, transparent 15px, #dddddd 16px), linear-gradient(90deg, transparent 15px, #dddddd 16px)",
        backgroundSize: "16px 16px",
      }}
    >
      <form onSubmit={handleSubmit} className="mb-4">
        <div
          className="mb-4 flex flex-col gap-8 rounded px-8 pb-8 pt-6 shadow-md"
          style={{
            background: COLORS.find(({ id }) => id === selectedColor)?.color ?? "white",
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-bold  text-slate-800" htmlFor="username">
              ユーザー名
            </label>
            <input
              className="w-full appearance-none rounded border border-slate-200 bg-white/50 px-3 py-2 leading-tight text-slate-800 placeholder:text-slate-600/80 focus:outline-none"
              id="username"
              name="username"
              required
              type="text"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="username">
              付箋の色を選ぼう
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(({ id, color }) => {
                const isSelected = selectedColor === id
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSelectedColor(id)}
                    style={{ background: color }}
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/80 text-white"
                    aria-label={id}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <HiCheck strokeWidth={2} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center">
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

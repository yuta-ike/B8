"use client"
import { useState } from "react"

import clientService from "@/lib/ClientService"
export default function Home() {
  const [theme, setTheme] = useState("楽")
  const [roomId, setRoomId] = useState("")
  const onSubmit = async () => {
    const { roomId } = await clientService.createRoom(theme)
    setRoomId(roomId)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      {!roomId ? (
        <div className="mb-4 rounded bg-white px-8 pb-8 pt-6 shadow-md">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="theme">
              テーマ
            </label>
            <input
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              id="theme"
              type="text"
              placeholder="楽"
            />
          </div>

          <div className="flex items-center justify-center">
            <button
              className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
              type="button"
              onClick={onSubmit}
            >
              ブレインストーミングを始める
            </button>
          </div>
        </div>
      ) : (
        <div>hoge</div>
      )}
    </div>
  )
}

"use client"
import { useEffect } from "react"

import clientService from "@/lib/ClientService"

export default function Page({ params: { roomId } }) {
  useEffect(() => {
    ;(async () => {
      const { info, error } = await clientService.getRoomInfo(roomId)
    })()
  }, [])
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <button onClick={() => clientService.sendMessage("message")}>send message</button>
    </div>
  )
}

import { useCallback, useEffect, useState } from "react"

import { ClientService } from "./ClientService"
import { genId } from "./genId"

export const useSendMessage = (userId: string) => {
  const [clientService] = useState(() => new ClientService(userId))
  const sendMessage = useCallback(
    (text: string) => {
      const id = genId()
      clientService.sendMessage(id, text)
    },
    [clientService],
  )
  return sendMessage
}

export const useSubscribeChat = (
  userId: string,
  callback: (data: {
    id: string
    text: string
    user: string
    username: string
    color: string
  }) => void,
) => {
  const [clientService] = useState(() => new ClientService(userId))

  useEffect(() => {
    const unsubscribe = clientService.setSayCallback((data) => {
      callback(data)
    })
    return () => {
      unsubscribe()
    }
  }, [callback, clientService])
}

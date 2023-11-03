import { useCallback, useEffect } from "react"

import clientService from "./ClientService"
import { genId } from "./genId"

export const useSendMessage = () => {
  const sendMessage = useCallback((text: string) => {
    const id = genId()
    clientService.sendMessage(id, text)
  }, [])
  return sendMessage
}

export const useSubscribeChat = (
  callback: (data: { id: string; text: string; user: string }) => void,
) => {
  useEffect(() => {
    const unsubscribe = clientService.setSayCallback((data) => {
      callback(data)
    })
    return () => {
      unsubscribe()
    }
  }, [callback])
}

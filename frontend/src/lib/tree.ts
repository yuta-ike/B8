import { useCallback, useEffect, useState } from "react"

import clientService, { ClientService, TreeDiff } from "./ClientService"
import { genId } from "./genId"

export const useAddNewNode = (userId: string) => {
  const [clientService] = useState(() => new ClientService(userId))
  const addNewNode = useCallback(
    (parentNodeId: string, color: string) => {
      const id = genId()
      clientService.sendTreeDiff({
        type: "add",
        parentNodeId,
        newNodeId: id,
        color,
      })
      return id
    },
    [clientService],
  )

  return addNewNode
}

export const useUpdateNodeText = (userId: string) => {
  const [clientService] = useState(() => new ClientService(userId))
  const addNewNode = useCallback(
    (nodeId: string, text: string) => {
      clientService.sendTreeDiff({
        type: "update",
        nodeId,
        text,
      })
    },
    [clientService],
  )

  return addNewNode
}

export const useSubscribeTreeDiff = (callback: (data: TreeDiff) => void) => {
  useEffect(() => {
    const unsubscribe = clientService.setResponseCallback((data) => {
      callback(data)
    })
    return () => {
      unsubscribe()
    }
  }, [callback])
}

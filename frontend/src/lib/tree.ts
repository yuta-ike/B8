import { useCallback, useEffect } from "react"

import clientService, { TreeDiff } from "./ClientService"
import { genId } from "./genId"

export const useAddNewNode = () => {
  const addNewNode = useCallback((parentNodeId: string) => {
    const id = genId()
    clientService.sendTreeDiff({
      type: "add",
      parentNodeId,
      newNodeId: id,
    })
    return id
  }, [])

  return addNewNode
}

export const useUpdateNodeText = () => {
  const addNewNode = useCallback((nodeId: string, text: string) => {
    clientService.sendTreeDiff({
      type: "update",
      nodeId,
      text,
    })
  }, [])

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

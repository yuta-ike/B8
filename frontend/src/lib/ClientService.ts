import { Socket, io } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"

const BACKEND = "http://127.0.0.1:5000"

export type TreeDiff =
  | {
      type: "add"
      parentNodeId: string
      newNodeId: string
    }
  | {
      type: "update"
      nodeId: string
      text: string
    }

class ClientService {
  socket: Socket
  username: string = uuidv4()
  callbackFlg: boolean = false
  sayCallbackFlg: boolean = false

  constructor() {
    const socket = io(BACKEND)
    this.socket = socket
  }

  public sendMessage(id: string, text: string) {
    this.socket.emit("say", { id, user: this.username, text })
  }

  public setSayCallback(callback: (data: any) => void) {
    // sayがサーバーから送られてきたときに走るコールバックを登録する

    // sayCallbackFlgがfalseのときのみコールバックを走らせる
    this.socket.on("say", (data: any) => {
      callback(data)
    })
    return () => this.socket.off("say")
  }

  public sendTreeDiff(diff: TreeDiff) {
    this.socket.emit(
      "tree_diff",
      diff.type === "add"
        ? {
            type: "add",
            parent_node_id: diff.parentNodeId,
            new_node_id: diff.newNodeId,
          }
        : {
            type: "update",
            node_id: diff.nodeId,
            text: diff.text,
          },
    )
  }

  public setResponseCallback(callback: (data: TreeDiff) => void) {
    // treeのdiffがサーバーから送られてきたときに走るコールバックを登録する

    this.socket.on("update_tree", (data: any) => {
      console.log(data)
      if (data.type === "add") {
        callback({
          type: "add",
          parentNodeId: data.parent_node_id,
          newNodeId: data.new_node_id,
        })
      } else {
        callback({
          type: "update",
          nodeId: data.node_id,
          text: data.text,
        })
      }
    })

    return () => this.socket.off("update_tree")
  }

  public setUsername(username: string) {
    this.username = username
  }

  public async createRoom(theme: string) {
    const resp = await fetch(`${BACKEND}/room/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: theme }),
    })
    const data = await resp.json()
    return { roomId: data.room_id }
  }

  public async getRoomInfo(roomId: string) {
    const resp = await fetch(`${BACKEND}/room/${roomId}`)
    const data = (await resp.json()) as { room_id: string; theme: string }
    return { info: data }
  }
}

const clientService = new ClientService()
export default clientService

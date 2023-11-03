import { Socket, io } from "socket.io-client"

const BACKEND = "http://127.0.0.1:5000"

export type TreeDiff =
  | {
      type: "add"
      parentNodeId: string
      newNodeId: string
      color: string
    }
  | {
      type: "update"
      nodeId: string
      text: string
    }
  | {
      type: "add_ai"
      nodeId: string
    }

export class ClientService {
  socket: Socket
  // username: string = uuidv4()
  callbackFlg: boolean = false
  sayCallbackFlg: boolean = false
  userId?: string
  user: {
    user_id: string
    username: string
    color: string
  } | null = null

  constructor(userId?: string) {
    const socket = io(BACKEND)
    this.socket = socket
    this.userId = userId

    this.getUser(userId)
  }

  public async createUser(username: string, color: string) {
    return new Promise<string>((resolve) =>
      this.socket.emit("create_user", { username, color }, (data: { user_id: string }) =>
        resolve(data.user_id),
      ),
    )
  }

  public async getUser(userId?: string) {
    if (this.user != null) {
      return this.user
    }
    if (userId == null) {
      return null
    }
    const res = await fetch(`${BACKEND}/user/${this.userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    const data = await res.json()
    this.user = data
    return data as { user_id: string; username: string; color: string }
  }

  public async sendMessage(id: string, text: string) {
    const user = await this.getUser()
    this.socket.emit("say", { id, user: user?.user_id, color: user?.color, text })
  }

  public setSayCallback(callback: (data: any) => void) {
    // sayがサーバーから送られてきたときに走るコールバックを登録する

    // sayCallbackFlgがfalseのときのみコールバックを走らせる
    this.socket.on("say", (data: any) => {
      callback(data)
    })
    return () => this.socket.off("say")
  }

  public async sendTreeDiff(diff: TreeDiff) {
    this.socket.emit(
      "tree_diff",
      diff.type === "add"
        ? {
            type: "add",
            parent_node_id: diff.parentNodeId,
            new_node_id: diff.newNodeId,
            user_id: this.userId,
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
      if (data.type === "add") {
        callback({
          type: "add",
          parentNodeId: data.parent_node_id,
          newNodeId: data.new_node_id,
          color: data.color,
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

  // public setUsername(username: string) {
  //   this.username = username
  // }

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

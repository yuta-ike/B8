import { io } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"

const BACKEND = "http://127.0.0.1:5000"

class ClientService {
  socket: any
  username: string = uuidv4()
  callbackFlg: boolean = false
  sayCallbackFlg: boolean = false

  constructor() {
    const socket = io(BACKEND)
    this.socket = socket
  }

  public sendMessage(message: string) {
    this.socket.emit("say", { user: this.username, text: message })
  }

  public setResponseCallback(callback: any) {
    // treeのdiffがサーバーから送られてきたときに走るコールバックを登録する
    if (!this.callbackFlg) {
      this.socket.on("update_tree", (data: any) => {
        callback(data)
      })
      this.callbackFlg = true
    }
  }

  public setSayCallback(callback: any) {
    // sayがサーバーから送られてきたときに走るコールバックを登録する

    // sayCallbackFlgがfalseのときのみコールバックを走らせる
    if (!this.sayCallbackFlg) {
      this.socket.on("say", (data: any) => {
        callback(data)
      })
      this.sayCallbackFlg = true
    }
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
    return { roomId: data.roomId }
  }

  public async getRoomInfo(roomId) {
    const resp = await fetch(`${BACKEND}/room/${roomId}`)
    const data = await resp.json()
    return { info: data }
  }
}

const clientService = new ClientService()
export default clientService

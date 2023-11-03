import { io } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"

class ClientService {
  socket: any
  username: string = uuidv4()

  constructor() {
    const socket = io("http://127.0.0.1:5000")
    this.socket = socket
  }

  public sendMessage(message: string) {
    this.socket.emit("say", { user: this.username, text: message })
  }

  public setResponseCallback(callback: any) {
    // treeのdiffがサーバーから送られてきたときに走るコールバックを登録する
    this.socket.on("update_tree", (data: any) => {
      callback(data)
    })
  }
}

const clientService = new ClientService()
export default clientService

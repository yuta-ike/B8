"use client"
import { useState } from "react"

import clientService from "@/lib/ClientService"

const Test = () => {
  const [messages, setMessages] = useState(["hgo", "hgo"])
  clientService.setResponseCallback((message) => {
    console.log("message", message)
    console.log("messages", messages)
    setMessages([...messages, message])
    setMessages([message["text"]])
  })
  return (
    <div>
      <div>
        <button onClick={() => clientService.sendMessage("message")}>send message</button>
      </div>
      message
      <div>{messages?.map((message, index) => <div key={index}>{message}</div>)}</div>
    </div>
  )
}

export default Test

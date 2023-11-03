"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import clsx from "clsx"
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict"
import ja from "date-fns/locale/ja"
import format from "date-fns/format"

import clientService from "@/lib/ClientService"

export default function Home() {
  const [recording, setRecording] = useState(false)
  const [tmpResult, setTmpResult] = useState("")
  const [userName, setUserName] = useState("")
  const [chatHistory, setChatHistory] = useState<{ text: string; date: Date }[]>([])

  const speechRecognition = useMemo(() => {
    const speechRecognition = new webkitSpeechRecognition()
    speechRecognition.lang = "ja-JP"
    speechRecognition.continuous = true
    speechRecognition.interimResults = true
    return speechRecognition
  }, [])

  const startRecognition = useCallback(() => {
    flushSync(() => {
      setRecording(true)
    })
  }, [])

  useEffect(() => {
    if (!recording) {
      speechRecognition.stop()
      return
    }

    speechRecognition.start()

    const resultListener = (e: SpeechRecognitionEvent) => {
      const result = e.results[0]
      if (result == null) {
        return
      }

      const transcript = result[0]?.transcript
      if (transcript == null) {
        return
      }

      if (result.isFinal) {
        speechRecognition.stop()
        // setChatHistory((prev) => [...prev, { text: transcript, date: new Date() }])
        if (transcript.length !== 0) {
          clientService.sendMessage(transcript)
        }
        setTmpResult("")
      } else {
        setTmpResult(transcript)
      }
    }

    const endListener = (_: Event) => {
      if (recording) {
        speechRecognition.start()
      }
    }

    speechRecognition.addEventListener("result", resultListener)
    speechRecognition.addEventListener("end", endListener)
    return () => {
      speechRecognition.removeEventListener("result", resultListener)
      speechRecognition.removeEventListener("end", endListener)
    }
  }, [recording, speechRecognition])

  useEffect(() => {
    clientService.setSayCallback((data) => {
      console.log("event say fired", data)
      setChatHistory((prev) => [...prev, { text: data["text"], date: new Date() }])
    })
  }, [])

  const stopRecognition = useCallback(() => {
    setRecording(false)
    speechRecognition.stop()
  }, [speechRecognition])

  const reverseChatHistory = useMemo(() => {
    const newChatHistory = [...chatHistory]
    newChatHistory.reverse()
    return newChatHistory
  }, [chatHistory])

  const handleChange = (event) => {
    console.log(event)
    setUserName(event.target.value)
    clientService.setUsername(event.target.value)
  }

  return (
    <main className="flex max-w-[600px] flex-col gap-4 p-8 text-sm font-bold">
      {/* <form className="mb-4 rounded bg-white px-8 pb-8 pt-6 shadow-md">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="username">
            Username
          </label>
          <input
            className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            id="username"
            type="text"
            placeholder="Username"
          />
        </div>
      </form> */}
      <form>
        <label>
          Name:
          <input type="text" name="name" onChange={handleChange} />
        </label>
        <input type="submit" value="Submit" />
      </form>

      <a href="https://us05web.zoom.us/j/89976146840?pwd=oNQVW2BUzFCzbJVGfj9MkDIbJlwtPb.1">zoom</a>
      <div className="flex gap-4">
        {recording ? (
          <button
            onClick={stopRecognition}
            className="rounded bg-rose-500 px-4 py-2 text-white shadow-inner transition hover:bg-rose-600 active:translate-y-1 active:shadow-none"
          >
            停止
          </button>
        ) : (
          <button
            onClick={startRecognition}
            className="rounded bg-sky-500 px-4 py-2 text-white shadow transition hover:bg-sky-600 active:translate-y-1 active:shadow-none"
          >
            開始
          </button>
        )}
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="text-sm font-bold text-slate-600">{recording ? "認識中..." : "停止中"}</div>
        <div className="h-[4lh] rounded bg-slate-200 p-4 text-slate-600">{tmpResult}</div>
      </div>
      <hr className="w-full" />
      <div className="flex flex-col gap-2">
        {reverseChatHistory.map((chat, i) => (
          <div
            key={`${i}_${chat}`}
            className={clsx(
              "rounded bg-white px-6 py-4 shadow",
              chat.text.length === 0 ? "text-slate-400" : "text-slate-600",
            )}
          >
            <div>{0 < chat.text.length ? chat.text : "空白"}</div>
            <div className="text-xs text-slate-400">
              {formatDistanceToNowStrict(chat.date, { addSuffix: true, locale: ja })} (
              {format(chat.date, "HH時mm分 ss秒")})
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

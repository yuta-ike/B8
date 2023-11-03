import { useCallback, useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"

export const useSpeechRecognition = (callback: (text: string) => void) => {
  const [recording, setRecording] = useState(false)
  const [tmpResult, setTmpResult] = useState("")
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
        setChatHistory((prev) => [...prev, { text: transcript, date: new Date() }])
        setTmpResult("")
        callback(transcript)
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
  }, [callback, recording, speechRecognition])

  const stopRecognition = useCallback(() => {
    setRecording(false)
    speechRecognition.stop()
  }, [speechRecognition])

  return useMemo(
    () => ({
      startRecognition,
      stopRecognition,
      recording,
      tmpResult,
      chatHistory,
    }),
    [chatHistory, recording, startRecognition, stopRecognition, tmpResult],
  )
}

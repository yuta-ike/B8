"use client"
import TextareaAutosize from "react-textarea-autosize"
import {
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiChevronUp,
  HiMicrophone,
} from "react-icons/hi2"
import React, { useCallback, useEffect, useRef, useState } from "react"
import Draggable from "react-draggable"
import { graphlib, layout } from "dagre"
import clsx from "clsx"
import { throttle } from "throttle-debounce"
import { flushSync } from "react-dom"

import { ClientService } from "@/lib/ClientService"
import { useSendMessage, useSubscribeChat } from "@/lib/chat"
import { useAddNewNode, useSubscribeTreeDiff, useUpdateNodeText } from "@/lib/tree"
import { useSpeechRecognition } from "@/lib/speech"
import { COLORS } from "@/lib/color"

const SIZE = {
  WIDTH: 160,
  HEIGHT: 160,
}

const ARROW_STEP = 50

const HANDLE_DISTANCE = 0

type Dir = "top" | "bottom" | "left" | "right"

const addPos = (pos1: Pos, pos2: Pos) => {
  return { x: pos1.x + pos2.x, y: pos1.y + pos2.y }
}
const subPos = (pos1: Pos, pos2: Pos) => {
  return { x: pos1.x - pos2.x, y: pos1.y - pos2.y }
}

const invertPos = (pos: Pos) => {
  return { x: -pos.x, y: -pos.y }
}

const buildPath = (first: [number, number], ...args: [number, number][]) => {
  return `M ${first[0]} ${first[1]} L ${args.map(([x, y]) => `${x} ${y}`).join(" ")}`
}

const getPath = (start: Pos, end: Pos, startDir: Dir, endDir: Dir) => {
  return buildPath(
    [start.x, start.y],
    // [start.x, (start.y + end.y) / 2],
    // [end.x, (start.y + end.y) / 2],
    [end.x, end.y],
  )
  if (startDir === "bottom" && endDir === "top") {
    return buildPath(
      [start.x, start.y],
      [start.x, (start.y + end.y) / 2],
      [end.x, (start.y + end.y) / 2],
      [end.x, end.y],
    )
  }
  if (startDir === "top" && endDir === "bottom") {
    return buildPath(
      [start.x, start.y],
      [start.x, (start.y + end.y) / 2],
      [end.x, (start.y + end.y) / 2],
      [end.x, end.y],
    )
  }
  if (startDir === "left" && endDir === "right") {
    return buildPath(
      [start.x, start.y],
      [(start.x + end.x) / 2, start.y],
      [(start.x + end.x) / 2, end.y],
      [end.x, end.y],
    )
  }
  if (startDir === "right" && endDir === "left") {
    return buildPath(
      [start.x, start.y],
      [(start.x + end.x) / 2, start.y],
      [(start.x + end.x) / 2, end.y],
      [end.x, end.y],
    )
  }
}

const calcDirPos = (pos: Pos, dir: "top" | "bottom" | "left" | "right" | "center") => {
  switch (dir) {
    case "center":
      return { x: pos.x + SIZE.WIDTH / 2, y: pos.y + SIZE.HEIGHT / 2 }
    case "top":
      return { x: pos.x + SIZE.WIDTH / 2, y: pos.y - HANDLE_DISTANCE }
    case "bottom":
      return { x: pos.x + SIZE.WIDTH / 2, y: pos.y + SIZE.HEIGHT + HANDLE_DISTANCE }
    case "left":
      return { x: pos.x - HANDLE_DISTANCE, y: pos.y + SIZE.HEIGHT / 2 }
    case "right":
      return { x: pos.x + SIZE.WIDTH + HANDLE_DISTANCE, y: pos.y + SIZE.HEIGHT / 2 }
  }
}

const initNodes = [
  {
    id: "rootid",
    label: "楽",
  },
  // {
  //   id: "1",
  //   label: "冬でも売れるアイスクリーム",
  // },
  // {
  //   id: "2",
  //   label: "熱い飲み物をかけてたべる",
  // },
  // {
  //   id: "3",
  //   label: "苦い飲み物",
  // },
  // {
  //   id: "4",
  //   label: "コーヒー",
  // },
  // {
  //   id: "5",
  //   label: "青汁",
  // },
  // {
  //   id: "6",
  //   label: "日本茶",
  // },
  // {
  //   id: "7",
  //   label: "温かい場所で提供する",
  // },
  // {
  //   id: "8",
  //   label: "サウナ",
  // },
  // {
  //   id: "9",
  //   label: "温泉や銭湯の風呂上がり",
  // },
  // {
  //   id: "10",
  //   label: "冷たくないアイス",
  // },
  // {
  //   id: "11",
  //   label: "燃える氷的な？",
  // },
]
type Pos = { x: number; y: number }
const initNodePos: Record<string, Pos> = {
  rootid: { x: 0, y: 0 },
  // "1": { x: 0, y: 0 },
  // "2": { x: 0, y: 0 },
  // "3": { x: 0, y: 0 },
  // "4": { x: 0, y: 0 },
  // "5": { x: 0, y: 0 },
  // "6": { x: 0, y: 0 },
  // "7": { x: 0, y: 0 },
  // "8": { x: 0, y: 0 },
  // "9": { x: 0, y: 0 },
  // "10": { x: 0, y: 0 },
  // "11": { x: 0, y: 0 },
}

type Edge = {
  from: {
    id: string
    handle: "right" | "left" | "top" | "bottom"
  }
  to: {
    id: string
    handle: "right" | "left" | "top" | "bottom"
  }
}

const initEdges: Edge[] = [
  // {
  //   from: {
  //     id: "1",
  //     handle: "right",
  //   },
  //   to: {
  //     id: "2",
  //     handle: "left",
  //   },
  // },
  // {
  //   from: {
  //     id: "2",
  //     handle: "right",
  //   },
  //   to: {
  //     id: "3",
  //     handle: "left",
  //   },
  // },
  // {
  //   from: {
  //     id: "3",
  //     handle: "right",
  //   },
  //   to: {
  //     id: "4",
  //     handle: "left",
  //   },
  // },
  // {
  //   from: {
  //     id: "3",
  //     handle: "right",
  //   },
  //   to: {
  //     id: "5",
  //     handle: "left",
  //   },
  // },
  // {
  //   from: {
  //     id: "3",
  //     handle: "right",
  //   },
  //   to: {
  //     id: "6",
  //     handle: "left",
  //   },
  // },
  // {
  //   from: {
  //     id: "1",
  //     handle: "left",
  //   },
  //   to: {
  //     id: "7",
  //     handle: "right",
  //   },
  // },
  // {
  //   from: {
  //     id: "7",
  //     handle: "bottom",
  //   },
  //   to: {
  //     id: "8",
  //     handle: "top",
  //   },
  // },
  // {
  //   from: { id: "7", handle: "bottom" },
  //   to: { id: "9", handle: "top" },
  // },
  // {
  //   from: { id: "1", handle: "left" },
  //   to: { id: "10", handle: "right" },
  // },
  // {
  //   from: { id: "10", handle: "bottom" },
  //   to: { id: "11", handle: "top" },
  // },
]

type CanvasPageProps = {
  params: {
    roomId: string
  }
  searchParams: {
    user_id: string
  }
}

export default function CanvasPage({
  params: { roomId },
  searchParams: { user_id: userId },
}: CanvasPageProps) {
  const [clientService] = useState(() => new ClientService(userId))
  const [dummyInput, setDummyInput] = useState("")

  const [theme, setTheme] = useState("")

  const [transition, setTransition] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [basePos, setBasePos] = useState({ x: 0, y: 0 })
  const [nodes, setNodes] = useState(initNodes)
  const [edges, setEdges] = useState(initEdges)
  const [nodePos, setNodePos] = useState(initNodePos)
  const [ediableNodeId, setEditableNodeId] = useState<string | null>(null)

  const recentlyCreatedNodeId = useRef<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const [focusedPostit, setFocusedPostit] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { info } = await clientService.getRoomInfo(roomId)
      setTheme(info.theme)
    })()
  }, [clientService, roomId])

  useEffect(
    () => {
      const listener = throttle(0, (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          setZoom(function (prev) {
            return prev - e.deltaY / 300
          })
          e.preventDefault()
        } else {
          setBasePos((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }))
        }
      })

      window.addEventListener("wheel", listener, { passive: false })
      return () => {
        window.removeEventListener("wheel", listener)
      }
    },
    [
      // setOrigin,
    ],
  )

  const handleStart = (id: string) => {
    liftUpPostit(id)
    setFocusedPostit(id)
  }

  const liftUpPostit = (id: string) => {
    setNodes((prev) => {
      const targetIndex = prev.findIndex((node) => node.id === id)
      const target = { ...prev[targetIndex]! }
      const newNodes = prev.filter((node) => node.id !== id)
      newNodes.push(target)
      return newNodes
    })
  }

  const focusTo = useCallback((id: string, pos: Pos) => {
    flushSync(() => {
      setTransition(true)
      setBasePos(
        addPos(invertPos(pos), {
          x: window.innerWidth / 2 - SIZE.WIDTH / 2,
          y: window.innerHeight / 2 - SIZE.HEIGHT / 2,
        }),
      )
    })
    setTimeout(() => {
      setTransition(false)
      document.getElementById(`textarea_${id}`)?.focus()
    }, 500)
  }, [])

  useEffect(() => {
    const g = new graphlib.Graph()
    g.setGraph({
      rankdir: "LR",
      ranksep: 100,
    })
    g.setDefaultEdgeLabel(() => ({}))

    nodes.forEach(({ id, label }) =>
      g.setNode(id, { label, width: SIZE.WIDTH, height: SIZE.HEIGHT }),
    )

    edges.forEach(({ from, to }) => {
      g.setEdge(from.id, to.id)
    })

    layout(g)

    g.nodes().map((n) => {
      const node = g.node(n)
      setNodePos((prev) => {
        return { ...prev, [n]: { x: node.x, y: node.y } }
      })
    })
    if (recentlyCreatedNodeId.current != null) {
      const { x, y } = g.node(recentlyCreatedNodeId.current)

      focusTo(recentlyCreatedNodeId.current, { x, y })
      setFocusedNodeId(recentlyCreatedNodeId.current)

      recentlyCreatedNodeId.current = null
    }
  }, [nodes.length, edges.length, nodes, edges, focusTo])

  const addNewNode = useAddNewNode(userId)

  const addChild = useCallback(
    (newId: string, nodeId: string, color: string) => {
      setNodes((prev) => [...prev, { id: newId, label: "", color }])
      setEdges((prev) => [
        ...prev,
        {
          from: {
            id: nodeId,
            handle: "bottom",
          },
          to: {
            id: newId,
            handle: "top",
          },
        },
      ])
      setNodePos((prev) => {
        return { ...prev, [newId]: nodePos[nodeId]! }
      })

      recentlyCreatedNodeId.current = newId
    },
    [nodePos],
  )

  const handleClickNewNode = useCallback(
    async (parentId: string) => {
      const user = await clientService.getUser()
      console.log("handleClickNewNode ================")
      console.log(user)
      const newId = addNewNode(parentId, user!.color)
      addChild(newId, parentId, user!.color)
    },
    [addChild, addNewNode, clientService],
  )

  const updateNodeText = useUpdateNodeText(userId)

  const updateNode = useCallback((id: string, label: string) => {
    setNodes((prev) => {
      const targetIndex = prev.findIndex((node) => node.id === id)
      const target = { ...prev[targetIndex]! }
      target.label = label
      const newNodes = prev.filter((node) => node.id !== id)
      newNodes.push(target)
      return newNodes
    })
  }, [])

  const handleUpdateNode = useCallback(
    (id: string, label: string) => {
      updateNode(id, label)
      updateNodeText(id, label)
    },
    [updateNode, updateNodeText],
  )

  useSubscribeTreeDiff(
    useCallback(
      (data) => {
        if (data.type === "add") {
          if (nodes.find((node) => node.id === data.newNodeId)) return
          addChild(data.newNodeId, data.parentNodeId, data.color)
        } else {
          updateNode(data.nodeId, data.text)
        }
      },
      [addChild, nodes, updateNode],
    ),
  )

  const [comments, setComments] = useState<
    {
      id: string
      text: string
      date: Date
      isMine: boolean
      user: string
      username: string
      color: string
    }[]
  >([])

  const sendMessage = useSendMessage(userId)
  useSubscribeChat(
    userId,
    useCallback((data) => {
      setComments((prev) => [
        {
          id: data.id,
          user: data.user,
          username: data.username,
          color: COLORS.find(({ id }) => id === data.color)?.color ?? "white",
          text: data.text,
          date: new Date(),
          isMine: true,
        },
        ...prev,
      ])
    }, []),
  )

  const { startRecognition, stopRecognition, tmpResult, recording } = useSpeechRecognition(
    useCallback(
      (text) => {
        if (text.length === 0) {
          return
        }
        sendMessage(text)
      },
      [sendMessage],
    ),
  )

  return (
    <div
      className="relative"
      style={{
        backgroundImage:
          "linear-gradient(0deg, transparent 15px, #dddddd 16px), linear-gradient(90deg, transparent 15px, #dddddd 16px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* HEADER */}
      <div className="absolute left-0 top-0 rounded-br bg-white px-4 py-2 text-lg font-bold text-slate-600 shadow">
        <span className="mr-4 text-sm">テーマ:</span>
        {theme}
      </div>
      {/* COMMENTS */}
      <div className="absolute right-4 top-4 z-10 flex max-h-screen flex-col items-end gap-2 overflow-y-hidden">
        <div className="flex w-[400px] items-center gap-4 rounded-full border-2 border-white bg-white/60 px-4 py-3 text-sm font-bold text-slate-600 shadow backdrop-blur">
          {/* <input type="text" value={dummyInput} onChange={(e) => setDummyInput(e.target.value)} />
          <button
            onClick={() => {
              sendMessage(dummyInput)
            }}
          >
            送信
          </button> */}
          <div className="grow">{tmpResult}</div>
          <button
            onClick={recording ? stopRecognition : startRecognition}
            className={clsx("border-l border-slate-300 pl-4", recording ? "text-rose-600" : "")}
          >
            <HiMicrophone />
          </button>
        </div>
        <hr className="my-2 w-full" />
        {comments.map((comment, i) => {
          const isMine = comment.user === userId
          return (
            <div
              key={comment.id}
              className="relative max-w-[400px] rounded-xl border-2 border-white bg-white/60 px-2 py-2 pr-4 text-sm font-bold text-slate-600 shadow backdrop-blur"
              style={{
                width: i === 0 ? 400 : "max-content",
              }}
            >
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {
                    <div
                      className={clsx(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                        isMine && "ring-2 ring-blue-500 ring-offset-2",
                      )}
                      style={{
                        background: comment.color,
                      }}
                    >
                      {comment.username[0]}
                    </div>
                  }

                  <div className="flex flex-col">
                    <div>{comment.text}</div>
                    {/* <div className="text-xs font-normal">yuta-ike</div> */}
                  </div>
                </div>
                {/* <div className="text-xs text-slate-600/50">{format(new Date(), "HH:mm")}</div> */}
              </div>
            </div>
          )
        })}
      </div>
      {/* MINDMAP */}
      <div
        className="relative h-screen w-screen"
        style={{
          transform: `scale(${zoom})`,
        }}
      >
        {edges.map(({ from, to }) => {
          const fromPos = calcDirPos(nodePos[from.id]!, "center")
          const toPos = calcDirPos(nodePos[to.id]!, "center")

          return (
            <svg
              key={`${from.id}-${to.id}`}
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute overflow-visible"
            >
              {/* クリック領域を確保 */}
              <path
                d={getPath(
                  addPos(basePos, fromPos),
                  addPos(basePos, toPos),
                  from.handle,
                  to.handle,
                )}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className={clsx(
                  "pointer-events-auto cursor-pointer",
                  transition && "transition-all duration-500 ease-in-out",
                )}
              />
              {/* 前景色 */}
              <path
                d={getPath(
                  addPos(basePos, fromPos),
                  addPos(basePos, toPos),
                  from.handle,
                  to.handle,
                )}
                fill="none"
                className={clsx(
                  "pointer-events-none",
                  transition && "transition-all duration-500 ease-in-out",
                )}
                strokeWidth="2px"
                stroke="#aaaaaa"
              />
            </svg>
          )
        })}
        {nodes.map(({ id, label, color }) => {
          return (
            <Draggable
              key={id}
              defaultClassNameDragged=""
              defaultClassNameDragging="group/drag"
              defaultClassName={clsx(
                "absolute",
                transition && "transition-all duration-500 ease-in-out",
              )}
              onStart={() => handleStart(id)}
              position={addPos(nodePos[id]!, basePos)}
              onDrag={(_, { x, y }) => {
                setNodePos((prev) => {
                  return { ...prev, [id]: subPos({ x, y }, basePos) }
                })
              }}
            >
              <div
                className="group/postit"
                style={{
                  width: SIZE.WIDTH,
                  height: SIZE.HEIGHT,
                }}
                {...{
                  ...(focusedPostit === id ? { "data-focus": true } : undefined),
                }}
                onDoubleClick={() => {
                  handleClickNewNode(id)
                }}
              >
                <div
                  className={clsx(
                    "relative grid h-[160px] w-[160px] transform place-items-center overflow-hidden rounded-full bg-orange-400 p-4 font-bold text-black shadow hover:cursor-pointer group-hover/drag:scale-105 group-hover/drag:shadow-2xl",
                    focusedNodeId === id && "ring-4 ring-orange-400 ring-offset-4",
                  )}
                  style={{
                    background: COLORS.find(({ id }) => id === color)?.color ?? "white",
                    // @ts-ignore
                    "--tw-ring-color": COLORS.find(({ id }) => id === color)?.color ?? "white",
                  }}
                >
                  <Textarea id={id} label={label} handleUpdateNode={handleUpdateNode} />
                  {/* <div className="group/bottom absolute inset-x-0 bottom-0 h-[48px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditableNodeId(id)
                      }}
                      className="absolute inset-x-0 bottom-0 grid h-[48px] translate-y-full place-items-center border-t border-orange-500/50 bg-white opacity-0 transition group-hover/bottom:translate-y-0 group-hover/bottom:opacity-100"
                    >
                      <HiPencil />
                    </button>
                  </div> */}
                </div>
                {/* Connectors */}
                <>
                  <button className="absolute -right-12 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-orange-400 opacity-0 shadow group-hover/postit:opacity-100 group-data-[focus=true]/postit:opacity-100" />
                </>
              </div>
            </Draggable>
          )
        })}
      </div>
      <div className="fixed bottom-4 left-4">
        <button
          onClick={() =>
            setBasePos((prev) => ({
              x: prev.x,
              y: prev.y + ARROW_STEP,
            }))
          }
          className="grid h-16 w-16 place-items-center rounded border border-slate-200 bg-white shadow"
        >
          <HiChevronUp size={32} />
        </button>
        <button
          onClick={() =>
            setBasePos((prev) => ({
              x: prev.x - ARROW_STEP,
              y: prev.y,
            }))
          }
          className="grid h-16 w-16 place-items-center rounded border border-slate-200 bg-white shadow"
        >
          <HiChevronRight size={32} />
        </button>
        <button
          onClick={() =>
            setBasePos((prev) => ({
              x: prev.x,
              y: prev.y - ARROW_STEP,
            }))
          }
          className="grid h-16 w-16 place-items-center rounded border border-slate-200 bg-white shadow"
        >
          <HiChevronDown size={32} />
        </button>
        <button
          onClick={() =>
            setBasePos((prev) => ({
              x: prev.x + ARROW_STEP,
              y: prev.y,
            }))
          }
          className="grid h-16 w-16 place-items-center rounded border border-slate-200 bg-white shadow"
        >
          <HiChevronLeft size={32} />
        </button>
        {process.env.NODE_ENV === "development" && (
          <div className={clsx("h-10 w-10", transition && "bg-red-500")} />
        )}
      </div>
    </div>
  )
}
function Textarea({
  id,
  label,
  handleUpdateNode,
}: {
  id: string
  label: string
  handleUpdateNode: (id: string, label: string) => void
}) {
  const [tmp, setTmp] = useState(label)

  useEffect(() => {
    setTmp(label)
  }, [label])

  return (
    <TextareaAutosize
      id={`textarea_${id}`}
      placeholder="新しいノード"
      value={tmp}
      onChange={(e) => setTmp(e.target.value)}
      onBlur={() => handleUpdateNode(id, tmp)}
      onClick={(e) => e.stopPropagation()}
      className="max-w-full resize-none rounded bg-transparent py-2 text-center text-black placeholder:text-black/40 hover:bg-white/10 focus:outline-none"
      maxRows={4}
    />
  )
}

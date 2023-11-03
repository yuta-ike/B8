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
import clientService from "@/lib/ClientService"
import { useSendMessage, useSubscribeChat } from "@/lib/chat"
import { useAddNewNode } from "@/lib/tree"
import {
  CanvasPageProps,
  initNodes,
  initEdges,
  initNodePos,
  Pos,
  addPos,
  invertPos,
  SIZE,
  calcDirPos,
  getPath,
  subPos,
  ARROW_STEP,
} from "./page"

export default function CanvasPage({ params: { roomId } }: CanvasPageProps) {
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
  }, [roomId])

  useEffect(
    () => {
      const listener = throttle(0, (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          setZoom(function (prev) {
            console.log(prev - e.deltaY / 300)
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

  const addNewNode = useAddNewNode()

  const addChild = useCallback(
    (newId: string, nodeId: string) => {
      setNodes((prev) => [...prev, { id: newId, label: "" }])
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
    [addNewNode, nodePos],
  )

  const handleClickNewNode = useCallback(
    (parentId: string) => {
      const newId = addNewNode(parentId)
      addChild(newId, parentId)
    },
    [addChild, addNewNode],
  )

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

  const [comments, setComments] = useState<
    { id: string; text: string; date: Date; isMine: boolean; user: string }[]
  >([])

  const sendMessage = useSendMessage()
  useSubscribeChat((data) => {
    setComments((prev) => [
      {
        id: data.id,
        user: data.user,
        text: data.text,
        date: new Date(),
        isMine: true,
      },
      ...prev,
    ])
  })

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
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        <div className="flex w-[400px] items-center gap-4 rounded-full border-2 border-white bg-white/60 px-4 py-3 text-sm font-bold text-slate-600 shadow backdrop-blur">
          {/* <div className="grow">ハローワールド</div> */}
          <input type="text" value={dummyInput} onChange={(e) => setDummyInput(e.target.value)} />
          <button
            onClick={() => {
              sendMessage(dummyInput)
            }}
          >
            送信
          </button>
          <div className="border-l border-slate-300 pl-4">
            <HiMicrophone />
          </div>
        </div>
        <hr className="my-2 w-full" />
        {comments.map((comment, i) => (
          <div
            key={comment.id}
            className="relative max-w-[400px] rounded-xl border-2 border-white bg-white/60 px-2 py-2 pr-4 text-sm font-bold text-slate-600 shadow backdrop-blur"
            style={{
              width: i === 0 ? 400 : "max-content",
            }}
          >
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-purple-400 text-xs font-bold text-white",
                    comment.isMine && "ring-2 ring-blue-500 ring-offset-2",
                  )}
                >
                  {comment.user[0]}
                </div>

                <div className="flex flex-col">
                  <div>{comment.text}</div>
                  {/* <div className="text-xs font-normal">yuta-ike</div> */}
                </div>
              </div>
              {/* <div className="text-xs text-slate-600/50">{format(new Date(), "HH:mm")}</div> */}
            </div>
          </div>
        ))}
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
        {nodes.map(({ id, label }) => {
          const isEditable = ediableNodeId === id
          console.log(isEditable)
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
                  addChild(id)
                }}
              >
                <div
                  className={clsx(
                    "relative grid h-[160px] w-[160px] transform place-items-center overflow-hidden rounded-full bg-orange-400 p-4 font-bold text-black shadow hover:cursor-pointer group-hover/drag:scale-105 group-hover/drag:shadow-2xl",
                    focusedNodeId === id && "ring-4 ring-orange-400 ring-offset-4",
                  )}
                >
                  <TextareaAutosize
                    id={`textarea_${id}`}
                    placeholder="新しいノード"
                    value={label}
                    onChange={(e) => updateNode(id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-full resize-none rounded bg-transparent py-2 text-center text-black placeholder:text-black/40 hover:bg-white/10 focus:outline-none"
                    maxRows={4}
                  />
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

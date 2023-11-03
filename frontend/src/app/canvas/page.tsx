"use client"

import React, { useCallback, useEffect, useState } from "react"
import Draggable from "react-draggable"
import { graphlib, layout } from "dagre"
import { customAlphabet } from "nanoid"
const genId = customAlphabet("abcdefghijklmnopqrstuvwxyz1234567890", 10)

const SIZE = {
  WIDTH: 160,
  HEIGHT: 160,
}

const HANDLE_DISTANCE = 0

type Dir = "top" | "bottom" | "left" | "right"

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
    id: "1",
    label: "冬でも売れるアイスクリーム",
  },
  {
    id: "2",
    label: "熱い飲み物をかけてたべる",
  },
  {
    id: "3",
    label: "苦い飲み物",
  },
  {
    id: "4",
    label: "コーヒー",
  },
  {
    id: "5",
    label: "青汁",
  },
  {
    id: "6",
    label: "日本茶",
  },
  {
    id: "7",
    label: "温かい場所で提供する",
  },
  {
    id: "8",
    label: "サウナ",
  },
  {
    id: "9",
    label: "温泉や銭湯の風呂上がり",
  },
  {
    id: "10",
    label: "冷たくないアイス",
  },
  {
    id: "11",
    label: "燃える氷的な？",
  },
]
type Pos = { x: number; y: number }
const initNodePos: Record<string, Pos> = {
  "1": { x: 0, y: 0 },
  "2": { x: 0, y: 0 },
  "3": { x: 0, y: 0 },
  "4": { x: 0, y: 0 },
  "5": { x: 0, y: 0 },
  "6": { x: 0, y: 0 },
  "7": { x: 0, y: 0 },
  "8": { x: 0, y: 0 },
  "9": { x: 0, y: 0 },
  "10": { x: 0, y: 0 },
  "11": { x: 0, y: 0 },
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
  {
    from: {
      id: "1",
      handle: "right",
    },
    to: {
      id: "2",
      handle: "left",
    },
  },
  {
    from: {
      id: "2",
      handle: "right",
    },
    to: {
      id: "3",
      handle: "left",
    },
  },
  {
    from: {
      id: "3",
      handle: "right",
    },
    to: {
      id: "4",
      handle: "left",
    },
  },
  {
    from: {
      id: "3",
      handle: "right",
    },
    to: {
      id: "5",
      handle: "left",
    },
  },
  {
    from: {
      id: "3",
      handle: "right",
    },
    to: {
      id: "6",
      handle: "left",
    },
  },
  {
    from: {
      id: "1",
      handle: "left",
    },
    to: {
      id: "7",
      handle: "right",
    },
  },
  {
    from: {
      id: "7",
      handle: "bottom",
    },
    to: {
      id: "8",
      handle: "top",
    },
  },
  {
    from: { id: "7", handle: "bottom" },
    to: { id: "9", handle: "top" },
  },
  {
    from: { id: "1", handle: "left" },
    to: { id: "10", handle: "right" },
  },
  {
    from: { id: "10", handle: "bottom" },
    to: { id: "11", handle: "top" },
  },
]

export default function CanvasPage() {
  const [nodes, setNodes] = useState(initNodes)
  const [edges, setEdges] = useState(initEdges)
  const [nodePos, setNodePos] = useState(initNodePos)

  const [focusedPostit, setFocusedPostit] = useState<string | null>(null)

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

  useEffect(() => {
    const g = new graphlib.Graph()
    g.setGraph({})
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
    console.log(g.edges())
  }, [nodes, edges])

  const addChild = useCallback(
    (nodeId: string) => {
      const newId = genId()
      console.log(newId)
      setNodes((prev) => [...prev, { id: newId, label: "新しいノード" }])
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
    },
    [nodePos],
  )

  return (
    <div
      className="relative h-screen w-screen"
      style={{
        backgroundImage:
          "linear-gradient(0deg, transparent 15px, #dddddd 16px), linear-gradient(90deg,  transparent 15px, #dddddd 16px)",
        backgroundSize: "16px 16px",
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
              d={getPath(fromPos, toPos, from.handle, to.handle)}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              className="pointer-events-auto cursor-pointer transition-all"
            />
            {/* 前景色 */}
            <path
              d={getPath(fromPos, toPos, from.handle, to.handle)}
              fill="none"
              className="pointer-events-none transition-all"
              strokeWidth="2px"
              stroke="#aaaaaa"
            />
          </svg>
        )
      })}
      {nodes.map(({ id, label }) => (
        <Draggable
          key={id}
          defaultClassNameDragged=""
          defaultClassNameDragging="group/drag"
          defaultClassName="absolute transition"
          onStart={() => handleStart(id)}
          position={nodePos[id]}
          onDrag={(_, { x, y }) => {
            setNodePos((prev) => {
              return { ...prev, [id]: { x, y } }
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
            onClick={() => {
              addChild(id)
              addChild(id)
              addChild(id)
            }}
          >
            <div className="grid h-[160px] w-[160px] transform place-items-center rounded-full bg-orange-400 p-4 font-bold text-black shadow transition hover:cursor-pointer group-hover/drag:scale-105 group-hover/drag:shadow-2xl">
              {label}
              <button>add</button>
            </div>
            {/* Connectors */}
            <>
              <button className="absolute -right-12 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-orange-400 opacity-0 shadow group-hover/postit:opacity-100 group-data-[focus=true]/postit:opacity-100" />
            </>
          </div>
        </Draggable>
      ))}
    </div>
  )
}

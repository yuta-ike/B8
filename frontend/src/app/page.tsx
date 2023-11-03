import dynamic from "next/dynamic"

const MainPage = dynamic(() => import("./components/MainPage"), { ssr: false })

export default function Home() {
  return <MainPage />
}

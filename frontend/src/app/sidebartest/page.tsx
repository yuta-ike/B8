import dynamic from "next/dynamic"
import "./style.scss"

const TalkPanel = dynamic(() => import("../components/TalkPanel"), { ssr: false })

const Page = () => {
  return (
    <div className="test__wrapper">
      <div className="test__main">
        <h1>Page</h1>
      </div>
      <div className="test__side">
        <TalkPanel />
      </div>
    </div>
  )
}

export default Page

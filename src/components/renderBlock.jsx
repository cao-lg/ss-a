import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Reveal } from './motion'
import Checkpoint from './Checkpoint'
import Explore from './Explore'
import Challenge from './Challenge'
import Kpi from './Kpi'
import Funnel from './Funnel'
import Flow from './Flow'
import Formula from './Formula'
import Cards from './Cards'
import Compare from './Compare'
import Steps from './Steps'
import Scene from './Scene'
import QuestionView from './QuestionView'
import QChain from './QChain'
import Explain from './Explain'

// 正文逐元素逐步浮现：把每个顶层块级元素各自包成独立 Reveal（滚深才浮现）。
const revealTag = (Tag) =>
  function RevealTag({ node, ...rest }) {
    return (
      <Reveal margin="-18%">
        <Tag {...rest} />
      </Reveal>
    )
  }

const mdComponents = {
  p: revealTag('p'),
  h1: revealTag('h1'),
  h2: revealTag('h2'),
  h3: revealTag('h3'),
  h4: revealTag('h4'),
  h5: revealTag('h5'),
  h6: revealTag('h6'),
  ul: revealTag('ul'),
  ol: revealTag('ol'),
  blockquote: revealTag('blockquote'),
  pre: revealTag('pre'),
  table: revealTag('table'),
  img: revealTag('img'),
  hr: revealTag('hr'),
}

// 统一的「块 → JSX」映射，LearnUnit 与 Question/QChain 的嵌套体共用，避免重复。
// bodyRenderer 参数用于在嵌套体里继续渲染（如 question 体内再含 :::cards）。
export function renderBlockContent(b, unitId, bodyRenderer, extra = {}) {
  if (b.type === 'md') {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={mdComponents}
      >
        {b.content}
      </ReactMarkdown>
    )
  }
  switch (b.kind) {
    case 'checkpoint':
      return <Checkpoint unitId={unitId} {...b.attrs} onResult={extra.onCheckpointResult} />
    case 'explore':
      return <Explore unitId={unitId} {...b.attrs} />
    case 'challenge':
      return <Challenge unitId={unitId} {...b.attrs} onResult={extra.onCheckpointResult} />
    case 'scene':
      return <Scene unitId={unitId} {...b.attrs} />
    case 'kpi':
      return <Kpi unitId={unitId} {...b.attrs} />
    case 'funnel':
      return <Funnel unitId={unitId} {...b.attrs} />
    case 'flow':
      return <Flow unitId={unitId} {...b.attrs} />
    case 'formula':
      return <Formula unitId={unitId} {...b.attrs} />
    case 'cards':
      return <Cards unitId={unitId} {...b.attrs} />
    case 'compare':
      return <Compare unitId={unitId} {...b.attrs} />
    case 'steps':
      return <Steps unitId={unitId} {...b.attrs} />
    case 'qchain':
      return <QChain title={b.attrs.title} body={b.body} unitId={unitId} bodyRenderer={bodyRenderer} />
    case 'question':
      return (
        <QuestionView
          title={b.attrs.title}
          hint={b.attrs.hint}
          body={b.body}
          unitId={unitId}
          bodyRenderer={bodyRenderer}
        />
      )
    case 'q':
      return (
        <QuestionView
          title={b.attrs.title}
          hint={b.attrs.hint}
          body={b.body}
          unitId={unitId}
          bodyRenderer={bodyRenderer}
        />
      )
    case 'reveal':
      return (
        <Explain title={b.attrs.title} onOpen={extra.onRevealOpen}>
          {bodyRenderer(b, unitId, bodyRenderer, extra)}
        </Explain>
      )
    default:
      return null
  }
}

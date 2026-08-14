import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('页面渲染出错：', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="state error-box">
          <h2>页面出错了</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

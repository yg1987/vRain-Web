/**
 * ErrorBoundary — React 错误边界
 *
 * 捕获子组件渲染异常，展示降级 UI，防止白屏。
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 可选的降级 UI 或渲染函数 */
  fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 自定义降级 UI
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return (this.props.fallback as (err: Error) => ReactNode)(this.state.error);
        }
        return this.props.fallback;
      }

      // 默认降级 UI
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          padding: "40px",
          color: "#666",
        }}>
          <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            页面渲染出现异常
          </p>
          <p style={{ fontSize: "13px", color: "#999", marginBottom: "16px", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "8px 20px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

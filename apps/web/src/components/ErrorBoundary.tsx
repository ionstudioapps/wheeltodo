"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#FAF7F2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
          textAlign: "center",
          gap: 16,
        }}
      >
        {/* Wheel icon */}
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="28" fill="#F5F0EB" />
          <path d="M28 28 L28 6 A22 22 0 0 1 47.1 39Z" fill="#EDB590" />
          <path d="M28 28 L47.1 39 A22 22 0 0 1 8.9 39Z" fill="#E59880" />
          <path d="M28 28 L8.9 39 A22 22 0 0 1 28 6Z" fill="#ADA8CC" />
          <circle cx="28" cy="28" r="9" fill="#FAF7F2" />
        </svg>

        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#2A2520", margin: 0 }}>
            Something went sideways
          </p>
          <p style={{ fontSize: 14, color: "#8A7E7A", marginTop: 6, lineHeight: 1.5 }}>
            Your tasks are safe — this is just a display glitch.
          </p>
        </div>

        <button
          onClick={() => this.setState({ error: null })}
          style={{
            marginTop: 4,
            padding: "12px 28px",
            borderRadius: 999,
            background: "#2A2520",
            color: "#FAF7F2",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>

        <details style={{ marginTop: 8, maxWidth: 360, textAlign: "left" }}>
          <summary style={{ fontSize: 12, color: "#B0A8A4", cursor: "pointer" }}>
            Error details
          </summary>
          <pre
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#B0A8A4",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error.message}
          </pre>
        </details>
      </div>
    );
  }
}

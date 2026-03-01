import React from "react";

type Props = {
  name: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error(`[SectionErrorBoundary] "${this.props.name}" crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <p className="text-sm font-medium text-destructive">
            ⚠️ "{this.props.name}" crashed: {this.state.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

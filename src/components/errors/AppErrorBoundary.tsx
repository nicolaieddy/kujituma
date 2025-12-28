import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Persist last error for debugging
    try {
      localStorage.setItem(
        "app:lastError",
        JSON.stringify({
          message,
          stack,
          componentStack: errorInfo.componentStack,
          time: new Date().toISOString(),
          path: window.location.pathname,
        })
      );
    } catch {
      // ignore
    }

    console.error("[AppErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private reload = () => {
    window.location.reload();
  };

  private goToAuth = () => {
    window.location.href = "/auth";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. You can reload, or go back to sign-in.
            </p>
            {this.state.message && (
              <pre className="text-xs bg-muted rounded-md p-3 overflow-auto text-foreground">
                {this.state.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.reload} className="w-full">Reload</Button>
              <Button variant="outline" onClick={this.goToAuth} className="w-full">Go to Sign In</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Debug tip: last error is saved in localStorage under <code>app:lastError</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

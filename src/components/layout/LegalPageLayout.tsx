import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Kujituma</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Last updated: {lastUpdated}
          </p>
          
          <div className="space-y-8 text-foreground/90">
            {children}
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Kujituma. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

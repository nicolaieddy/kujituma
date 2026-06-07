import { Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Network module — Phase 1 shell.
 * Tables (network_contacts, network_interactions, …) are live in Supabase.
 * Phase 2 will port the NetworkOS pages (Contacts, ContactDetail, Calendar,
 * QuickAdd, Tools) under /network/*.
 */
export default function Network() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Network</h1>
          <Badge variant="secondary" className="ml-2">Phase 1</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Module installed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Your Network database is ready. The full UI from NetworkOS — contacts,
            interactions, calendar, quick-add, and tools — is being ported in the
            next phase and will appear under <code>/network/*</code>.
          </p>
          <p>
            Tables live: <code>network_contacts</code>, <code>network_interactions</code>,{" "}
            <code>network_contact_events</code>, <code>network_contact_key_facts</code>,{" "}
            <code>network_contact_resources</code>, <code>network_message_templates</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useCreateContact } from "@/hooks/network/useNetworkData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Link2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkLinkedInImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnrichedContact = {
  url: string;
  full_name: string;
  influence_type: string;
  country: string | null;
  region: string | null;
  sector: string | null;
  notes: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  selected: boolean;
};

type UrlStatus = {
  url: string;
  status: "pending" | "processing" | "success" | "error";
  message?: string;
};

type Step = "input" | "enriching" | "review" | "importing";

const BulkLinkedInImport = ({ open, onOpenChange }: BulkLinkedInImportProps) => {
  const [rawUrls, setRawUrls] = useState("");
  const [urlStatuses, setUrlStatuses] = useState<UrlStatus[]>([]);
  const [enrichedContacts, setEnrichedContacts] = useState<EnrichedContact[]>([]);
  const [step, setStep] = useState<Step>("input");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const createContact = useCreateContact();

  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.includes("linkedin.com/in/"));
  };

  const updateStatus = (index: number, update: Partial<UrlStatus>) => {
    setUrlStatuses((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  const handleEnrich = useCallback(async () => {
    const urls = parseUrls(rawUrls);
    if (urls.length === 0) {
      toast.error("No valid LinkedIn URLs found. Paste URLs containing linkedin.com/in/");
      return;
    }

    const statuses: UrlStatus[] = urls.map((url) => ({ url, status: "pending" }));
    setUrlStatuses(statuses);
    setStep("enriching");
    const results: EnrichedContact[] = [];

    for (let i = 0; i < urls.length; i++) {
      updateStatus(i, { status: "processing" });

      try {
        const { data, error } = await supabase.functions.invoke("enrich-from-linkedin", {
          body: { linkedin_url: urls[i] },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        const d = data.data;
        results.push({
          url: urls[i],
          full_name: d.full_name || "Unknown",
          influence_type: d.influence_type || "Other",
          country: d.country || null,
          region: d.region || null,
          sector: d.sector || null,
          notes: d.notes || null,
          photo_url: d.photo_url || null,
          instagram_url: d.instagram_url || null,
          twitter_url: d.twitter_url || null,
          selected: true,
        });
        updateStatus(i, { status: "success", message: d.full_name || "Enriched" });
      } catch (err: any) {
        updateStatus(i, { status: "error", message: err.message || "Failed" });
      }
    }

    setEnrichedContacts(results);
    if (results.length > 0) {
      setStep("review");
    }
  }, [rawUrls]);

  const toggleContact = (index: number) => {
    setEnrichedContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const removeContact = (index: number) => {
    setEnrichedContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = useCallback(async () => {
    const toImport = enrichedContacts.filter((c) => c.selected);
    if (toImport.length === 0) {
      toast.error("No contacts selected for import.");
      return;
    }

    setStep("importing");
    setImportProgress({ done: 0, total: toImport.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const c = toImport[i];
      try {
        await createContact.mutateAsync({
          labels: [],
          full_name: c.full_name,
          influence_type: c.influence_type,
          country: c.country,
          region: c.region,
          sector: c.sector,
          notes: c.notes,
          linkedin_url: c.url,
          instagram_url: c.instagram_url,
          twitter_url: c.twitter_url,
          email: null,
          whatsapp_number: null,
          photo_url: c.photo_url,
          influence_score: 3,
          relationship_strength: "Cold",
          strategic_importance: 3,
          birthday: null,
          living_location: null,
          first_met_year: null,
          first_met_month: null,
          is_inner_circle: false,
          muted_from_brief: false,
          latitude: null,
          longitude: null,
          last_interaction_date: null,
        });
        successCount++;
      } catch {
        errorCount++;
      }
      setImportProgress({ done: i + 1, total: toImport.length });
    }

    toast.success(`Import complete: ${successCount} added, ${errorCount} failed`);
    handleClose(false);
  }, [enrichedContacts, createContact]);

  const handleClose = (value: boolean) => {
    if (step !== "enriching" && step !== "importing") {
      setRawUrls("");
      setUrlStatuses([]);
      setEnrichedContacts([]);
      setStep("input");
      onOpenChange(value);
    }
  };

  const parsedCount = parseUrls(rawUrls).length;
  const selectedCount = enrichedContacts.filter((c) => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bulk LinkedIn Import
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Input URLs */}
        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste multiple LinkedIn profile URLs (one per line). We'll fetch their info for you to review before importing.
            </p>
            <Textarea
              value={rawUrls}
              onChange={(e) => setRawUrls(e.target.value)}
              placeholder={`https://linkedin.com/in/person-one\nhttps://linkedin.com/in/person-two\nhttps://linkedin.com/in/person-three`}
              rows={6}
            />
            {parsedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {parsedCount} valid LinkedIn URL{parsedCount !== 1 ? "s" : ""} detected
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleEnrich} disabled={parsedCount === 0}>
                Fetch {parsedCount} Profile{parsedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Enriching */}
        {step === "enriching" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Fetching profile data...</p>
            <ScrollArea className="h-[300px] rounded-md border p-3">
              <div className="space-y-2">
                {urlStatuses.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {s.status === "pending" && <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                    {s.status === "processing" && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />}
                    {s.status === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />}
                    {s.status === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs">{s.url}</p>
                      {s.message && (
                        <p className={`text-xs ${s.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                          {s.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the enriched profiles below. Uncheck or remove any you don't want to import.
            </p>
            <ScrollArea className="h-[350px] rounded-md border">
              <div className="divide-y divide-border">
                {enrichedContacts.map((c, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 ${!c.selected ? "opacity-50" : ""}`}>
                    <Checkbox
                      checked={c.selected}
                      onCheckedChange={() => toggleContact(i)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {c.photo_url && (
                          <img src={c.photo_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                        )}
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.influence_type}{c.country ? ` · ${c.country}` : ""}{c.sector ? ` · ${c.sector}` : ""}
                        {c.instagram_url ? " · 📷" : ""}{c.twitter_url ? " · 𝕏" : ""}
                      </p>
                      {c.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeContact(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {enrichedContacts.length} selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={selectedCount === 0}>
                  Confirm Import ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing {importProgress.done} of {importProgress.total}...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkLinkedInImport;

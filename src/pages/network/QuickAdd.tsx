import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ContactForm from "@/components/ContactForm";
import { Loader2, Sparkles } from "lucide-react";

function detectSocialField(url: string): { field: string; value: string } | null {
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return { field: "linkedin_url", value: url };
  if (lower.includes("instagram.com")) return { field: "instagram_url", value: url };
  if (lower.includes("x.com") || lower.includes("twitter.com")) return { field: "twitter_url", value: url };
  return null;
}

const QuickAdd = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [enriching, setEnriching] = useState(false);

  const prefill = useMemo(() => {
    const url = searchParams.get("url");
    if (!url) return {};
    const detected = detectSocialField(url);
    return detected ? { [detected.field]: detected.value } : { linkedin_url: url };
  }, [searchParams]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) navigate("/contacts");
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold">Quick Add Contact</h1>
      {enriching ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Enriching profile data...</p>
            <p className="text-xs text-muted-foreground">Scraping social links and extracting contact info</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-1">Adding from shared link...</p>
      )}
      <ContactForm
        open={open}
        onOpenChange={handleOpenChange}
        prefill={prefill}
        onEnrichingChange={setEnriching}
      />
    </div>
  );
};

export default QuickAdd;

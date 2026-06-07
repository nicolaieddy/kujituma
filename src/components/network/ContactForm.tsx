import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useCreateContact, useUpdateContact, useContacts, type Contact } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAndUpdate } from "@/lib/geocode";
import { Loader2, Sparkles, ChevronDown, ChevronUp, AlertTriangle, Heart, ExternalLink, Compass } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ComboboxField, MultiComboboxField } from "@/components/ComboboxField";
import BirthdayInput from "@/components/BirthdayInput";
import { LocationPicker } from "@/components/LocationPicker";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES, REGIONS } from "@/lib/constants";
import { buildProfileSearchUrl } from "@/lib/socialSearch";

const influenceTypes = ["Regulator", "Lawyer", "Politician", "Founder", "Investor", "Operator", "Media", "Banker", "Family", "Friend", "Spouse", "Best Friend", "Other"];
const relationshipStrengths = ["Cold", "Warm", "Strong", "Trusted"];

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  prefill?: Record<string, string>;
  onEnrichingChange?: (enriching: boolean) => void;
}

const ContactForm = ({ open, onOpenChange, contact, prefill, onEnrichingChange }: ContactFormProps) => {
  const isEdit = !!contact;
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: allContacts = [] } = useContacts();
  const [enriching, setEnriching] = useState(false);
  const [locationEnrichedFrom, setLocationEnrichedFrom] = useState<string | null>(null);
  const autoEnrichTriggered = useRef(false);
  const [showMore, setShowMore] = useState(false);

  const allCountries = useMemo(() => {
    const set = new Set<string>(COUNTRIES);
    allContacts.forEach((c) => {
      if (c.country) c.country.split(",").map((s) => s.trim()).filter(Boolean).forEach((v) => set.add(v));
    });
    return Array.from(set).sort();
  }, [allContacts]);

  const allRegions = useMemo(() => {
    const set = new Set<string>(REGIONS);
    allContacts.forEach((c) => { if (c.region) set.add(c.region); });
    return Array.from(set).sort();
  }, [allContacts]);

  const existingSectors = useMemo(() => {
    const set = new Set(allContacts.map((c) => c.sector).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allContacts]);

  const existingLabels = useMemo(() => {
    const set = new Set(allContacts.flatMap((c) => c.labels || []).filter(Boolean));
    return Array.from(set).sort();
  }, [allContacts]);

  const existingLocations = useMemo(() => {
    return (allContacts.map((c) => c.living_location).filter(Boolean) as string[]);
  }, [allContacts]);


  const parseCountries = (val: string | null | undefined): string[] => {
    if (!val) return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const [form, setForm] = useState({
    full_name: contact?.full_name || prefill?.full_name || "",
    email: contact?.email || prefill?.email || "",
    whatsapp_number: contact?.whatsapp_number || prefill?.whatsapp_number || "",
    linkedin_url: contact?.linkedin_url || prefill?.linkedin_url || "",
    instagram_url: contact?.instagram_url || prefill?.instagram_url || "",
    twitter_url: contact?.twitter_url || prefill?.twitter_url || "",
    influence_type: contact?.influence_type || "Other",
    countries: parseCountries(contact?.country),
    region: contact?.region || "",
    sector: contact?.sector || "",
    influence_score: contact?.influence_score || 3,
    relationship_strength: contact?.relationship_strength || "Cold",
    strategic_importance: contact?.strategic_importance || 3,
    birthday: contact?.birthday || "",
    notes: contact?.notes || "",
    living_location: contact?.living_location || "",
    labels: contact?.labels || [],
    first_met_year: (contact as any)?.first_met_year || "",
    first_met_month: (contact as any)?.first_met_month || "",
    is_inner_circle: (contact as any)?.is_inner_circle || false,
    muted_from_brief: (contact as any)?.muted_from_brief || false,
    photo_url: contact?.photo_url || "",
  });

  const set = (key: string, value: string | number | string[] | boolean) => setForm((f) => ({ ...f, [key]: value }));

  // Duplicate detection — warn before adding someone who already exists
  const duplicateMatch = useMemo(() => {
    if (isEdit) return null;
    const name = form.full_name.trim().toLowerCase();
    const linkedin = form.linkedin_url.trim().toLowerCase();
    if (!name && !linkedin) return null;

    return allContacts.find((c) => {
      if (linkedin && c.linkedin_url && c.linkedin_url.toLowerCase().replace(/\/+$/, "") === linkedin.replace(/\/+$/, "")) return true;
      if (name.length >= 3 && c.full_name.toLowerCase() === name) return true;
      return false;
    }) || null;
  }, [isEdit, form.full_name, form.linkedin_url, allContacts]);

  const handleEnrich = async () => {
    if (!form.linkedin_url && !form.instagram_url && !form.twitter_url) {
      toast.error("Please add at least one social link first");
      return;
    }
    setEnriching(true);
    onEnrichingChange?.(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-from-linkedin", {
        body: {
          linkedin_url: form.linkedin_url || undefined,
          instagram_url: form.instagram_url || undefined,
          twitter_url: form.twitter_url || undefined,
        },
      });
      if (error) {
        let msg = error.message;
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.error) msg = parsed.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const d = data.data;
      const enrichSource = form.linkedin_url ? "LinkedIn" : form.instagram_url ? "Instagram" : "X";
      setForm((f) => ({
        ...f,
        full_name: f.full_name || d.full_name || "",
        influence_type: f.influence_type === "Other" ? (d.influence_type || f.influence_type) : f.influence_type,
        countries: f.countries.length > 0 ? f.countries : (d.country ? parseCountries(d.country) : f.countries),
        region: f.region || d.region || "",
        sector: f.sector || d.sector || "",
        notes: f.notes || d.notes || "",
        living_location: f.living_location || d.living_location || "",
        instagram_url: f.instagram_url || d.instagram_url || "",
        twitter_url: f.twitter_url || d.twitter_url || "",
      }));
      if (d.living_location && !form.living_location) {
        setLocationEnrichedFrom(enrichSource);
      }
      toast.success("Profile data enriched! Review and save.");
    } catch (err: any) {
      toast.error(err.message || "Failed to enrich from social links");
    } finally {
      setEnriching(false);
      onEnrichingChange?.(false);
    }
  };

  useEffect(() => {
    if (open && prefill && !autoEnrichTriggered.current) {
      const hasSocialUrl = prefill.linkedin_url || prefill.instagram_url || prefill.twitter_url;
      if (hasSocialUrl) {
        autoEnrichTriggered.current = true;
        handleEnrich();
      }
    }
  }, [open, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { countries, ...rest } = form;
      const payload = {
        ...rest,
        email: form.email || null,
        whatsapp_number: form.whatsapp_number || null,
        linkedin_url: form.linkedin_url || null,
        instagram_url: form.instagram_url || null,
        twitter_url: form.twitter_url || null,
        country: countries.length > 0 ? countries.join(", ") : null,
        region: form.region || null,
        sector: form.sector || null,
        birthday: form.birthday || null,
        notes: form.notes || null,
        living_location: form.living_location || null,
        photo_url: form.photo_url || contact?.photo_url || null,
        last_interaction_date: contact?.last_interaction_date || null,
        first_met_year: form.first_met_year ? Number(form.first_met_year) : null,
        first_met_month: form.first_met_month ? Number(form.first_met_month) : null,
        is_inner_circle: form.is_inner_circle,
        muted_from_brief: form.muted_from_brief,
      } as any;

      if (isEdit) {
        await updateContact.mutateAsync({ id: contact.id, ...payload });
        toast.success("Contact updated");
        if (payload.living_location && payload.living_location !== contact.living_location) {
          geocodeAndUpdate(contact.id, payload.living_location);
        }
      } else {
        const created = await createContact.mutateAsync(payload);
        toast.success("Contact added");
        if (payload.living_location && created?.id) {
          geocodeAndUpdate(created.id, payload.living_location);
        }
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        {/* Enrichment loading banner inside the dialog */}
        {enriching && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">Enriching profile data...</p>
              <p className="text-xs text-muted-foreground">Scraping social links and extracting contact info. This may take 10-15 seconds.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Name + Social (core identity) */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" autoComplete="off" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required placeholder="e.g. John Smith" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={!form.full_name.trim()} onClick={() => window.open(buildProfileSearchUrl("linkedin.com", form), "_blank")}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search Google for this profile</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="linkedin"
                autoComplete="off"
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={form.linkedin_url ? "border-primary/40 bg-primary/5" : ""}
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="instagram">Instagram</Label>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={!form.full_name.trim()} onClick={() => window.open(buildProfileSearchUrl("instagram.com", form), "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search Google for this profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="instagram" autoComplete="off" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="instagram.com/..." className={form.instagram_url ? "border-primary/40 bg-primary/5" : ""} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="twitter">X</Label>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={!form.full_name.trim()} onClick={() => window.open(buildProfileSearchUrl("x.com", form), "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search Google for this profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="twitter" autoComplete="off" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} placeholder="x.com/..." className={form.twitter_url ? "border-primary/40 bg-primary/5" : ""} />
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEnrich}
              disabled={enriching || (!form.linkedin_url && !form.instagram_url && !form.twitter_url)}
              className="w-full"
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1">{enriching ? "Enriching..." : "Auto-fill from social links"}</span>
            </Button>
          </div>

          <hr className="border-border" />

          {/* Inner Circle toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Heart className={`h-4 w-4 ${form.is_inner_circle ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">Inner Circle</p>
                <p className="text-xs text-muted-foreground">Mark as closest personal contact (spouse, best friend, family)</p>
              </div>
            </div>
            <Switch checked={form.is_inner_circle} onCheckedChange={(v) => set("is_inner_circle", v)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Compass className={`h-4 w-4 ${form.muted_from_brief ? "text-muted-foreground" : "text-muted-foreground/40"}`} />
              <div>
                <p className="text-sm font-medium">Mute from Daily Brief</p>
                <p className="text-xs text-muted-foreground">Won't appear in reach-out suggestions</p>
              </div>
            </div>
            <Switch checked={form.muted_from_brief} onCheckedChange={(v) => set("muted_from_brief", v)} />
          </div>

          {/* Step 2: Key classification */}
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label>Influence Type *</Label>
              <Select value={form.influence_type} onValueChange={(v) => set("influence_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {influenceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={form.relationship_strength} onValueChange={(v) => set("relationship_strength", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relationshipStrengths.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 3: Contact info */}
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="971501234567" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo_url">Photo URL</Label>
            <div className="flex gap-2 items-center">
              {form.photo_url && (
                <img src={form.photo_url} alt="" className="h-9 w-9 rounded-full object-cover border border-border shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              <Input id="photo_url" value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="Paste image URL..." className="flex-1" />
            </div>
          </div>

          {/* Expandable: More details */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
              {showMore ? "Less details" : "More details (country, sector, scores, notes...)"}
            </Button>

            {showMore && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="space-y-2">
                  <Label>Living Location</Label>
                  <LocationPicker
                    value={form.living_location}
                    onChange={(v) => set("living_location", v)}
                    enrichedFrom={locationEnrichedFrom}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Country of Influence</Label>
                  <MultiComboboxField
                    options={allCountries}
                    values={form.countries}
                    onChange={(v) => set("countries", v)}
                    placeholder="Select countries..."
                    allowCreate={false}
                  />
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Region of Influence</Label>
                    <ComboboxField options={allRegions} value={form.region} onChange={(v) => set("region", v)} placeholder="Select region..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <ComboboxField options={existingSectors} value={form.sector} onChange={(v) => set("sector", v)} placeholder="Select sector..." />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Influence Score</Label>
                    <Select value={String(form.influence_score)} onValueChange={(v) => set("influence_score", Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="3">Medium</SelectItem>
                        <SelectItem value="5">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Strategic Importance</Label>
                    <Select value={String(form.strategic_importance)} onValueChange={(v) => set("strategic_importance", Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="3">Medium</SelectItem>
                        <SelectItem value="5">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Birthday</Label>
                  <BirthdayInput value={form.birthday} onChange={(v) => set("birthday", v)} />
                </div>

                <div className="space-y-2">
                  <Label>First Met</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.first_met_month ? String(form.first_met_month) : "none"} onValueChange={(v) => set("first_met_month", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Month (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Month (optional)</SelectItem>
                        {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="Year"
                      value={form.first_met_year}
                      onChange={(e) => set("first_met_year", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Labels</Label>
                  <MultiComboboxField
                    options={existingLabels}
                    values={form.labels}
                    onChange={(v) => set("labels", v)}
                    placeholder="Add labels..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
                </div>
              </div>
            )}
          </div>

          {duplicateMatch && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Possible duplicate:</strong> "{duplicateMatch.full_name}" already exists
                {duplicateMatch.linkedin_url && form.linkedin_url && duplicateMatch.linkedin_url.toLowerCase().replace(/\/+$/, "") === form.linkedin_url.trim().toLowerCase().replace(/\/+$/, "")
                  ? " (matching LinkedIn URL)"
                  : " (matching name)"
                }. You can still add if this is a different person.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
              {isEdit ? "Save" : duplicateMatch ? "Add Anyway" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactForm;

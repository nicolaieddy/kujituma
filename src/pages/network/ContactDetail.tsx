import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContact, useContacts, useInteractions, useDeleteContact, useUpdateContact, useDeleteInteraction, useUpdateInteraction, useContactEvents, useCreateContactEvent, useDeleteContactEvent, useContactKeyFacts, useCreateContactKeyFact, useDeleteContactKeyFact, useContactResources, useCreateContactResource, useDeleteContactResource, Interaction } from "@/hooks/network/useNetworkData";
import { RelationshipBadge, InfluenceScore, TypeBadge } from "@/components/network/ContactBadges";
import InteractionForm from "@/components/network/InteractionForm";
import BirthdayInput from "@/components/network/BirthdayInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxField, MultiComboboxField } from "@/components/network/ComboboxField";
import { LocationPicker } from "@/components/network/LocationPicker";
import { ArrowLeft, Trash2, MessageCircle, Linkedin, Mail, CalendarPlus, Save, Plus, X, Star, Lightbulb, Instagram, Twitter, Check, Heart, Sparkles, Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft, Minus, Scale, Compass, Pencil, Link, Globe } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { buildProfileSearchUrl } from "@/lib/socialSearch";
import { Switch } from "@/components/ui/switch";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { COUNTRIES, REGIONS } from "@/lib/constants";
import { geocodeAndUpdate } from "@/lib/geocode";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Camera } from "lucide-react";

const influenceTypes = ["Regulator", "Lawyer", "Politician", "Founder", "Investor", "Operator", "Media", "Banker", "Family", "Friend", "Spouse", "Best Friend", "Other"];
const relationshipStrengths = ["Cold", "Warm", "Strong", "Trusted"];

const parseCountries = (val: string | null | undefined): string[] => {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
};

const fieldLabels: Record<string, string> = {
  full_name: "Full Name",
  influence_type: "Influence Type",
  countries: "Country of Influence",
  region: "Region",
  sector: "Sector",
  notes: "Notes",
  living_location: "Living Location",
  instagram_url: "Instagram",
  twitter_url: "X",
  photo_url: "Photo",
};

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const { data: allContacts = [] } = useContacts();
  const { data: interactions = [] } = useInteractions(id!);
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();
  const deleteInteraction = useDeleteInteraction();
  const { data: contactEvents = [] } = useContactEvents(id!);
  const createEvent = useCreateContactEvent();
  const deleteEvent = useDeleteContactEvent();
  const { data: keyFacts = [] } = useContactKeyFacts(id!);
  const createKeyFact = useCreateContactKeyFact();
  const deleteKeyFact = useDeleteContactKeyFact();
  const { data: resources = [] } = useContactResources(id!);
  const createResource = useCreateContactResource();
  const deleteResource = useDeleteContactResource();

  const [showInteraction, setShowInteraction] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", is_recurring: false });
  const [newFact, setNewFact] = useState("");
  const [interactionToDelete, setInteractionToDelete] = useState<string | null>(null);
  const [interactionToEdit, setInteractionToEdit] = useState<Interaction | null>(null);
  const [newResource, setNewResource] = useState({ type: "Website", label: "", url: "" });
  const [keyFactToDelete, setKeyFactToDelete] = useState<string | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichOverwriteDialog, setEnrichOverwriteDialog] = useState(false);
  const [enrichedData, setEnrichedData] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({
    influence_type: "",
    relationship_strength: "",
    influence_score: 3,
    strategic_importance: 3,
    countries: [] as string[],
    region: "",
    sector: "",
    birthday: "",
    notes: "",
    labels: [] as string[],
    email: "",
    whatsapp_number: "",
    linkedin_url: "",
    instagram_url: "",
    twitter_url: "",
    living_location: "",
    first_met_year: "" as string | number,
    first_met_month: "" as string | number,
    is_inner_circle: false,
    muted_from_brief: false,
    photo_url: "",
  });

  // Escape key navigates back
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't navigate if a dialog/modal is open
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if ((e.target as HTMLElement)?.closest('[role="dialog"]')) return;
        navigate(-1);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [navigate]);

  // Sync form state when contact loads
  useEffect(() => {
    if (contact) {
      setForm({
        influence_type: contact.influence_type || "Other",
        relationship_strength: contact.relationship_strength || "Cold",
        influence_score: contact.influence_score || 3,
        strategic_importance: contact.strategic_importance || 3,
        countries: parseCountries(contact.country),
        region: contact.region || "",
        sector: contact.sector || "",
        birthday: contact.birthday || "",
        notes: contact.notes || "",
        labels: contact.labels || [],
        email: contact.email || "",
        whatsapp_number: contact.whatsapp_number || "",
        linkedin_url: contact.linkedin_url || "",
        instagram_url: contact.instagram_url || "",
        twitter_url: contact.twitter_url || "",
        living_location: contact.living_location || "",
        first_met_year: (contact as any).first_met_year || "",
        first_met_month: (contact as any).first_met_month || "",
        is_inner_circle: (contact as any).is_inner_circle || false,
        muted_from_brief: (contact as any).muted_from_brief || false,
        photo_url: contact.photo_url || "",
      });
      setDirty(false);
    }
  }, [contact]);

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

  const set = useCallback((key: string, value: string | number | string[] | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaveStatus("idle");
  }, []);

  const doSave = useCallback(async () => {
    if (!contact) return;
    setSaveStatus("saving");
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        influence_type: form.influence_type,
        relationship_strength: form.relationship_strength,
        influence_score: form.influence_score,
        strategic_importance: form.strategic_importance,
        country: form.countries.length > 0 ? form.countries.join(", ") : null,
        region: form.region || null,
        sector: form.sector || null,
        birthday: form.birthday || null,
        notes: form.notes || null,
        labels: form.labels,
        email: form.email || null,
        whatsapp_number: form.whatsapp_number || null,
        linkedin_url: form.linkedin_url || null,
        instagram_url: form.instagram_url || null,
        twitter_url: form.twitter_url || null,
        living_location: form.living_location || null,
        first_met_year: form.first_met_year ? Number(form.first_met_year) : null,
        first_met_month: form.first_met_month ? Number(form.first_met_month) : null,
        is_inner_circle: form.is_inner_circle,
        muted_from_brief: form.muted_from_brief,
        photo_url: form.photo_url || null,
      } as any);
      setDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2000);
      if (form.living_location && form.living_location !== contact.living_location) {
        geocodeAndUpdate(contact.id, form.living_location);
      }
    } catch (err: any) {
      toast.error(err.message);
      setSaveStatus("idle");
    }
  }, [contact, form, updateContact]);

  // Auto-save with debounce
  useEffect(() => {
    if (!dirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      doSave();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dirty, form, doSave]);

  const handleSave = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await doSave();
  }, [doSave]);

  // --- Enrichment ---
  const handleEnrich = async () => {
    if (!form.linkedin_url && !form.instagram_url && !form.twitter_url) {
      toast.error("No social links to enrich from");
      return;
    }
    setEnriching(true);
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
        try { const parsed = JSON.parse(error.message); if (parsed?.error) msg = parsed.error; } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const d = data.data;
      // Calculate which fields would be overwritten
      const overwrites: { field: string; current: string; incoming: string }[] = [];
      const applyMap: Record<string, any> = {};

      const checkField = (key: string, incoming: string | undefined, currentVal: string) => {
        if (!incoming) return;
        if (!currentVal) {
          applyMap[key] = incoming;
        } else if (currentVal !== incoming) {
          overwrites.push({ field: key, current: currentVal, incoming });
          applyMap[key] = incoming;
        }
      };

      checkField("influence_type", d.influence_type, form.influence_type === "Other" ? "" : form.influence_type);
      checkField("living_location", d.living_location, form.living_location);
      checkField("sector", d.sector, form.sector);
      checkField("notes", d.notes, form.notes);
      checkField("region", d.region, form.region);
      checkField("instagram_url", d.instagram_url, form.instagram_url);
      checkField("twitter_url", d.twitter_url, form.twitter_url);

      if (d.country) {
        const incoming = parseCountries(d.country);
        if (form.countries.length === 0) {
          applyMap["countries"] = incoming;
        } else if (JSON.stringify(form.countries.sort()) !== JSON.stringify(incoming.sort())) {
          overwrites.push({ field: "countries", current: form.countries.join(", "), incoming: incoming.join(", ") });
          applyMap["countries"] = incoming;
        }
      }

      if (d.photo_url) {
        if (form.photo_url && form.photo_url !== d.photo_url) {
          overwrites.push({ field: "photo_url", current: "Current photo", incoming: "New photo from profile" });
        }
        applyMap["photo_url"] = d.photo_url;
      }

      if (overwrites.length > 0) {
        setEnrichedData({ applyMap, overwrites });
        setEnrichOverwriteDialog(true);
      } else {
        // No conflicts, apply directly
        applyEnrichedData(applyMap);
        toast.success("Profile enriched!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enrich");
    } finally {
      setEnriching(false);
    }
  };

  const applyEnrichedData = (applyMap: Record<string, any>) => {
    setForm((f) => {
      const updated = { ...f };
      for (const [key, val] of Object.entries(applyMap)) {
        (updated as any)[key] = val;
      }
      return updated;
    });
    setDirty(true);
    setSaveStatus("idle");
  };

  const handleAcceptOverwrites = () => {
    if (enrichedData) {
      applyEnrichedData(enrichedData.applyMap);
      toast.success("Profile enriched with all data!");
    }
    setEnrichOverwriteDialog(false);
    setEnrichedData(null);
  };

  const handleSkipOverwrites = () => {
    if (enrichedData) {
      // Apply only non-conflicting fields
      const safeMap: Record<string, any> = {};
      const overwriteFields = new Set(enrichedData.overwrites.map((o: any) => o.field));
      for (const [key, val] of Object.entries(enrichedData.applyMap)) {
        if (!overwriteFields.has(key)) safeMap[key] = val;
      }
      applyEnrichedData(safeMap);
      toast.success("Enriched (existing data kept)");
    }
    setEnrichOverwriteDialog(false);
    setEnrichedData(null);
  };

  if (isLoading || !contact) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success("Contact deleted");
      navigate("/network/contacts");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const whatsappLink = form.whatsapp_number ? `https://wa.me/${form.whatsapp_number.replace(/[^0-9]/g, "")}` : null;

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt={contact.full_name}
                    className="h-12 w-12 rounded-full object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground ${form.photo_url ? "hidden" : ""}`}>
                  {contact.full_name.charAt(0)}
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Photo URL</p>
              <Input className="h-8" value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="Paste a photo URL from Instagram, LinkedIn, etc." />
            </PopoverContent>
          </Popover>
          <div>
            <h1 className="text-2xl font-bold">{contact.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <TypeBadge type={form.influence_type} />
              <RelationshipBadge strength={form.relationship_strength} />
              <InfluenceScore score={form.influence_score} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={updateContact.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> Save
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowDelete(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {whatsappLink && (
          <Button variant="outline" size="sm" asChild>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        {form.linkedin_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={form.linkedin_url} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-1.5 h-4 w-4" /> LinkedIn
            </a>
          </Button>
        )}
        {form.instagram_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={form.instagram_url} target="_blank" rel="noopener noreferrer">
              <Instagram className="mr-1.5 h-4 w-4" /> Instagram
            </a>
          </Button>
        )}
        {form.twitter_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={form.twitter_url} target="_blank" rel="noopener noreferrer">
              <Twitter className="mr-1.5 h-4 w-4" /> X
            </a>
          </Button>
        )}
        {form.email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${form.email}`}>
              <Mail className="mr-1.5 h-4 w-4" /> Email
            </a>
          </Button>
        )}
        <Button size="sm" onClick={() => setShowInteraction(true)}>
          <CalendarPlus className="mr-1.5 h-4 w-4" /> Log Interaction
        </Button>
      </div>

      {/* --- SECTION: Contact Info --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Info</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <Input className="h-8" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Add email..." />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">WhatsApp</p>
              <Input className="h-8" value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="971501234567" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- SECTION: Social Links + Enrich --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Profiles</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-muted-foreground">LinkedIn</p>
                {!form.linkedin_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4" disabled={!contact?.full_name} onClick={() => window.open(buildProfileSearchUrl("linkedin.com", { full_name: contact?.full_name || "", influence_type: form.influence_type, sector: form.sector, notes: form.notes }), "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search Google for this profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Input className="h-8" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-muted-foreground">Instagram</p>
                {!form.instagram_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4" disabled={!contact?.full_name} onClick={() => window.open(buildProfileSearchUrl("instagram.com", { full_name: contact?.full_name || "", influence_type: form.influence_type, sector: form.sector, notes: form.notes }), "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search Google for this profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Input className="h-8" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/..." />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-muted-foreground">X</p>
                {!form.twitter_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4" disabled={!contact?.full_name} onClick={() => window.open(buildProfileSearchUrl("x.com", { full_name: contact?.full_name || "", influence_type: form.influence_type, sector: form.sector, notes: form.notes }), "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search Google for this profile</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Input className="h-8" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} placeholder="https://x.com/..." />
            </CardContent>
          </Card>
        </div>
        {/* Enrich Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleEnrich}
          disabled={enriching || (!form.linkedin_url && !form.instagram_url && !form.twitter_url)}
          className="w-full"
        >
          {enriching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {enriching ? "Enriching profile..." : "Auto-fill from social links"}
        </Button>
        {enriching && (
          <p className="text-xs text-muted-foreground text-center">Scraping social profiles and extracting data. This may take 10-15 seconds.</p>
        )}
      </section>

      {/* --- SECTION: Resources & Links --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Link className="h-3.5 w-3.5" /> Resources & Links
        </h2>
        {resources.length > 0 && (
          <div className="space-y-2">
            {resources.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Badge variant="secondary" className="shrink-0 text-xs">{r.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
                      {r.label}
                    </a>
                    <p className="text-xs text-muted-foreground truncate">{r.url}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setResourceToDelete(r.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={newResource.type} onValueChange={(v) => setNewResource((r) => ({ ...r, type: v }))}>
                <SelectTrigger className="h-8 w-full sm:w-32 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Podcast", "Website", "Portfolio", "Blog", "Media", "YouTube", "Newsletter", "GitHub", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-8" placeholder="Label" value={newResource.label} onChange={(e) => setNewResource((r) => ({ ...r, label: e.target.value }))} />
              <Input className="h-8" placeholder="https://..." value={newResource.url} onChange={(e) => setNewResource((r) => ({ ...r, url: e.target.value }))} />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 shrink-0"
                disabled={!newResource.label || !newResource.url}
                onClick={() => {
                  createResource.mutate({ contact_id: id!, type: newResource.type, label: newResource.label, url: newResource.url });
                  setNewResource({ type: "Website", label: "", url: "" });
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* --- SECTION: Classification --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classification</h2>

        {/* Inner Circle */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className={`h-4 w-4 ${form.is_inner_circle ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Inner Circle</p>
                  <p className="text-xs text-muted-foreground">Closest personal contact</p>
                </div>
              </div>
              <Switch checked={form.is_inner_circle} onCheckedChange={(v) => set("is_inner_circle", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className={`h-4 w-4 ${form.muted_from_brief ? "text-muted-foreground" : "text-muted-foreground/40"}`} />
                <div>
                  <p className="text-sm font-medium">Mute from Daily Brief</p>
                  <p className="text-xs text-muted-foreground">Won't appear in reach-out suggestions</p>
                </div>
              </div>
              <Switch checked={form.muted_from_brief} onCheckedChange={(v) => set("muted_from_brief", v)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Influence Type</p>
              <Select value={form.influence_type} onValueChange={(v) => set("influence_type", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {influenceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Relationship</p>
              <Select value={form.relationship_strength} onValueChange={(v) => set("relationship_strength", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relationshipStrengths.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Influence Score</p>
              <Select value={String(form.influence_score)} onValueChange={(v) => set("influence_score", Number(v))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                  <SelectItem value="5">High</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Strategic Importance</p>
              <Select value={String(form.strategic_importance)} onValueChange={(v) => set("strategic_importance", Number(v))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                  <SelectItem value="5">High</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Labels */}
        <Card>
          <CardContent className="p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Labels</p>
            <MultiComboboxField
              options={existingLabels}
              values={form.labels}
              onChange={(v) => set("labels", v)}
              placeholder="Add labels..."
            />
          </CardContent>
        </Card>
      </section>

      {/* --- SECTION: Location & Background --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location & Background</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Living Location</p>
              <LocationPicker
                value={form.living_location}
                onChange={(v) => set("living_location", v)}
                onCoordinates={(lat, lng) => {
                  if (contact) {
                    supabase.from("network_contacts").update({ latitude: lat, longitude: lng } as any).eq("id", contact.id);
                  }
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Country of Influence</p>
              <MultiComboboxField
                options={allCountries}
                values={form.countries}
                onChange={(v) => set("countries", v)}
                placeholder="Select countries..."
                allowCreate={false}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Region of Influence</p>
              <ComboboxField
                options={allRegions}
                value={form.region}
                onChange={(v) => set("region", v)}
                placeholder="Select region..."
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Sector</p>
              <ComboboxField
                options={existingSectors}
                value={form.sector}
                onChange={(v) => set("sector", v)}
                placeholder="Select sector..."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- SECTION: Dates & Timeline --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dates & Timeline</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Birthday</p>
              <BirthdayInput value={form.birthday} onChange={(v) => set("birthday", v)} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">First Met</p>
              <div className="flex gap-2">
                <Select value={form.first_met_month ? String(form.first_met_month) : "none"} onValueChange={(v) => set("first_met_month", v === "none" ? "" : v)}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Month (optional)</SelectItem>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="h-8 w-24"
                  min="1900"
                  max={new Date().getFullYear()}
                  placeholder="Year"
                  value={form.first_met_year}
                  onChange={(e) => set("first_met_year", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Last Interaction</p>
              <p className="text-sm font-medium">{contact.last_interaction_date ? format(parseISO(contact.last_interaction_date), "MMM d, yyyy") : "—"}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- SECTION: Notes --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h2>
        <Card>
          <CardContent className="p-3">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Add notes..."
            />
          </CardContent>
        </Card>
      </section>

      {/* --- SECTION: Key Facts --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" /> Key Facts
        </h2>
        <Card>
          <CardContent className="p-3 space-y-2">
            {keyFacts.map((kf) => (
              <div key={kf.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <span className="flex-1 text-sm">{kf.fact}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setKeyFactToDelete(kf.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {keyFacts.length === 0 && (
              <p className="text-sm text-muted-foreground">No key facts yet.</p>
            )}
            <form
              className="flex gap-2 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newFact.trim()) return;
                createKeyFact.mutate({ contact_id: contact.id, fact: newFact.trim() });
                setNewFact("");
              }}
            >
              <Input className="h-8 flex-1" placeholder="e.g. Loves golf, Fan of Arsenal FC..." value={newFact} onChange={(e) => setNewFact(e.target.value)} />
              <Button type="submit" size="sm" variant="outline" disabled={!newFact.trim()}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* --- SECTION: Important Dates --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" /> Important Dates
        </h2>
        <Card>
          <CardContent className="p-3 space-y-2">
            {contactEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <div className="flex-1">
                  <span className="text-sm font-medium">{ev.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{format(parseISO(ev.event_date), "MMM d, yyyy")}</span>
                </div>
                {ev.is_recurring && <Badge variant="secondary" className="text-[10px]">Yearly</Badge>}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setEventToDelete(ev.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {contactEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No important dates yet.</p>
            )}
            <form
              className="flex flex-wrap items-center gap-2 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEvent.title.trim() || !newEvent.event_date) return;
                createEvent.mutate({ contact_id: contact.id, title: newEvent.title.trim(), event_date: newEvent.event_date, is_recurring: newEvent.is_recurring });
                setNewEvent({ title: "", event_date: "", is_recurring: false });
              }}
            >
              <Input className="h-8 w-40" placeholder="Event title..." value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} />
              <Input type="date" className="h-8 w-36" value={newEvent.event_date} onChange={(e) => setNewEvent((p) => ({ ...p, event_date: e.target.value }))} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={newEvent.is_recurring} onCheckedChange={(v) => setNewEvent((p) => ({ ...p, is_recurring: v }))} className="scale-75" />
                Yearly
              </label>
              <Button type="submit" size="sm" variant="outline" disabled={!newEvent.title.trim() || !newEvent.event_date}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* --- SECTION: Reciprocity & Interactions --- */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> Interactions & Reciprocity
        </h2>

        {/* Reciprocity Balance Bar */}
        {(() => {
          const gave = interactions.filter((i) => i.direction === "gave").length;
          const received = interactions.filter((i) => i.direction === "received").length;
          const total = gave + received;
          if (total === 0) return null;
          const gavePercent = Math.round((gave / total) * 100);
          const receivedPercent = 100 - gavePercent;
          const balance = gave - received;
          const balanceLabel = balance > 0 ? `You've given more (+${balance})` : balance < 0 ? `They've given more (${balance})` : "Perfectly balanced";
          return (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <ArrowUpRight className="h-3 w-3" /> I helped ({gave})
                  </span>
                  <span className="text-muted-foreground">{balanceLabel}</span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                    They helped ({received}) <ArrowDownLeft className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {gavePercent > 0 && (
                    <div className="bg-green-500 transition-all" style={{ width: `${gavePercent}%` }} />
                  )}
                  {receivedPercent > 0 && (
                    <div className="bg-blue-500 transition-all" style={{ width: `${receivedPercent}%` }} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
        ) : (
          <div className="space-y-2">
            {interactions.map((i) => (
              <Card key={i.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{i.type}</span>
                        <span className="text-xs text-muted-foreground">{format(parseISO(i.date), "MMM d, yyyy")}</span>
                        {i.direction === "gave" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                            <ArrowUpRight className="h-2.5 w-2.5" /> I helped
                          </span>
                        )}
                        {i.direction === "received" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                            <ArrowDownLeft className="h-2.5 w-2.5" /> They helped
                          </span>
                        )}
                      </div>
                      {i.summary && <div className="prose prose-sm dark:prose-invert mt-1 max-w-none text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: i.summary }} />}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {i.follow_up_date && (
                        <span className="text-xs text-primary">Follow-up: {format(parseISO(i.follow_up_date), "MMM d")}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setInteractionToEdit(i)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setInteractionToDelete(i.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <InteractionForm open={showInteraction} onOpenChange={setShowInteraction} contactId={contact.id} />
      <InteractionForm
        open={!!interactionToEdit}
        onOpenChange={(open) => !open && setInteractionToEdit(null)}
        contactId={contact.id}
        interaction={interactionToEdit}
      />

      {/* Delete Interaction Confirmation */}
      <AlertDialog open={!!interactionToDelete} onOpenChange={(open) => !open && setInteractionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              This interaction will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (interactionToDelete) {
                  deleteInteraction.mutate({ id: interactionToDelete, contactId: contact.id });
                  setInteractionToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contact.full_name} and all their interactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrichment Overwrite Dialog */}
      <Dialog open={enrichOverwriteDialog} onOpenChange={setEnrichOverwriteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Enriched Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The following fields already have data. Do you want to overwrite them?
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {enrichedData?.overwrites.map((o: any) => (
              <div key={o.field} className="rounded-md border border-border p-2.5 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">{fieldLabels[o.field] || o.field}</p>
                <div className="flex items-start gap-2 text-sm">
                  <span className="line-through text-muted-foreground flex-1 break-words">{o.current}</span>
                  <span className="text-primary">→</span>
                  <span className="flex-1 break-words font-medium">{o.incoming}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipOverwrites}>Keep Existing</Button>
            <Button onClick={handleAcceptOverwrites}>Overwrite All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Fact Confirmation */}
      <AlertDialog open={!!keyFactToDelete} onOpenChange={(open) => !open && setKeyFactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Key Fact</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this key fact? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (keyFactToDelete) { deleteKeyFact.mutate({ id: keyFactToDelete, contactId: contact!.id }); setKeyFactToDelete(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={!!resourceToDelete} onOpenChange={(open) => !open && setResourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this resource link? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (resourceToDelete) { deleteResource.mutate({ id: resourceToDelete, contactId: id! }); setResourceToDelete(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Event Confirmation */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this event? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (eventToDelete) { deleteEvent.mutate({ id: eventToDelete, contactId: contact!.id }); setEventToDelete(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactDetail;

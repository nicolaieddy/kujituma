import { useState, useMemo } from "react";
import { useContacts } from "@/hooks/network/useNetworkData";
import { useKujitumaMatches } from "@/hooks/network/useKujitumaMatches";
import { KujitumaBadge } from "@/components/network/KujitumaBadge";
import { Link } from "react-router-dom";
import { RelationshipBadge, InfluenceScore, TypeBadge } from "@/components/network/ContactBadges";
import ContactForm from "@/components/network/ContactForm";
import BulkLinkedInImport from "@/components/network/BulkLinkedInImport";
import ContactsMap from "@/components/network/ContactsMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiComboboxField } from "@/components/network/ComboboxField";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Link2, List, Globe, MessageCircle, Linkedin, CalendarPlus, ArrowUpDown, Heart, ChevronDown } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { ToggleGroupItem as ToggleItem } from "@/components/ui/toggle-group";

const influenceTypes = ["All", "Regulator", "Lawyer", "Politician", "Founder", "Investor", "Operator", "Media", "Banker", "Family", "Friend", "Spouse", "Best Friend", "Other"];
const relationshipStrengths = ["All", "Cold", "Warm", "Strong", "Trusted"];

type SortOption = "name" | "last_interaction" | "influence" | "recent";

const Contacts = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: kujitumaMatches = {} } = useKujitumaMatches();
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [relationshipFilter, setRelationshipFilter] = useState("All");
  const [labelsFilter, setLabelsFilter] = useState<string[]>([]);
  const [innerCircleFilter, setInnerCircleFilter] = useState(false);
  const [view, setView] = useState<string>("list");
  const [sort, setSort] = useState<SortOption>("name");

  const countries = useMemo(() => {
    const set = new Set(contacts.map((c) => c.country).filter(Boolean) as string[]);
    return ["All", ...Array.from(set).sort()];
  }, [contacts]);

  const sectors = useMemo(() => {
    const set = new Set(contacts.map((c) => c.sector).filter(Boolean) as string[]);
    return ["All", ...Array.from(set).sort()];
  }, [contacts]);

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => c.labels?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    let result = contacts.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const searchable = [
          c.full_name, c.influence_type, c.country, c.region, c.sector,
          c.relationship_strength, c.email, c.notes, ...(c.labels || []),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (typeFilter !== "All" && c.influence_type !== typeFilter) return false;
      if (countryFilter !== "All" && c.country !== countryFilter) return false;
      if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
      if (relationshipFilter !== "All" && c.relationship_strength !== relationshipFilter) return false;
      if (labelsFilter.length > 0 && !labelsFilter.some((l) => c.labels?.includes(l))) return false;
      if (innerCircleFilter && !(c as any).is_inner_circle) return false;
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "last_interaction":
          return (b.last_interaction_date || "").localeCompare(a.last_interaction_date || "");
        case "influence":
          return (b.influence_score || 0) - (a.influence_score || 0);
        case "recent":
          return b.created_at.localeCompare(a.created_at);
        default:
          return a.full_name.localeCompare(b.full_name);
      }
    });

    return result;
  }, [contacts, search, typeFilter, countryFilter, sectorFilter, relationshipFilter, labelsFilter, innerCircleFilter, sort]);

  const today = new Date();

  const getLastInteractedLabel = (date: string | null) => {
    if (!date) return "Never contacted";
    const days = differenceInDays(today, parseISO(date));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {contacts.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} size="sm" variant="outline">
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Map view">
              <Globe className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center">
            <Button onClick={() => setShowForm(true)} size="sm" className="rounded-r-none">
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowBulkImport(true)}>
                  <Link2 className="mr-2 h-4 w-4" /> Bulk Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, type, country, sector, label..." className="pl-12 h-12 text-base rounded-xl border-2 border-border focus-visible:ring-primary/20 focus-visible:border-primary/50" autoFocus />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Compact filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 pb-1 scrollbar-none">
        <span className="text-xs font-medium text-muted-foreground mr-1 shrink-0">Filters</span>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="h-8 w-auto gap-1 rounded-full border-border/60 px-3 text-xs shrink-0">
            <ArrowUpDown className="h-3 w-3" />
            <SelectValue>{sort === "name" ? "Name" : sort === "last_interaction" ? "Last Contact" : sort === "influence" ? "Influence" : "Newest"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="last_interaction">Last Contact</SelectItem>
            <SelectItem value="influence">Influence</SelectItem>
            <SelectItem value="recent">Newest</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className={`h-8 w-auto gap-1 rounded-full px-3 text-xs shrink-0 ${typeFilter !== "All" ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60"}`}>
            <SelectValue>{typeFilter === "All" ? "Type" : typeFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {influenceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className={`h-8 w-auto gap-1 rounded-full px-3 text-xs shrink-0 ${countryFilter !== "All" ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60"}`}>
            <SelectValue>{countryFilter === "All" ? "Country" : countryFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className={`h-8 w-auto gap-1 rounded-full px-3 text-xs shrink-0 ${sectorFilter !== "All" ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60"}`}>
            <SelectValue>{sectorFilter === "All" ? "Sector" : sectorFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
          <SelectTrigger className={`h-8 w-auto gap-1 rounded-full px-3 text-xs shrink-0 ${relationshipFilter !== "All" ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60"}`}>
            <SelectValue>{relationshipFilter === "All" ? "Strength" : relationshipFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {relationshipStrengths.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {allLabels.length > 0 && (
          <MultiComboboxField
            options={allLabels}
            values={labelsFilter}
            onChange={setLabelsFilter}
            placeholder="Labels"
            className="shrink-0"
            triggerClassName={`h-8 rounded-full px-3 text-xs ${labelsFilter.length > 0 ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60"}`}
          />
        )}
        <Button
          variant={innerCircleFilter ? "default" : "outline"}
          size="sm"
          className={`h-8 gap-1 rounded-full px-3 text-xs shrink-0 ${innerCircleFilter ? "" : "border-border/60"}`}
          onClick={() => setInnerCircleFilter(!innerCircleFilter)}
        >
          <Heart className={`h-3 w-3 ${innerCircleFilter ? "fill-current" : ""}`} />
          Inner Circle
        </Button>
        {(typeFilter !== "All" || countryFilter !== "All" || sectorFilter !== "All" || relationshipFilter !== "All" || labelsFilter.length > 0 || innerCircleFilter) && (
          <button
            onClick={() => { setTypeFilter("All"); setCountryFilter("All"); setSectorFilter("All"); setRelationshipFilter("All"); setLabelsFilter([]); setInnerCircleFilter(false); }}
            className="text-xs text-muted-foreground hover:text-foreground ml-1 shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* View */}
      {view === "map" ? (
        <ContactsMap contacts={filtered} />
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {contacts.length === 0 ? "No contacts yet. Add your first one!" : "No contacts match your filters."}
            </div>
          ) : (
            filtered.map((c) => {
              const whatsappLink = c.whatsapp_number ? `https://wa.me/${c.whatsapp_number.replace(/[^0-9]/g, "")}` : null;
              const lastLabel = getLastInteractedLabel(c.last_interaction_date);
              const isStale = c.last_interaction_date ? differenceInDays(today, parseISO(c.last_interaction_date)) > 90 : true;
              return (
                <div key={c.id} className="group relative">
                  <Link
                    to={`/network/contacts/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 card-hover"
                  >
                    <div className="flex items-center gap-3">
                      {c.photo_url ? (
                        <img
                          src={c.photo_url}
                          alt={c.full_name}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground ${c.photo_url ? "hidden" : ""}`}>
                        {c.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                          {c.full_name}
                          {(c as any).is_inner_circle && <Heart className="h-3 w-3 fill-primary text-primary" />}
                          {kujitumaMatches[c.id] && <KujitumaBadge match={kujitumaMatches[c.id]} />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.influence_type}{c.country ? ` · ${c.country}` : ""}{c.sector ? ` · ${c.sector}` : ""}
                          <span className={`ml-2 ${isStale ? "text-destructive/70" : ""}`}>· {lastLabel}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Hover quick actions */}
                      <div className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                        {whatsappLink && (
                          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        <RelationshipBadge strength={c.relationship_strength} />
                        <InfluenceScore score={c.influence_score} />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}

      <ContactForm open={showForm} onOpenChange={setShowForm} />
      <BulkLinkedInImport open={showBulkImport} onOpenChange={setShowBulkImport} />
    </div>
  );
};

export default Contacts;

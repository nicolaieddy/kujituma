import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { useNavigate } from "react-router-dom";
import type { Contact } from "@/hooks/network/useNetworkData";
import { countryCoordinates } from "@/lib/countryCoordinates";
import { strengthMapColors } from "@/components/network/ContactBadges";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { geocodeAndUpdate } from "@/lib/geocode";
import { Globe, Plus, Minus } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Neutral map palette
const MAP_COLORS = {
  land: "#e8ecf0",
  landStroke: "#cbd5e1",
  landHover: "#dce3eb",
  ocean: "#f8fafc",
};

interface MarkerGroup {
  key: string;
  coords: [number, number];
  contacts: Contact[];
}

interface ContactsMapProps {
  contacts: Contact[];
}

const ContactsMap = ({ contacts }: ContactsMapProps) => {
  const navigate = useNavigate();
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [20, 10],
    zoom: 1.4,
  });
  const geocodedRef = useRef<Set<string>>(new Set());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Auto-geocode contacts that have living_location but no coordinates
  useEffect(() => {
    for (const c of contacts) {
      if (
        c.living_location &&
        c.latitude == null &&
        c.longitude == null &&
        !geocodedRef.current.has(c.id)
      ) {
        geocodedRef.current.add(c.id);
        geocodeAndUpdate(c.id, c.living_location);
      }
    }
  }, [contacts]);

  // Wheel/pinch zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setPosition((prev) => ({
      ...prev,
      zoom: Math.min(8, Math.max(1, prev.zoom * (1 + delta))),
    }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setPosition((prev) => ({ ...prev, zoom: Math.min(8, prev.zoom * 1.4) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPosition((prev) => ({ ...prev, zoom: Math.max(1, prev.zoom / 1.4) }));
  }, []);

  const markerGroups = useMemo(() => {
    const preciseMarkers: MarkerGroup[] = [];
    const countryBuckets: Record<string, MarkerGroup> = {};

    for (const c of contacts) {
      if (c.latitude != null && c.longitude != null) {
        const roundedKey = `${Math.round(c.latitude * 2) / 2},${Math.round(c.longitude * 2) / 2}`;
        const existing = preciseMarkers.find((m) => m.key === roundedKey);
        if (existing) {
          existing.contacts.push(c);
        } else {
          preciseMarkers.push({
            key: roundedKey,
            coords: [c.longitude, c.latitude],
            contacts: [c],
          });
        }
        continue;
      }

      if (c.country && countryCoordinates[c.country]) {
        if (!countryBuckets[c.country]) {
          countryBuckets[c.country] = {
            key: `country-${c.country}`,
            coords: countryCoordinates[c.country],
            contacts: [],
          };
        }
        countryBuckets[c.country].contacts.push(c);
      }
    }

    return [...preciseMarkers, ...Object.values(countryBuckets)];
  }, [contacts]);

  const totalOnMap = markerGroups.reduce((sum, g) => sum + g.contacts.length, 0);
  const countriesCount = useMemo(() => {
    const set = new Set<string>();
    for (const g of markerGroups) {
      for (const c of g.contacts) {
        if (c.country) set.add(c.country);
      }
    }
    return set.size;
  }, [markerGroups]);
  const strengthBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of markerGroups) {
      for (const c of g.contacts) {
        const s = c.relationship_strength || "Cold";
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    return counts;
  }, [markerGroups]);

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{totalOnMap}</span> on map
        </span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{countriesCount}</span> countries
        </span>
        <span className="h-4 w-px bg-border" />
        {Object.entries(strengthBreakdown).map(([strength, count]) => (
          <span
            key={strength}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: strengthMapColors[strength] || "#94a3b8" }}
            />
            <span className="text-muted-foreground">
              {strength} <span className="font-semibold text-foreground">{count}</span>
            </span>
          </span>
        ))}
        {contacts.length > totalOnMap && (
          <span className="text-muted-foreground text-xs">
            ({contacts.length - totalOnMap} without location)
          </span>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="relative rounded-xl border border-border overflow-hidden shadow-sm"
        style={{
          minHeight: "600px",
          background: MAP_COLORS.ocean,
          boxShadow: "inset 0 2px 12px 0 rgba(0,0,0,0.04)",
        }}
        onWheel={handleWheel}
      >
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 160 }}
          style={{ width: "100%", height: "600px" }}
        >
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            onMoveEnd={({ coordinates, zoom }) => setPosition({ coordinates, zoom })}
            minZoom={1}
            maxZoom={8}
          >
            {/* Drop shadow filter for markers */}
            <defs>
              <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
              </filter>
            </defs>

            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rpiKey}
                    geography={geo}
                    fill={MAP_COLORS.land}
                    stroke={MAP_COLORS.landStroke}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: MAP_COLORS.landHover },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {markerGroups.map((group) => (
              <AvatarMarker key={group.key} group={group} navigate={navigate} zoom={position.zoom} />
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const AvatarMarker = ({
  group,
  navigate,
  zoom,
}: {
  group: MarkerGroup;
  navigate: ReturnType<typeof useNavigate>;
  zoom: number;
}) => {
  const isSingle = group.contacts.length === 1;
  const avatarSize = 36 / zoom;
  const borderWidth = 2.5 / zoom;
  const clipInset = avatarSize * 0.06; // proportional inset instead of fixed px
  const contact = group.contacts[0];
  const color = strengthMapColors[contact.relationship_strength] || "#94a3b8";
  const isTrusted = contact.relationship_strength === "Trusted";

  if (isSingle) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Marker coordinates={group.coords} style={{ cursor: "pointer" }}>
            <g filter="url(#marker-shadow)" style={{ transition: "transform 0.15s ease" }} className="hover-scale-marker">
              {/* Pulse ring for Trusted */}
              {isTrusted && (
                <circle r={avatarSize / 2 + borderWidth + 4 / zoom} fill="none" stroke={color} strokeWidth={1 / zoom} opacity={0.3}>
                  <animate attributeName="r" from={avatarSize / 2 + borderWidth + 2 / zoom} to={avatarSize / 2 + borderWidth + 8 / zoom} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={avatarSize / 2 + borderWidth} fill="none" stroke={color} strokeWidth={borderWidth} opacity={0.8} />
              <circle r={avatarSize / 2} fill="#fff" />
              <clipPath id={`clip-${contact.id}`}>
                <circle r={avatarSize / 2 - clipInset} />
              </clipPath>
              {contact.photo_url ? (
                <image
                  href={contact.photo_url}
                  x={-(avatarSize / 2 - clipInset)}
                  y={-(avatarSize / 2 - clipInset)}
                  width={avatarSize - clipInset * 2}
                  height={avatarSize - clipInset * 2}
                  clipPath={`url(#clip-${contact.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fill: color,
                    fontSize: `${11 / zoom}px`,
                    fontWeight: 700,
                    fontFamily: "system-ui, sans-serif",
                    pointerEvents: "none",
                  }}
                >
                  {getInitials(contact.full_name)}
                </text>
              )}
            </g>
          </Marker>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3" side="top">
          <Link to={`/network/contacts/${contact.id}`} className="flex items-center gap-3 group">
            <Avatar className="h-10 w-10 border-2" style={{ borderColor: color }}>
              {contact.photo_url && <AvatarImage src={contact.photo_url} alt={contact.full_name} />}
              <AvatarFallback className="text-xs font-semibold" style={{ color }}>
                {getInitials(contact.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{contact.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {contact.influence_type}{contact.sector ? ` · ${contact.sector}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {contact.living_location || contact.country || "Unknown"} · {contact.relationship_strength}
              </p>
            </div>
          </Link>
        </PopoverContent>
      </Popover>
    );
  }

  // Multi-contact: show stacked avatars
  const displayContacts = group.contacts.slice(0, 3);
  const remaining = group.contacts.length - displayContacts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Marker coordinates={group.coords} style={{ cursor: "pointer" }}>
          <g filter="url(#marker-shadow)">
            {displayContacts.map((c, i) => {
              const offset = (i - (displayContacts.length - 1) / 2) * (avatarSize * 0.6);
              const cColor = strengthMapColors[c.relationship_strength] || "#94a3b8";
              return (
                <g key={c.id} transform={`translate(${offset}, 0)`}>
                  <circle r={avatarSize / 2 + borderWidth} fill="none" stroke={cColor} strokeWidth={borderWidth} opacity={0.8} />
                  <circle r={avatarSize / 2} fill="#fff" />
                  <clipPath id={`clip-${c.id}`}>
                    <circle r={avatarSize / 2 - clipInset} />
                  </clipPath>
                  {c.photo_url ? (
                    <image
                      href={c.photo_url}
                      x={-(avatarSize / 2 - clipInset)}
                      y={-(avatarSize / 2 - clipInset)}
                      width={avatarSize - clipInset * 2}
                      height={avatarSize - clipInset * 2}
                      clipPath={`url(#clip-${c.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fill: cColor,
                        fontSize: `${9 / zoom}px`,
                        fontWeight: 700,
                        fontFamily: "system-ui, sans-serif",
                        pointerEvents: "none",
                      }}
                    >
                      {getInitials(c.full_name)}
                    </text>
                  )}
                </g>
              );
            })}
            {remaining > 0 && (
              <g transform={`translate(${((displayContacts.length - 1) / 2 + 1) * avatarSize * 0.6}, 0)`}>
                <circle r={avatarSize / 2} fill="hsl(var(--secondary))" />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fill: "#fff",
                    fontSize: `${9 / zoom}px`,
                    fontWeight: 700,
                    fontFamily: "system-ui, sans-serif",
                    pointerEvents: "none",
                  }}
                >
                  +{remaining}
                </text>
              </g>
            )}
          </g>
        </Marker>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" side="top">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {group.contacts[0].living_location || group.contacts[0].country || "Unknown"}
        </p>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {group.contacts.map((c) => {
            const cColor = strengthMapColors[c.relationship_strength] || "#94a3b8";
            return (
              <Link
                key={c.id}
                to={`/network/contacts/${c.id}`}
                className="flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8 border-2 flex-shrink-0" style={{ borderColor: cColor }}>
                  {c.photo_url && <AvatarImage src={c.photo_url} alt={c.full_name} />}
                  <AvatarFallback className="text-[10px] font-semibold" style={{ color: cColor }}>
                    {getInitials(c.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.influence_type}{c.sector ? ` · ${c.sector}` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ContactsMap;

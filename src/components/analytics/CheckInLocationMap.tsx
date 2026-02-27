import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

// Fix default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"];

export const CheckInLocationMap = () => {
  const { checkIns, isLoading } = useAllDailyCheckIns(365);
  const isMobile = useIsMobile();

  const locationCheckIns = useMemo(
    () =>
      checkIns.filter(
        (c) =>
          c.location_lat != null &&
          c.location_lng != null
      ),
    [checkIns]
  );

  if (isLoading || locationCheckIns.length === 0) return null;

  const center: [number, number] = [
    locationCheckIns[0].location_lat!,
    locationCheckIns[0].location_lng!,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Check-in Locations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg overflow-hidden border"
          style={{ height: isMobile ? 250 : 300 }}
        >
          <MapContainer
            center={center}
            zoom={4}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locationCheckIns.map((c) => (
              <Marker
                key={c.id}
                position={[c.location_lat!, c.location_lng!]}
                icon={defaultIcon}
              >
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {format(parseISO(c.check_in_date), "MMM d, yyyy")}
                    </p>
                    {c.mood_rating && (
                      <p>{moodEmojis[c.mood_rating - 1]} Mood</p>
                    )}
                    {c.location_name && (
                      <p className="text-muted-foreground">{c.location_name}</p>
                    )}
                    {c.journal_entry && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.journal_entry}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};

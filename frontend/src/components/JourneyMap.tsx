import { useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { gcInterpolate } from "../lib/geo";
import { useTheme } from "../theme";
import type { Journey } from "../types";

const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

export default function JourneyMap({ journey, selected }: { journey: Journey; selected?: string | null }) {
  const { theme } = useTheme();
  const accent = theme === "dark" ? "#ffd54a" : "#1f8fff";

  const maxLeg = useMemo(() => Math.max(1, ...journey.legs.map((l) => l.count)), [journey.legs]);
  const maxVisit = useMemo(() => Math.max(1, ...journey.airports.map((a) => a.visits)), [journey.airports]);

  const bounds: LatLngBoundsExpression | undefined = journey.airports.length
    ? journey.airports.map((a) => [a.lat, a.lon] as [number, number])
    : undefined;

  if (!journey.airports.length)
    return <div className="journey-map"><div className="map-placeholder">No resolvable flights yet.</div></div>;

  return (
    <div className="journey-map">
      <MapContainer bounds={bounds} boundsOptions={{ padding: [40, 40] }} scrollWheelZoom className="map-box"
        attributionControl={false}>
        <TileLayer key={theme} url={TILES[theme]} />
        {journey.legs.map((l) => {
          const line = gcInterpolate(l.from_lat, l.from_lon, l.to_lat, l.to_lon, 48);
          const isSel = selected === l.from_ident || selected === l.to_ident;
          return (
            <Polyline key={`${l.from_ident}-${l.to_ident}`} positions={line}
              pathOptions={{ color: accent, weight: isSel ? 3.5 : 1 + (l.count / maxLeg) * 2, opacity: isSel ? 1 : 0.35 + (l.count / maxLeg) * 0.45 }} />
          );
        })}
        {journey.airports.map((a) => {
          const isSel = selected === a.ident;
          return (
            <CircleMarker key={a.ident} center={[a.lat, a.lon]}
              radius={isSel ? 7 : 3 + (a.visits / maxVisit) * 4}
              pathOptions={{ color: accent, fillColor: accent, fillOpacity: isSel ? 1 : 0.7, weight: 1 }}>
              <Tooltip direction="top" offset={[0, -4]} className="wp-label">{a.ident} · {a.visits}×</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

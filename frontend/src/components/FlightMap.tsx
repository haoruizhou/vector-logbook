import { useQuery } from "@tanstack/react-query";
import { AttributionControl, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { gcDistanceNm, gcInterpolate } from "../lib/geo";
import { routeIdents } from "../lib/foreflight";
import { useTheme } from "../theme";
import type { Flight } from "../types";

const TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

export default function FlightMap({ flight }: { flight: Flight }) {
  const { theme } = useTheme();
  const idents = routeIdents(flight);
  const accent = theme === "dark" ? "#ffd54a" : "#1f8fff";

  const { data, isLoading } = useQuery({
    queryKey: ["resolve", idents],
    queryFn: () => api.resolve(idents),
    enabled: idents.length > 0,
  });

  if (idents.length < 2)
    return (
      <div className="flight-map">
        <div className="map-placeholder">No origin/destination on this entry.</div>
      </div>
    );
  if (isLoading || !data)
    return (
      <div className="flight-map">
        <div className="map-placeholder">Resolving waypoints…</div>
      </div>
    );

  const pts = idents.map((i) => data[i]).filter((w): w is NonNullable<typeof w> => !!w);
  const missing = idents.filter((i) => !data[i]);

  if (pts.length < 2)
    return (
      <div className="flight-map">
        <div className="map-placeholder">
          Couldn't locate enough waypoints to draw this route
          {missing.length ? ` (missing ${missing.join(", ")})` : ""}.
        </div>
      </div>
    );

  const line: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++)
    line.push(...gcInterpolate(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon, 48));

  const totalNm = pts
    .slice(1)
    .reduce((s, p, i) => s + gcDistanceNm(pts[i].lat, pts[i].lon, p.lat, p.lon), 0);

  const bounds: LatLngBoundsExpression = pts.map((p) => [p.lat, p.lon] as [number, number]);
  const isDirect = !flight.route?.trim();

  return (
    <div className="flight-map">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [38, 38] }}
        scrollWheelZoom
        className="map-box"
        attributionControl={false}
      >
        <AttributionControl
          position="bottomright"
          prefix={'Data: FAA · OpenAIP (CC BY-NC-SA) · open flightmaps'}
        />
        <TileLayer key={theme} url={TILES[theme]} />
        <Polyline
          positions={line}
          pathOptions={{ color: accent, weight: 2, opacity: 0.95, dashArray: isDirect ? undefined : "1 0" }}
        />
        {pts.map((p) => (
          <CircleMarker
            key={p.ident}
            center={[p.lat, p.lon]}
            radius={4}
            pathOptions={{ color: accent, fillColor: accent, fillOpacity: 1, weight: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -4]} className="wp-label">
              {p.ident}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-readout">
        <div>
          <span className="eyebrow">{isDirect ? "Great-circle" : "Route"} distance</span>
          <div className="nm">{totalNm.toFixed(0)} NM</div>
        </div>
        {missing.length > 0 && (
          <div className="unresolved">unresolved: {missing.join(", ")}</div>
        )}
      </div>
    </div>
  );
}

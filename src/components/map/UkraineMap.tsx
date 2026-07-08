"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  lat: number;
  lng: number;
  color: string;
  title: string;
  lines: string[];
  radius?: number;
};

export type MapLine = {
  color: string;
  points: [number, number][];
};

export default function UkraineMap({
  markers,
  polylines = [],
}: {
  markers: MapMarker[];
  polylines?: MapLine[];
}) {
  return (
    <MapContainer
      center={[49.0, 31.4]}
      zoom={6}
      scrollWheelZoom
      style={{ height: "440px", width: "100%", borderRadius: "12px", zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {polylines.map((l, i) => (
        <Polyline
          key={i}
          positions={l.points}
          pathOptions={{ color: l.color, weight: 2.5, dashArray: "6 6", opacity: 0.7 }}
        />
      ))}
      {markers.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.lat, m.lng]}
          radius={m.radius ?? 9}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: m.color,
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div style={{ fontFamily: "inherit", fontSize: 13, minWidth: 180 }}>
              <strong>{m.title}</strong>
              {m.lines.map((line, j) => (
                <div key={j}>{line}</div>
              ))}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

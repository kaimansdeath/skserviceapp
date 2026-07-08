"use client";

import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  lat: number;
  lng: number;
  color: string;
  title: string;
  lines: string[];
  radius?: number;
  /** Номер точки (черговість) — рендериться цифрою на маркері */
  label?: string;
};

export type MapLine = {
  color: string;
  points: [number, number][];
};

function numberIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

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
      {markers.map((m, i) => {
        const popup = (
          <Popup>
            <div style={{ fontFamily: "inherit", fontSize: 13, minWidth: 180 }}>
              <strong>{m.title}</strong>
              {m.lines.map((line, j) => (
                <div key={j}>{line}</div>
              ))}
            </div>
          </Popup>
        );
        return m.label ? (
          <Marker key={i} position={[m.lat, m.lng]} icon={numberIcon(m.color, m.label)}>
            {popup}
          </Marker>
        ) : (
          <CircleMarker
            key={i}
            center={[m.lat, m.lng]}
            radius={m.radius ?? 9}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: m.color, fillOpacity: 0.9 }}
          >
            {popup}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

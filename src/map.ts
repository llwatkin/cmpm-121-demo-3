// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Import type definitions
import { Geobounds, Geopoint } from "./types.ts";

// Wrapper object to encapsulate leaflet functionality
interface MapService {
  initialize(
    parentElement: HTMLElement,
    center: Geopoint,
    zoom: number,
  ): void;
  setView(coord: Geopoint, zoom: number): void;
  addMarker(coord: Geopoint, tooltip: string): void;
  addRect(bounds: Geobounds): void;
  clear(): void;
}

export type Rectangle = leaflet.Rectangle;

export class LeafletMapService implements MapService {
  private map: leaflet.Map | null = null;
  private rects: leaflet.Rectangle[] = [];
  private polyline: leaflet.Polyline | null = null;

  initialize(parentElement: HTMLElement, center: Geopoint, zoom: number) {
    this.map = leaflet.map(parentElement, {
      center: center,
      zoom: zoom,
      minZoom: zoom,
      maxZoom: zoom,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    leaflet
      .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: zoom,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
      .addTo(this.map);
  }

  setView(coord: Geopoint, zoom: number) {
    if (this.map) {
      this.map.setView(coord, zoom);
    }
  }

  addMarker(coord: Geopoint, tooltip: string) {
    const marker = leaflet.marker([coord.lat, coord.lng]);
    if (this.map) {
      marker.addTo(
        this.map,
      )
        .bindTooltip(
          tooltip,
        );
    }
    return marker;
  }

  moveMarker(marker: leaflet.Marker, coord: Geopoint) {
    marker.setLatLng(coord);
  }

  addRect(bounds: Geobounds) {
    const rect = leaflet.rectangle([[
      bounds.startCoord.lat,
      bounds.startCoord.lng,
    ], [
      bounds.endCoord.lat,
      bounds.endCoord.lng,
    ]]);
    if (this.map) {
      rect.addTo(this.map);
      this.rects.push(rect);
    }
    return rect;
  }

  addPolyline(points: Geopoint[]) {
    if (this.map) {
      this.polyline = leaflet.polyline(points).addTo(this.map);
    }
  }

  clear() {
    if (this.map) {
      for (let i = 0; i < this.rects.length; i++) {
        this.rects[i].removeFrom(this.map);
      }
      this.rects = [];
    }
  }

  clearPolyline() {
    if (this.map && this.polyline) {
      this.polyline.removeFrom(this.map);
      this.polyline = null;
    }
  }
}

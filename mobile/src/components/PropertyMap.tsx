import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/lib/theme";
import { formatCompactPrice } from "@/lib/format";
import type { Property } from "@/types";

/**
 * Leaflet inside a WebView rather than a native map module: Leaflet itself needs
 * no API key and no custom dev-client, so the map works in Expo Go. Tile imagery
 * comes from Esri's public endpoints (CARTO's free dark tiles now watermark
 * "API key required" without a paid/registered key). Marker data is pushed in
 * with injectJavaScript so the page itself is only ever built once.
 */

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

export type Basemap = "dark" | "satellite";

export interface PropertyMapHandle {
  /** Centres on the device location. Requires the OS location permission. */
  locate: () => void;
  /** Re-frames the map around all current pins. */
  fitPins: () => void;
  /** Swaps the tile layer behind the pins. */
  setBasemap: (basemap: Basemap) => void;
}

interface Props {
  properties: Property[];
  /** Pin id the map should render as selected. */
  selectedId?: string | null;
  onSelect: (propertyId: string) => void;
  onDeselect: () => void;
  /** Surfaces geolocation failures so the screen can toast them. */
  onLocateError?: (message: string) => void;
}

/** Cairo — a sane opening view before any pin loads. */
const FALLBACK_CENTER = { lat: 30.0444, lng: 31.2357, zoom: 10 };

export const toMapPins = (properties: Property[]): MapPin[] =>
  properties
    .filter(
      (property): property is Property & { latitude: number; longitude: number } =>
        typeof property.latitude === "number" &&
        typeof property.longitude === "number" &&
        Number.isFinite(property.latitude) &&
        Number.isFinite(property.longitude),
    )
    .map((property) => ({
      id: property._id,
      lat: property.latitude,
      lng: property.longitude,
      label: formatCompactPrice(property.priceValue, property.currencyCode, property.priceLabel),
    }));

const buildHtml = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${colors.background}; }
    .leaflet-container { background: ${colors.background}; font-family: -apple-system, Roboto, sans-serif; }
    .leaflet-control-attribution {
      background: rgba(19, 23, 32, 0.75) !important;
      color: ${colors.mutedForeground} !important;
      font-size: 9px;
    }
    .leaflet-control-attribution a { color: ${colors.mutedForeground} !important; }

    /* Price pill with a pointer tail, like Property Finder's map labels. */
    .price-pin { background: none !important; border: none !important; }
    .price-pin .bubble {
      position: relative;
      display: inline-block;
      white-space: nowrap;
      padding: 6px 11px;
      border-radius: 16px;
      background: #0C0F16;
      border: 1.5px solid #FFFFFF;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      transform: translate(-50%, -100%);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }
    .price-pin .bubble::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -7px;
      margin-left: -6px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #FFFFFF;
    }
    .price-pin.is-selected .bubble {
      background: ${colors.gold};
      border-color: ${colors.gold};
      color: ${colors.background};
    }
    .price-pin.is-selected .bubble::after { border-top-color: ${colors.gold}; }

    /* Cluster bubbles. */
    .cluster-pin { background: none !important; border: none !important; }
    .cluster-pin .disc {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${colors.destructive};
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    /* Device-location dot. */
    .user-dot { background: none !important; border: none !important; }
    .user-dot .dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #2F7DF6;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 0 6px rgba(47, 125, 246, 0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    (function () {
      var post = function (payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };

      if (typeof L === "undefined") {
        post({ type: "error", message: "offline" });
        return;
      }

      var map = L.map("map", { zoomControl: false, attributionControl: true })
        .setView([${FALLBACK_CENTER.lat}, ${FALLBACK_CENTER.lng}], ${FALLBACK_CENTER.zoom});

      // Esri public tiles — no API key. CARTO's dark_all now stamps
      // "API KEY REQUIRED" on every tile when the key query param is missing.
      var basemaps = {
        dark: L.layerGroup([
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            { maxZoom: 16, attribution: "Tiles &copy; Esri" }
          ),
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
            { maxZoom: 16 }
          ),
        ]),
        satellite: L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 19, attribution: "Imagery &copy; Esri" }
        ),
      };
      var activeBasemap = "dark";
      basemaps.dark.addTo(map);

      window.setBasemap = function (name) {
        if (!basemaps[name] || name === activeBasemap) return;
        map.removeLayer(basemaps[activeBasemap]);
        basemaps[name].addTo(map);
        // Keep the tiles under the pins after the swap (LayerGroup has no bringToBack).
        if (basemaps[name].eachLayer) {
          basemaps[name].eachLayer(function (layer) { layer.bringToBack(); });
        } else if (basemaps[name].bringToBack) {
          basemaps[name].bringToBack();
        }
        activeBasemap = name;
      };

      var cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 60,
        iconCreateFunction: function (c) {
          return L.divIcon({
            className: "cluster-pin",
            html: '<div class="disc">' + c.getChildCount() + "</div>",
            iconSize: [40, 40],
          });
        },
      });
      map.addLayer(cluster);

      var markers = {};
      var selectedId = null;
      var userMarker = null;

      var iconFor = function (label, isSelected) {
        return L.divIcon({
          className: "price-pin" + (isSelected ? " is-selected" : ""),
          html: '<div class="bubble">' + label + "</div>",
          iconSize: null,
        });
      };

      window.setPins = function (json) {
        var pins = JSON.parse(json);
        cluster.clearLayers();
        markers = {};

        pins.forEach(function (pin) {
          var marker = L.marker([pin.lat, pin.lng], {
            icon: iconFor(pin.label, pin.id === selectedId),
          });
          marker.pinLabel = pin.label;
          marker.on("click", function () {
            post({ type: "select", id: pin.id });
          });
          markers[pin.id] = marker;
          cluster.addLayer(marker);
        });

        post({ type: "ready", count: pins.length });
      };

      window.fitPins = function () {
        var bounds = cluster.getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 90], maxZoom: 15 });
        }
      };

      window.setSelected = function (id) {
        var previous = selectedId;
        selectedId = id || null;

        [previous, selectedId].forEach(function (key) {
          if (key && markers[key]) {
            markers[key].setIcon(iconFor(markers[key].pinLabel, key === selectedId));
          }
        });

        if (selectedId && markers[selectedId]) {
          // zoomToShowLayer expands the cluster the marker is hidden inside.
          cluster.zoomToShowLayer(markers[selectedId], function () {
            map.panTo(markers[selectedId].getLatLng());
          });
        }
      };

      window.locateUser = function () {
        map.locate({ setView: true, maxZoom: 14, enableHighAccuracy: true });
      };

      map.on("locationfound", function (event) {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker(event.latlng, {
          icon: L.divIcon({ className: "user-dot", html: '<div class="dot"></div>', iconSize: [16, 16] }),
          interactive: false,
        }).addTo(map);
      });

      map.on("locationerror", function (event) {
        post({ type: "locate-error", message: event.message || "" });
      });

      map.on("click", function () {
        post({ type: "deselect" });
      });

      post({ type: "loaded" });
    })();
  </script>
</body>
</html>`;

const PropertyMap = forwardRef<PropertyMapHandle, Props>(
  ({ properties, selectedId, onSelect, onDeselect, onLocateError }, ref) => {
    const webViewRef = useRef<WebView>(null);
    // The page reports "loaded" before it can accept pins; queue until then.
    const isLoadedRef = useRef(false);
    const html = useMemo(buildHtml, []);

    const pins = useMemo(() => toMapPins(properties), [properties]);
    const pinsJson = useMemo(() => JSON.stringify(pins), [pins]);

    const run = (script: string) => {
      webViewRef.current?.injectJavaScript(`${script}; true;`);
    };

    useImperativeHandle(ref, () => ({
      locate: () => run("window.locateUser && window.locateUser()"),
      fitPins: () => run("window.fitPins && window.fitPins()"),
      setBasemap: (basemap) => run(`window.setBasemap && window.setBasemap(${JSON.stringify(basemap)})`),
    }));

    useEffect(() => {
      if (!isLoadedRef.current) return;
      run(`window.setPins(${JSON.stringify(pinsJson)}); window.fitPins()`);
    }, [pinsJson]);

    useEffect(() => {
      if (!isLoadedRef.current) return;
      run(`window.setSelected(${JSON.stringify(selectedId ?? null)})`);
    }, [selectedId]);

    const handleMessage = (event: WebViewMessageEvent) => {
      let payload: { type?: string; id?: string; message?: string };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (payload.type) {
        case "loaded":
          isLoadedRef.current = true;
          run(`window.setPins(${JSON.stringify(pinsJson)}); window.fitPins()`);
          break;
        case "select":
          if (payload.id) onSelect(payload.id);
          break;
        case "deselect":
          onDeselect();
          break;
        case "locate-error":
          onLocateError?.(payload.message ?? "");
          break;
        default:
          break;
      }
    };

    return (
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: colors.background }}
        // Leaflet's own gesture handling needs these on both platforms.
        scrollEnabled={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    );
  },
);

PropertyMap.displayName = "PropertyMap";

export default PropertyMap;

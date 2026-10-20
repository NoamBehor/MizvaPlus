declare namespace google.maps {
  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    panTo(latLng: LatLng | LatLngLiteral): void;
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    getZoom(): number | undefined;
    getCenter(): LatLng | undefined;
    fitBounds(bounds: LatLngBounds): void;
  }

  class Marker {
    constructor(options?: MarkerOptions);
    setMap(map: Map | null): void;
    addListener(eventName: string, handler: () => void): MapsEventListener;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLngLiteral): void;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    gestureHandling?: string;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: LatLngLiteral;
    title?: string;
    icon?: string | Symbol | Icon;
    label?: MarkerLabel;
    zIndex?: number;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
  }

  interface Icon {
    path?: string | SymbolPath;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    scale?: number;
    anchor?: Point;
    labelOrigin?: Point;
  }

  enum SymbolPath {
    CIRCLE,
    BACKWARD_CLOSED_ARROW,
    BACKWARD_OPEN_ARROW,
    FORWARD_CLOSED_ARROW,
    FORWARD_OPEN_ARROW,
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface ImportLibraryOptions {
    key: string;
    v?: string;
  }

  function importLibrary(library: 'maps' | 'marker'): Promise<unknown>;
}

interface Window {
  google?: {
    maps: typeof google.maps;
  };
}

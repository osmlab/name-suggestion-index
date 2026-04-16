declare module '@mapbox/geojson-rewind' {
  import type { GeoJSON } from 'geojson';

  /**
   * Enforce winding order for GeoJSON polygons and multipolygons.
   * @param gj - A GeoJSON object (Feature, FeatureCollection, Geometry, or GeometryCollection)
   * @param outer - If true, outer rings will be wound clockwise (RFC 7946 standard)
   * @returns The same GeoJSON object with corrected winding order
   */
  export default function rewind<T extends GeoJSON>(gj: T, outer?: boolean): T;
}


declare module 'which-polygon' {
  export interface WhichPolygonResult {
    id: string;
    [key: string]: unknown;
  }

  export interface WhichPolygonQuery {
    (point: [number, number], multi?: false): WhichPolygonResult | null;
    (point: [number, number], multi: true): WhichPolygonResult[];
    bbox(bbox: [number, number, number, number], multi?: boolean): WhichPolygonResult[];
  }

  // Use a loose type for FeatureCollection to accept both internal GeoJSONObject types
  // and external GeoJSON.FeatureCollection types. The internal types have `geometry?: ...`
  // (optional) while the standard types require `geometry: ... | null`.
  interface FeatureCollectionLike {
    type?: 'FeatureCollection';
    features: unknown[];
  }

  export default function whichPolygon(geojson: FeatureCollectionLike): WhichPolygonQuery;
}

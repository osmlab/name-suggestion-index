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


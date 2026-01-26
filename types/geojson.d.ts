declare module '*.geojson' {
  const value: {
    type: string;
    features: Array<{
      type: string;
      id?: number;
      geometry: {
        type: string;
        coordinates: number[][][] | number[][][][];
      };
      properties: Record<string, any>;
    }>;
  };
  export default value;
}

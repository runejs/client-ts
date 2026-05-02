export default interface TextureProvider {
    getTexels(id: number): Int32Array | null;
    getAverageRgb(id: number): number;
    isOpaque(id: number): boolean;
    isLowMem(id: number): boolean;
}

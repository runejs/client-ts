import { TypedArray1d } from '#/util/Arrays.js';

let cacheMinCount = 0;
let cacheMidCount = 0;
let cacheMaxCount = 0;

let cacheMin = new TypedArray1d<Uint8Array | null>(1000, null);
let cacheMid = new TypedArray1d<Uint8Array | null>(250, null);
let cacheMax = new TypedArray1d<Uint8Array | null>(50, null);

export function alloc(size: number): Uint8Array {
    if (size === 100 && cacheMinCount > 0) {
        const cached = cacheMin[--cacheMinCount]!;
        cacheMin[cacheMinCount] = null;
        return cached;
    } else if (size === 5000 && cacheMidCount > 0) {
        const cached = cacheMid[--cacheMidCount]!;
        cacheMid[cacheMidCount] = null;
        return cached;
    } else if (size === 30000 && cacheMaxCount > 0) {
        const cached = cacheMax[--cacheMaxCount]!;
        cacheMax[cacheMaxCount] = null;
        return cached;
    } else {
        return new Uint8Array(size);
    }
}

export function release(data: Uint8Array) {
    if (data.length === 100 && cacheMinCount < 1000) {
        cacheMin[cacheMinCount++] = data;
    } else if (data.length === 5000 && cacheMinCount < 250) {
        cacheMid[cacheMidCount++] = data;
    } else if (data.length === 30000 && cacheMinCount < 50) {
        cacheMax[cacheMaxCount++] = data;
    }
}

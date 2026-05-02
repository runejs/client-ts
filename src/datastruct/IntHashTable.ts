export default class IntHashTable {
    readonly buckets: Int32Array;

    constructor(src: ArrayLike<number>) {
        let size = 1;
        while (size <= (src.length >> 1) + src.length) {
            size <<= 1;
        }

        this.buckets = new Int32Array(size + size);
        this.buckets.fill(-1);

        for (let i = 0; i < src.length; i++) {
            let slot = src[i] & (size - 1);
            while (this.buckets[slot + slot + 1] !== -1) {
                slot = (slot + 1) & (size - 1);
            }
            this.buckets[slot + slot] = src[i] | 0;
            this.buckets[slot + slot + 1] = i;
        }
    }

    find(key: number): number {
        const mask = this.buckets.length - 2;
        let slot = (key << 1) & mask;

        while (true) {
            const bucketKey = this.buckets[slot];
            if ((key | 0) === bucketKey) {
                return this.buckets[slot + 1];
            }
            if (bucketKey === -1) {
                return -1;
            }
            slot = (slot + 2) & mask;
        }
    }
}

import Linkable from '#/datastruct/Linkable.js';

export default class HashTable<T extends Linkable> {
    readonly bucketCount: number;
    readonly buckets: Linkable[];

    iteratorBucket = 0;
    iteratorCursor: Linkable | null = null;

    searchKey = 0n;
    searchCursor: Linkable | null = null;

    constructor(size: number) {
        this.buckets = new Array(size);
        this.bucketCount = size;

        for (let i: number = 0; i < size; i++) {
            const sentinel = (this.buckets[i] = new Linkable());
            sentinel.next = sentinel;
            sentinel.prev = sentinel;
        }
    }

    find(key: bigint): T | null {
        const start = this.buckets[Number(key & BigInt(this.bucketCount - 1))];

        for (let node = start.next; node !== start; node = node?.next ?? null) {
            if (node && node.key === key) {
                return node as T;
            }
        }

        return null;
    }

    put(node: T, key: bigint): void {
        if (node.prev) {
            node.unlink();
        }

        const sentinel: Linkable = this.buckets[Number(key & BigInt(this.bucketCount - 1))];
        node.prev = sentinel.prev;
        node.next = sentinel;
        if (node.prev) {
            node.prev.next = node;
        }
        node.next.prev = node;
        node.key = key;
    }

    search() {
        this.iteratorBucket = 0;
        return this.findnext();
    }

    findnext() {
        if (this.iteratorBucket > 0 && this.buckets[this.iteratorBucket - 1] !== this.iteratorCursor) {
            const node = this.iteratorCursor!;
            this.iteratorCursor = node.next;
            return node;
        }

        while (this.bucketCount > this.iteratorBucket) {
            const node = this.buckets[this.iteratorBucket++].next!;
            if (this.buckets[this.iteratorBucket - 1] !== node) {
                this.iteratorCursor = node.next;
                return node;
            }
        }

        return null;
    }

    searchnext() {
        if (this.searchCursor === null) {
            return null;
        }

        const node = this.buckets[Number(this.searchKey & BigInt(this.bucketCount - 1))];
        while (this.searchCursor !== node) {
            if (this.searchCursor!.key === this.searchKey) {
                const node2 = this.searchCursor;
                this.searchCursor = this.searchCursor!.next;
                return node2;
            }

            this.searchCursor = this.searchCursor!.next;
        }

        this.searchCursor = null;
        return null;
    }
}

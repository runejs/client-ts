import ClientStream from '#/io/ClientStream.js';
import Packet from '#/io/Packet.js';
import type Js5Loader from '#/js5/Js5Loader.js';

export type Js5NetRequest = {
    archive: number;
    group: number;
    urgent: boolean;
    expectedCrc?: number;
    padding?: number;
};

type QueuedJs5NetRequest = Js5NetRequest & {
    key: number;
    resolve: (data: Uint8Array) => void;
    reject: (error: unknown) => void;
};

export default class Js5Net {
    static crcErrorCount: number = 0;
    static ioErrorCount: number = 0;

    private prefetchQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private pendingUrgentQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private urgentQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private pendingPrefetchQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private requestQueue: QueuedJs5NetRequest[] = [];
    private stream: ClientStream | null = null;
    private lastTickMs: number = performance.now();
    private timeoutMs: number = 0;
    private incomingRequest: QueuedJs5NetRequest | null = null;
    private incomingUrgentRequest: boolean = false;
    private incomingChunkPos: number = 0;
    private incomingGroupBuffer: Packet | null = null;
    private xorKey: number = 0;
    private masterIndexBuffer: Packet | null = null;
    private masterIndexRequested: boolean = false;
    private header: Packet = new Packet(new Uint8Array(8));
    private archives: (Js5Loader | null)[] = new Array(256).fill(null);
    private ingame: boolean = false;

    close(): void {
        this.closeStream();
    }

    closeStream(): void {
        this.stream?.close();
        this.stream = null;
    }

    init(stream: ClientStream, ingame: boolean): void {
        this.closeStream();
        this.stream = stream;
        this.ingame = ingame;
        this.sendLoginLogoutPacket(ingame);

        this.header.pos = 0;
        this.incomingGroupBuffer = null;
        this.incomingChunkPos = 0;
        this.incomingRequest = null;

        for (const request of this.urgentQueue.values()) {
            this.pendingUrgentQueue.set(request.key, request);
        }
        this.urgentQueue.clear();

        for (const request of this.prefetchQueue.values()) {
            this.requestQueue.unshift(request);
            this.pendingPrefetchQueue.set(request.key, request);
        }
        this.prefetchQueue.clear();

        if (this.xorKey !== 0) {
            try {
                const packet = new Packet(new Uint8Array(4));
                packet.p1(4);
                packet.p1(this.xorKey);
                packet.p2(0);
                stream.write(packet.data, 4);
            } catch (_e) {
                this.closeStream();
                Js5Net.ioErrorCount++;
            }
        }

        this.timeoutMs = 0;
        this.lastTickMs = performance.now();
    }

    sendLoginLogoutPacket(ingame: boolean): void {
        this.ingame = ingame;
        if (!this.stream) {
            return;
        }

        try {
            const packet = new Packet(new Uint8Array(4));
            packet.p1(ingame ? 2 : 3);
            packet.p3(0);
            this.stream.write(packet.data, 4);
        } catch (_e) {
            this.closeStream();
            Js5Net.ioErrorCount++;
        }
    }

    request(request: Js5NetRequest): Promise<Uint8Array> {
        return new Promise<Uint8Array>((resolve, reject) => {
            this.queueRequest(request, resolve, reject);
        });
    }

    promote(archive: number, group: number): void {
        const key = Js5Net.key(archive, group);
        const request = this.pendingPrefetchQueue.get(key) ?? this.prefetchQueue.get(key);
        if (!request) {
            return;
        }

        this.pendingPrefetchQueue.delete(key);
        this.prefetchQueue.delete(key);
        this.requestQueue = this.requestQueue.filter((queued) => queued.key !== key);
        request.urgent = true;
        this.pendingUrgentQueue.set(key, request);
    }

    method280(loader: Js5Loader, archive: number): void {
        if (!this.masterIndexBuffer) {
            if (!this.masterIndexRequested) {
                this.masterIndexRequested = true;
                this.queueRequest({ archive: 255, group: 255, urgent: true }, () => {}, () => {
                    this.masterIndexRequested = false;
                    this.masterIndexBuffer = null;
                });
            }
            this.archives[archive] = loader;
            return;
        }

        this.requestIndex(loader, archive);
    }

    urgentQueueSize(): number {
        return this.urgentQueue.size + this.pendingUrgentQueue.size;
    }

    transferProgress(archive: number, group: number): number {
        const key = Js5Net.key(archive, group);
        if (!this.incomingRequest || this.incomingRequest.key !== key || !this.incomingGroupBuffer) {
            return 0;
        }

        return ((this.incomingGroupBuffer.pos * 99) / (this.incomingGroupBuffer.data.length - this.incomingRequest.padding!)) + 1 | 0;
    }

    updateCacheHint(archive: number, group: number): void {
        const key = Js5Net.key(archive, group);
        const request = this.pendingPrefetchQueue.get(key);
        if (!request) {
            return;
        }

        this.requestQueue = this.requestQueue.filter((queued) => queued.key !== key);
        this.requestQueue.unshift(request);
    }

    async loop(): Promise<boolean> {
        const now = performance.now();
        let delta = (now - this.lastTickMs) | 0;
        this.lastTickMs = now;
        if (delta > 200) {
            delta = 200;
        }
        this.timeoutMs += delta;

        if (this.prefetchQueue.size === 0 && this.urgentQueue.size === 0 && this.pendingPrefetchQueue.size === 0 && this.pendingUrgentQueue.size === 0) {
            return true;
        }
        if (!this.stream) {
            return false;
        }

        try {
            if (this.timeoutMs > 30000) {
                throw new Error('JS5 timeout');
            }

            while (this.urgentQueue.size < 20 && this.pendingUrgentQueue.size > 0) {
                const request = this.pendingUrgentQueue.values().next().value as QueuedJs5NetRequest;
                const packet = new Packet(new Uint8Array(4));
                packet.p1(1);
                packet.p3(request.key);
                this.stream.write(packet.data, 4);
                this.pendingUrgentQueue.delete(request.key);
                this.urgentQueue.set(request.key, request);
            }

            while (this.prefetchQueue.size < 20 && this.pendingPrefetchQueue.size > 0) {
                const request = this.nextPrefetchRequest();
                if (!request) {
                    break;
                }

                const packet = new Packet(new Uint8Array(4));
                packet.p1(0);
                packet.p3(request.key);
                this.stream.write(packet.data, 4);
                this.pendingPrefetchQueue.delete(request.key);
                this.prefetchQueue.set(request.key, request);
            }

            for (let i = 0; i < 100; i++) {
                let available = this.stream.available;
                if (available < 0) {
                    throw new Error('JS5 stream closed');
                }
                if (available === 0) {
                    break;
                }

                this.timeoutMs = 0;
                const headerSize = this.incomingRequest === null ? 8 : this.incomingChunkPos === 0 ? 1 : 0;
                if (headerSize <= 0) {
                    if (!this.incomingRequest || !this.incomingGroupBuffer) {
                        throw new Error('Invalid JS5 receive state');
                    }

                    const payloadEnd = this.incomingGroupBuffer.data.length - this.incomingRequest.padding!;
                    let count = 512 - this.incomingChunkPos;
                    if (payloadEnd - this.incomingGroupBuffer.pos < count) {
                        count = payloadEnd - this.incomingGroupBuffer.pos;
                    }
                    if (count > available) {
                        count = available;
                    }

                    await this.stream.readBytes(this.incomingGroupBuffer.data, this.incomingGroupBuffer.pos, count);
                    this.xor(this.incomingGroupBuffer.data, this.incomingGroupBuffer.pos, count);
                    this.incomingGroupBuffer.pos += count;
                    this.incomingChunkPos += count;

                    if (this.incomingGroupBuffer.pos === payloadEnd) {
                        this.finishIncomingRequest(payloadEnd);
                    } else {
                        if (this.incomingChunkPos !== 512) {
                            break;
                        }
                        this.incomingChunkPos = 0;
                    }
                } else {
                    let count = headerSize - this.header.pos;
                    if (count > available) {
                        count = available;
                    }

                    await this.stream.readBytes(this.header.data, this.header.pos, count);
                    this.xor(this.header.data, this.header.pos, count);
                    this.header.pos += count;

                    if (headerSize > this.header.pos) {
                        break;
                    }

                    if (this.incomingRequest === null) {
                        this.readResponseHeader();
                    } else if (this.incomingChunkPos === 0) {
                        if (this.header.data[0] === 0xff) {
                            this.header.pos = 0;
                            this.incomingChunkPos = 1;
                        } else {
                            this.incomingRequest = null;
                        }
                    }
                }
            }

            return true;
        } catch (e) {
            this.closeStream();
            Js5Net.ioErrorCount++;
            this.resetIncomingState();
            return false;
        }
    }

    private queueRequest(request: Js5NetRequest, resolve: (data: Uint8Array) => void, reject: (error: unknown) => void): void {
        const key = Js5Net.key(request.archive, request.group);
        const queued: QueuedJs5NetRequest = {
            ...request,
            key,
            padding: request.padding ?? 0,
            resolve,
            reject
        };

        if (request.urgent) {
            this.pendingUrgentQueue.set(key, queued);
        } else {
            this.requestQueue.push(queued);
            this.pendingPrefetchQueue.set(key, queued);
        }
    }

    private requestIndex(loader: Js5Loader, archive: number): void {
        if (!this.masterIndexBuffer) {
            return;
        }

        this.masterIndexBuffer.pos = archive * 4 + 5;
        void loader.requestIndex(this.masterIndexBuffer.g4());
    }

    private nextPrefetchRequest(): QueuedJs5NetRequest | null {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift()!;
            if (this.pendingPrefetchQueue.get(request.key) === request) {
                return request;
            }
        }

        return null;
    }

    private readResponseHeader(): void {
        this.header.pos = 0;
        const archive = this.header.g1();
        const group = this.header.g2();
        const compression = this.header.g1();
        const packedSize = this.header.g4();
        const key = Js5Net.key(archive, group);

        let request = this.urgentQueue.get(key);
        this.incomingUrgentRequest = true;
        if (!request) {
            request = this.prefetchQueue.get(key);
            this.incomingUrgentRequest = false;
        }
        if (!request) {
            throw new Error(`Unexpected JS5 response ${archive}.${group}`);
        }

        this.incomingRequest = request;
        const js5HeaderSize = compression === 0 ? 5 : 9;
        this.incomingGroupBuffer = new Packet(new Uint8Array(request.padding! + js5HeaderSize + packedSize));
        this.incomingGroupBuffer.p1(compression);
        this.incomingGroupBuffer.p4(packedSize);
        this.incomingChunkPos = 8;
        this.header.pos = 0;
    }

    private finishIncomingRequest(payloadEnd: number): void {
        if (!this.incomingRequest || !this.incomingGroupBuffer) {
            throw new Error('Invalid JS5 completion state');
        }

        const request = this.incomingRequest;
        const data = this.incomingGroupBuffer.data;

        if (request.key === Js5Net.key(255, 255)) {
            this.masterIndexBuffer = this.incomingGroupBuffer;
            this.masterIndexRequested = false;
            for (let archive = 0; archive < this.archives.length; archive++) {
                const loader = this.archives[archive];
                if (loader) {
                    this.masterIndexBuffer.pos = archive * 4 + 5;
                    void loader.requestIndex(this.masterIndexBuffer.g4());
                }
            }
            this.clearIncomingRequest();
            return;
        }

        if (typeof request.expectedCrc === 'number') {
            const crc = Packet.getcrc(data, 0, payloadEnd);
            if (crc !== request.expectedCrc) {
                this.closeStream();
                this.xorKey = ((Math.random() * 255.0) | 0) + 1;
                Js5Net.crcErrorCount++;
                this.resetIncomingState();
                throw new Error('JS5 CRC mismatch');
            }
        }

        Js5Net.ioErrorCount = 0;
        Js5Net.crcErrorCount = 0;
        request.resolve(data);
        this.clearIncomingRequest();
    }

    private clearIncomingRequest(): void {
        if (this.incomingRequest) {
            if (this.incomingUrgentRequest) {
                this.urgentQueue.delete(this.incomingRequest.key);
            } else {
                this.prefetchQueue.delete(this.incomingRequest.key);
            }
        }

        this.incomingRequest = null;
        this.incomingGroupBuffer = null;
        this.incomingChunkPos = 0;
    }

    private resetIncomingState(): void {
        this.incomingRequest = null;
        this.incomingGroupBuffer = null;
        this.incomingChunkPos = 0;
        this.header.pos = 0;
    }

    private xor(data: Uint8Array, off: number, len: number): void {
        if (this.xorKey === 0) {
            return;
        }

        for (let i = 0; i < len; i++) {
            data[off + i] ^= this.xorKey;
        }
    }

    private static key(archive: number, group: number): number {
        return ((archive & 0xff) << 16) | (group & 0xffff);
    }
}

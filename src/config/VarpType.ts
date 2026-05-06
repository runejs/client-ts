import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class VarpType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<VarpType> = new LruCache(64);

    static configClient: Js5 | null = null;

    clientcode: number = 0;

    static init(config: Js5): void {
        this.configClient = config;
        this.numDefinitions = config.getFileIdLimit(16);
    }

    static list(id: number): VarpType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const data = this.configClient.getFile(id, 16);
        const varp = new VarpType();
        if (data) {
            varp.decode(new Packet(data));
        }
        this.recentUse.put(varp, BigInt(id));
        return varp;
    }

    static resetCache(): void {
        this.recentUse.clear();
    }

    decode(dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                break;
            }

            this.decodeInner(dat, code);
        }
    }

    decodeInner(dat: Packet, code: number): void {
        if (code === 5) {
            this.clientcode = dat.g2();
        }
    }
}

import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class VarBitType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<VarBitType> = new LruCache(64);
    static configClient: Js5 | null = null;

    basevar: number = -1;
    startbit: number = 0;
    endbit: number = 0;
    static init(config: Js5): void {
        this.configClient = config;
        this.numDefinitions = config.getFileIdLimit(14);
    }

    static list(id: number): VarBitType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const varbit = new VarBitType();
        const data = this.configClient.getFile(id, 14);
        if (data) {
            varbit.decode(new Packet(data));
        }
        this.recentUse.put(varbit, BigInt(id));
        return varbit;
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

            if (code === 1) {
                this.basevar = dat.g2();
                this.startbit = dat.g1();
                this.endbit = dat.g1();
            }
        }
    }
}

import Model from '#/dash3d/Model.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class IdkType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<IdkType> = new LruCache(64);

    static configClient: Js5 | null = null;
    static models: Js5 | null = null;

    part: number = -1;
    model: Int32Array | null = null;
    recol_s: Int32Array = new Int32Array(6);
    recol_d: Int32Array = new Int32Array(6);
    head: Int32Array = new Int32Array(5).fill(-1);
    disable: boolean = false;

    static init(config: Js5, models: Js5): void {
        this.models = models;
        this.configClient = config;
        this.numDefinitions = config.getFileIdLimit(3);
    }

    static resetCache() {
        this.recentUse.clear();
    }

    static list(id: number): IdkType {
        if (!this.configClient) {
            return new IdkType();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const src = this.configClient.getFile(id, 3);
        const idk = new IdkType();
        if (src) {
            idk.decode(id, new Packet(src));
        }
        this.recentUse.put(idk, BigInt(id));
        return idk;
    }

    decode(id: number, dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                break;
            }

            this.decodeInner(id, dat, code);
        }
    }

    decodeInner(id: number, dat: Packet, code: number) {
        if (code === 1) {
            this.part = dat.g1();
        } else if (code === 2) {
            const count: number = dat.g1();
            this.model = new Int32Array(count);

            for (let i: number = 0; i < count; i++) {
                this.model[i] = dat.g2();
            }
        } else if (code === 3) {
            this.disable = true;
        } else if (code >= 40 && code < 50) {
            this.recol_s[code - 40] = dat.g2();
        } else if (code >= 50 && code < 60) {
            this.recol_d[code - 50] = dat.g2();
        } else if (code >= 60 && code < 70) {
            this.head[code - 60] = dat.g2();
        }
    }

    checkModel(): boolean {
        if (!this.model) {
            return true;
        }

        let ready = true;

        for (let i = 0; i < this.model.length; i++) {
            if (!IdkType.models!.requestDownload(this.model[i], 0)) {
                ready = false;
            }
        }

        return ready;
    }

    getModelNoCheck(): Model | null {
        if (!this.model) {
            return null;
        }

        const models: (Model | null)[] = new TypedArray1d(this.model.length, null);
        for (let i: number = 0; i < this.model.length; i++) {
            models[i] = Model.load(IdkType.models!, this.model[i]);
        }

        let model: Model | null;
        if (models.length === 1) {
            model = models[0];
        } else {
            model = Model.combineForAnim(models, models.length);
        }

        for (let i: number = 0; i < 6 && this.recol_s[i] !== 0; i++) {
            model?.recolour(this.recol_s[i], this.recol_d[i]);
        }

        return model;
    }

    checkHead(): boolean {
        let ready = true;

        for (let i = 0; i < this.head.length; i++) {
            if (this.head[i] != -1 && !IdkType.models!.requestDownload(this.head[i], 0)) {
                ready = false;
            }
        }

        return ready;
    }

    getHeadNoCheck(): Model {
        let count: number = 0;

        const models: (Model | null)[] = new TypedArray1d(5, null);
        for (let i: number = 0; i < 5; i++) {
            if (this.head[i] !== -1) {
                models[count++] = Model.load(IdkType.models!, this.head[i]);
            }
        }

        const model: Model = Model.combineForAnim(models, count);
        for (let i: number = 0; i < 6 && this.recol_s[i] !== 0; i++) {
            model.recolour(this.recol_s[i], this.recol_d[i]);
        }

        return model;
    }
}

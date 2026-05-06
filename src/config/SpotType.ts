import SeqType from '#/config/SeqType.js';

import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Model from '#/dash3d/Model.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class SpotType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<SpotType> = new LruCache(64);

    static configClient: Js5 | null = null;
    static models: Js5 | null = null;

    static modelCache: LruCache<Model> = new LruCache(30);

    id: number = 0;

    model: number = 0;
    anim: number = -1;
    recol_s: Uint16Array = new Uint16Array(6);
    recol_d: Uint16Array = new Uint16Array(6);
    resizeh: number = 128;
    resizev: number = 128;
    angle: number = 0;
    ambient: number = 0;
    contrast: number = 0;

    static init(models: Js5, config: Js5): void {
        this.models = models;
        this.configClient = config;
        this.numDefinitions = config.getFileIdLimit(13);
    }

    static list(id: number): SpotType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const data = this.configClient.getFile(id, 13);
        const spot = new SpotType();
        spot.id = id;
        if (data) {
            spot.decode(new Packet(data));
        }
        this.recentUse.put(spot, BigInt(id));
        return spot;
    }

    static resetCache(): void {
        this.recentUse.clear();
        this.modelCache.clear();
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
        if (code === 1) {
            this.model = dat.g2();
        } else if (code === 2) {
            this.anim = dat.g2();
        } else if (code === 4) {
            this.resizeh = dat.g2();
        } else if (code === 5) {
            this.resizev = dat.g2();
        } else if (code === 6) {
            this.angle = dat.g2();
        } else if (code === 7) {
            this.ambient = dat.g1();
        } else if (code === 8) {
            this.contrast = dat.g1();
        } else if (code >= 40 && code < 50) {
            this.recol_s[code - 40] = dat.g2();
        } else if (code >= 50 && code < 60) {
            this.recol_d[code - 50] = dat.g2();
        }
    }

    getTempModel2(frame: number = -1): Model | null {
        let model = SpotType.modelCache.find(BigInt(this.id));
        if (!model) {
            model = Model.load(SpotType.models!, this.model);
            if (!model) {
                return null;
            }

            for (let i: number = 0; i < 6; i++) {
                if (this.recol_s[0] !== 0) {
                    model.recolour(this.recol_s[i], this.recol_d[i]);
                }
            }

            model.prepareAnim();
            model.calculateNormals(this.ambient + 64, this.contrast + 850, -30, -50, -30, true);
            SpotType.modelCache.put(model, BigInt(this.id));
        }

        let animated: Model;
        if (this.anim === -1 || frame === -1) {
            animated = Model.copyForAnim(model, true, true, false);
        } else {
            animated = SeqType.list(this.anim).animateModel2(model, frame);
        }

        if (this.resizeh !== 128 || this.resizev !== 128) {
            animated.resize(this.resizeh, this.resizev, this.resizeh);
        }

        if (this.angle !== 0) {
            if (this.angle === 90) {
                animated.rotate90();
            }
            if (this.angle === 180) {
                animated.rotate90();
                animated.rotate90();
            }
            if (this.angle === 270) {
                animated.rotate90();
                animated.rotate90();
                animated.rotate90();
            }
        }

        return animated;
    }
}

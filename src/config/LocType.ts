import LruCache from '#/datastruct/LruCache.js';
import Linkable2 from '#/datastruct/Linkable2.js';

import SeqType from '#/config/SeqType.js';
import { LocShape } from '#/dash3d/LocShape.js';
import { LocAngle } from '#/dash3d/LocAngle.js';

import Model from '#/dash3d/Model.js';

import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';
import VarCache from '#/var/VarCache.js';
import type Js5 from '#/js5/Js5.js';

export default class LocType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<LocType> = new LruCache(64);
    static mc1: LruCache<Model> = new LruCache(500);
    static mc2: LruCache<Model> = new LruCache(10);
    static mc3: LruCache<Model> = new LruCache(30);
    static temp: Model[] = new Array(4);
    static models: Js5 | null = null;
    static configClient: Js5 | null = null;
    static lowMem: boolean = false;

    id: number = -1;

    model: Int32Array | null = null;
    shape: Int32Array | null = null;
    name: string | null = null;
    recol_s: Uint16Array | null = null;
    recol_d: Uint16Array | null = null;
    width: number = 1;
    length: number = 1;
    blockwalk: boolean = true;
    blockrange: boolean = true;
    active: number = -1;
    hillskew: boolean = false;
    sharelight: boolean = false;
    occlude: boolean = false;
    anim: number = -1;
    wallwidth: number = 16;
    ambient: number = 0;
    contrast: number = 0;
    op: (string | null)[] | null = null;
    mapfunction: number = -1;
    mapscene: number = -1;
    mirror: boolean = false;
    shadow: boolean = true;
    resizex: number = 128;
    resizey: number = 128;
    resizez: number = 128;
    offsetx: number = 0;
    offsety: number = 0;
    offsetz: number = 0;
    forceapproach: number = 0;
    forcedecor: boolean = false;
    breakroutefinding: boolean = false;
    raiseobject: number = 0;
    multiloc: Int32Array | null = null;
    multivarp: number = -1;
    multivarbit: number = -1;
    bgsound_sound: number = -1;
    bgsound_range: number = 0;
    bgsound_mindelay: number = 0;
    bgsound_maxdelay: number = 0;
    bgsound_random: Int32Array | null = null;

    static init(models: Js5, lowMem: boolean, config: Js5): void {
        this.models = models;
        this.configClient = config;
        this.lowMem = lowMem;
        this.numDefinitions = config.getFileIdLimit(6);
        this.recentUse.clear();
    }

    static list(id: number): LocType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const loc = new LocType();
        loc.id = id;
        loc.reset();
        const data = this.configClient.getFile(id, 6);
        if (data) {
            loc.decode(new Packet(data));
        }
        loc.postDecode();
        this.recentUse.put(loc, BigInt(id));

        return loc;
    }

    static resetCache(): void {
        this.recentUse.clear();
        this.mc1.clear();
        this.mc2.clear();
        this.mc3.clear();
    }

    private reset(): void {
        this.model = null;
        this.shape = null;
        this.name = null;
        this.recol_s = null;
        this.recol_d = null;
        this.width = 1;
        this.length = 1;
        this.blockwalk = true;
        this.blockrange = true;
        this.active = -1;
        this.hillskew = false;
        this.sharelight = false;
        this.occlude = false;
        this.anim = -1;
        this.wallwidth = 16;
        this.ambient = 0;
        this.contrast = 0;
        this.op = null;
        this.mapfunction = -1;
        this.mapscene = -1;
        this.mirror = false;
        this.shadow = true;
        this.resizex = 128;
        this.resizey = 128;
        this.resizez = 128;
        this.forceapproach = 0;
        this.offsetx = 0;
        this.offsety = 0;
        this.offsetz = 0;
        this.forcedecor = false;
        this.breakroutefinding = false;
        this.raiseobject = -1;
        this.multiloc = null;
        this.multivarp = -1;
        this.multivarbit = -1;
        this.bgsound_sound = -1;
        this.bgsound_range = 0;
        this.bgsound_mindelay = 0;
        this.bgsound_maxdelay = 0;
        this.bgsound_random = null;
    }

    private postDecode(): void {
        if (this.active === -1) {
            this.active = 0;
            if (this.model && (!this.shape || this.shape[0] === LocShape.CENTREPIECE_STRAIGHT)) {
                this.active = 1;
            }

            if (this.op) {
                for (let i = 0; i < this.op.length; i++) {
                    if (this.op[i] !== null) {
                        this.active = 1;
                        break;
                    }
                }
            }
        }

        if (this.breakroutefinding) {
            this.blockwalk = false;
            this.blockrange = false;
        }

        if (this.raiseobject === -1) {
            this.raiseobject = this.blockwalk ? 1 : 0;
        }
    }

    decode(dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                return;
            }

            if (code === 1) {
                const count = dat.g1();
                if (count > 0) {
                    if (!this.model || LocType.lowMem) {
                        this.shape = new Int32Array(count);
                        this.model = new Int32Array(count);
                        for (let i = 0; i < count; i++) {
                            this.model[i] = dat.g2();
                            this.shape[i] = dat.g1();
                        }
                    } else {
                        dat.pos += count * 3;
                    }
                }
            } else if (code === 2) {
                this.name = dat.gjstr();
            } else if (code === 5) {
                const count = dat.g1();
                if (count > 0) {
                    if (!this.model || LocType.lowMem) {
                        this.shape = null;
                        this.model = new Int32Array(count);
                        for (let i = 0; i < count; i++) {
                            this.model[i] = dat.g2();
                        }
                    } else {
                        dat.pos += count * 2;
                    }
                }
            } else if (code === 14) {
                this.width = dat.g1();
            } else if (code === 15) {
                this.length = dat.g1();
            } else if (code === 17) {
                this.blockwalk = false;
            } else if (code === 18) {
                this.blockrange = false;
            } else if (code === 19) {
                this.active = dat.g1();
            } else if (code === 21) {
                this.hillskew = true;
            } else if (code === 22) {
                this.sharelight = true;
            } else if (code === 23) {
                this.occlude = true;
            } else if (code === 24) {
                this.anim = dat.g2();
                if (this.anim === 65535) {
                    this.anim = -1;
                }
            } else if (code === 28) {
                this.wallwidth = dat.g1();
            } else if (code === 29) {
                this.ambient = dat.g1b();
            } else if (code === 39) {
                this.contrast = dat.g1b() * 5;
            } else if (code >= 30 && code < 35) {
                if (!this.op) {
                    this.op = new TypedArray1d(5, null);
                }
                this.op[code - 30] = dat.gjstr();
                if (this.op[code - 30]?.toLowerCase() === 'hidden') {
                    this.op[code - 30] = null;
                }
            } else if (code === 40) {
                const count = dat.g1();
                this.recol_s = new Uint16Array(count);
                this.recol_d = new Uint16Array(count);
                for (let i = 0; i < count; i++) {
                    this.recol_s[i] = dat.g2();
                    this.recol_d[i] = dat.g2();
                }
            } else if (code === 60) {
                this.mapfunction = dat.g2();
            } else if (code === 62) {
                this.mirror = true;
            } else if (code === 64) {
                this.shadow = false;
            } else if (code === 65) {
                this.resizex = dat.g2();
            } else if (code === 66) {
                this.resizey = dat.g2();
            } else if (code === 67) {
                this.resizez = dat.g2();
            } else if (code === 68) {
                this.mapscene = dat.g2();
            } else if (code === 69) {
                this.forceapproach = dat.g1();
            } else if (code === 70) {
                this.offsetx = dat.g2b();
            } else if (code === 71) {
                this.offsety = dat.g2b();
            } else if (code === 72) {
                this.offsetz = dat.g2b();
            } else if (code === 73) {
                this.forcedecor = true;
            } else if (code === 74) {
                this.breakroutefinding = true;
            } else if (code === 75) {
                this.raiseobject = dat.g1();
            } else if (code === 77) {
                this.multivarbit = dat.g2();
                if (this.multivarbit === 65535) {
                    this.multivarbit = -1;
                }
                this.multivarp = dat.g2();
                if (this.multivarp === 65535) {
                    this.multivarp = -1;
                }
                const count = dat.g1();
                this.multiloc = new Int32Array(count + 1);
                for (let i = 0; i <= count; i++) {
                    this.multiloc[i] = dat.g2();
                    if (this.multiloc[i] === 65535) {
                        this.multiloc[i] = -1;
                    }
                }
            } else if (code === 78) {
                this.bgsound_sound = dat.g2();
                this.bgsound_range = dat.g1();
            } else if (code === 79) {
                this.bgsound_mindelay = dat.g2();
                this.bgsound_maxdelay = dat.g2();
                this.bgsound_range = dat.g1();
                const count = dat.g1();
                this.bgsound_random = new Int32Array(count);
                for (let i = 0; i < count; i++) {
                    this.bgsound_random[i] = dat.g2();
                }
            }
        }
    }

    checkModel(shape: number): boolean {
        if (this.model === null) {
            return true;
        }

        if (this.shape !== null) {
            for (let i = 0; i < this.shape.length; i++) {
                if (this.shape[i] === shape) {
                    return LocType.models!.requestDownload(this.model[i] & 0xFFFF, 0);
                }
            }
            return true;
        } else if (shape === LocShape.CENTREPIECE_STRAIGHT) {
            let ready = true;
            for (let i = 0; i < this.model.length; i++) {
                const model = this.model[i];
                if (!LocType.models!.requestDownload(model & 0xFFFF, 0)) {
                    ready = false;
                }
            }
            return ready;
        }

        return true;
    }

    hasBgSound(): boolean {
        if (this.multiloc === null) {
            return this.bgsound_sound !== -1 || this.bgsound_random !== null;
        }

        for (let i = 0; i < this.multiloc.length; i++) {
            if (this.multiloc[i] !== -1) {
                const loc = LocType.list(this.multiloc[i]);
                if (loc.bgsound_sound !== -1 || loc.bgsound_random !== null) {
                    return true;
                }
            }
        }

        return false;
    }

    checkModelAll(): boolean {
        if (this.model == null) {
            return true;
        }

        let ready = true;
        for (let i = 0; i < this.model.length; i++) {
            const model = this.model[i];
            if (!LocType.models!.requestDownload(model & 0xFFFF, 0)) {
                ready = false;
            }
        }
        return ready;
    }

    getModel(shape: number, angle: number, heightSW: number, heightSE: number, heightNE: number, heightNW: number, _transformId: number): Model | null {
        let typecode: bigint;
        if (this.shape === null) {
            typecode = (BigInt(this.id) << 10n) + BigInt(angle);
        } else {
            typecode = (BigInt(this.id) << 10n) + (BigInt(shape) << 3n) + BigInt(angle);
        }

        let modified = LocType.mc2.find(typecode);
        if (!modified) {
            modified = this.buildModel(!this.sharelight, false, angle, shape);
            if (!modified) {
                return null;
            }
            LocType.mc2.put(modified, typecode);
        }

        if (this.hillskew || this.sharelight) {
            modified = Model.hillSkewCopy(modified, this.hillskew, this.sharelight);
        }

        if (this.hillskew) {
            const groundY: number = ((heightSW + heightSE + heightNE + heightNW) / 4) | 0;

            for (let i: number = 0; i < modified.numPoints; i++) {
                const x: number = modified.pointX![i];
                const z: number = modified.pointZ![i];

                const heightS: number = heightSW + ((((heightSE - heightSW) * (x + 64)) / 128) | 0);
                const heightN: number = heightNW + ((((heightNE - heightNW) * (x + 64)) / 128) | 0);
                const y: number = heightS + ((((heightN - heightS) * (z + 64)) / 128) | 0);

                modified.pointY![i] += y - groundY;
            }
        }

        return modified;
    }

    getAnimatedModel(shape: number, angle: number, frame: number, heightSW: number, heightSE: number, heightNE: number, heightNW: number, seq: SeqType | null): Model | null {
        let typecode: bigint;
        if (this.shape === null) {
            typecode = (BigInt(this.id) << 10n) + BigInt(angle);
        } else {
            typecode = (BigInt(this.id) << 10n) + (BigInt(shape) << 3n) + BigInt(angle);
        }

        let base = LocType.mc3.find(typecode);
        if (!base) {
            base = this.buildModel(true, true, angle, shape);
            if (!base) {
                return null;
            }
            LocType.mc3.put(base, typecode);
        }

        if (seq === null && !this.hillskew) {
            return base;
        }

        let modified: Model;
        if (seq === null) {
            modified = Model.copyForAnim(base, true, true, false);
        } else {
            modified = seq.animateModel90(frame, base, angle);
        }

        if (this.hillskew) {
            const groundY: number = ((heightSW + heightSE + heightNE + heightNW) / 4) | 0;

            for (let i: number = 0; i < modified.numPoints; i++) {
                const x: number = modified.pointX![i];
                const z: number = modified.pointZ![i];

                const heightS: number = heightSW + ((((heightSE - heightSW) * (x + 64)) / 128) | 0);
                const heightN: number = heightNW + ((((heightNE - heightNW) * (x + 64)) / 128) | 0);
                const y: number = heightS + ((((heightN - heightS) * (z + 64)) / 128) | 0);

                modified.pointY![i] += y - groundY;
            }
        }

        return modified;
    }

    buildModel(doNotShareLight: boolean, prepareAnim: boolean, angle: number, shape: number): Model | null {
        let model: Model | null = null;

        if (this.shape === null) {
            if (shape !== LocShape.CENTREPIECE_STRAIGHT) {
                return null;
            }

            if (!this.model) {
                return null;
            }

            const flip: boolean = angle > 3 !== this.mirror;
            const modelCount: number = this.model.length;

            for (let i = 0; i < modelCount; i++) {
                let modelId = this.model[i];
                if (flip) {
                    modelId += 65536;
                }

                model = LocType.mc1.find(BigInt(modelId));
                if (!model) {
                    model = Model.load(LocType.models!, modelId & 0xffff);
                    if (!model) {
                        return null;
                    }

                    if (flip) {
                        model.mirror();
                    }

                    LocType.mc1.put(model, BigInt(modelId));
                }

                if (modelCount > 1) {
                    LocType.temp[i] = model;
                }
            }

            if (modelCount > 1) {
                model = Model.combineForAnim(LocType.temp, modelCount);
            }
        } else {
            let index: number = -1;
            for (let i: number = 0; i < this.shape.length; i++) {
                if (this.shape[i] === shape) {
                    index = i;
                    break;
                }
            }
            if (index === -1) {
                return null;
            }

            if (!this.model || index >= this.model.length) {
                return null;
            }

            let modelId: number = this.model[index];
            if (modelId === -1) {
                return null;
            }

            const flip: boolean = this.mirror !== angle > 3;
            if (flip) {
                modelId += 65536;
            }

            model = LocType.mc1.find(BigInt(modelId));
            if (!model) {
                model = Model.load(LocType.models!, modelId & 0xffff);
                if (!model) {
                    return null;
                }

                if (flip) {
                    model.mirror();
                }

                LocType.mc1.put(model, BigInt(modelId));
            }
        }

        if (!model) {
            return null;
        }

        const scaled: boolean = this.resizex !== 128 || this.resizey !== 128 || this.resizez !== 128;
        const translated: boolean = this.offsetx !== 0 || this.offsety !== 0 || this.offsetz !== 0;

        const modified: Model = Model.copyForAnim(model, !this.recol_s, true, angle === LocAngle.WEST && !scaled && !translated);
        const rotation: number = angle & 0x3;
        if (rotation === 1) {
            modified.rotate90();
        } else if (rotation === 2) {
            modified.rotate180();
        } else if (rotation === 3) {
            modified.rotate270();
        }

        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                modified.recolour(this.recol_s[i], this.recol_d[i]);
            }
        }

        if (scaled) {
            modified.resize(this.resizex, this.resizey, this.resizez);
        }

        if (translated) {
            modified.translate(this.offsetx, this.offsety, this.offsetz);
        }

        if (prepareAnim) {
            modified.prepareAnim();
        }

        modified.calculateNormals(this.ambient + 64, 768 + this.contrast * 5, -50, -10, -50, doNotShareLight);
        return modified;
    }

    getMultiLoc(): LocType | null {
        if (!this.multiloc) {
            return null;
        }

        let index = -1;
        if (this.multivarbit !== -1) {
            index = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            index = VarCache.var[this.multivarp];
        }

        if (index < 0 || index >= this.multiloc.length || this.multiloc[index] === -1) {
            return null;
        }

        return LocType.list(this.multiloc[index]);
    }
}

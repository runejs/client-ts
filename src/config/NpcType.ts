import LruCache from '#/datastruct/LruCache.js';
import Linkable2 from '#/datastruct/Linkable2.js';

import SeqType from '#/config/SeqType.js';
import Model from '#/dash3d/Model.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import { TypedArray1d } from '#/util/Arrays.js';
import VarCache from '#/var/VarCache.js';

export default class NpcType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<NpcType> = new LruCache(64);

    static configClient: Js5 | null = null;
    static models: Js5 | null = null;

    static modelCache: LruCache<Model> = new LruCache(50);

    id: number = -1;

    name: string = 'null';
    size: number = 1;
    model: Uint16Array | null = null;
    head: Uint16Array | null = null;
    readyanim: number = -1;
    walkanim: number = -1;
    walkanim_b: number = -1;
    walkanim_r: number = -1;
    walkanim_l: number = -1;
    turnleftanim: number = -1;
    turnrightanim: number = -1;
    recol_s: Uint16Array | null = null;
    recol_d: Uint16Array | null = null;
    op: (string | null)[] | null = null;
    active: boolean = true;
    minimap: boolean = true;
    vislevel: number = -1;
    resizeh: number = 128;
    resizev: number = 128;
    alwaysontop: boolean = false;
    ambient: number = 0;
    contrast: number = 0;
    headicon: number = -1;
    turnspeed: number = 32;
    multivarbit: number = -1;
    multivarp: number = -1;
    multinpc: Int32Array | null = null;

    static init(models: Js5, config: Js5): void {
        this.models = models;
        this.configClient = config;
        this.numDefinitions = config.getFileIdLimit(9);
        this.recentUse.clear();
    }

    static list(id: number): NpcType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const data = this.configClient.getFile(id, 9);
        const npc = new NpcType();
        npc.id = id;
        if (data) {
            npc.decode(new Packet(data));
        }
        this.recentUse.put(npc, BigInt(id));
        return npc;
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
            const count: number = dat.g1();
            this.model = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.model[i] = dat.g2();
            }
        } else if (code === 2) {
            this.name = dat.gjstr();
        } else if (code === 12) {
            this.size = dat.g1();
        } else if (code === 13) {
            this.readyanim = dat.g2();
        } else if (code === 14) {
            this.walkanim = dat.g2();
        } else if (code === 15) {
            this.turnleftanim = dat.g2();
        } else if (code === 16) {
            this.turnrightanim = dat.g2();
        } else if (code === 17) {
            this.walkanim = dat.g2();
            this.walkanim_b = dat.g2();
            this.walkanim_r = dat.g2();
            this.walkanim_l = dat.g2();
        } else if (code >= 30 && code < 40) {
            if (!this.op) {
                this.op = new TypedArray1d(5, null);
            }

            this.op[code - 30] = dat.gjstr();
            if (this.op[code - 30]?.toLowerCase() === 'hidden') {
                this.op[code - 30] = null;
            }
        } else if (code === 40) {
            const count: number = dat.g1();
            this.recol_s = new Uint16Array(count);
            this.recol_d = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.recol_s[i] = dat.g2();
                this.recol_d[i] = dat.g2();
            }
        } else if (code === 60) {
            const count: number = dat.g1();
            this.head = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.head[i] = dat.g2();
            }
        } else if (code === 93) {
            this.minimap = false;
        } else if (code === 95) {
            this.vislevel = dat.g2();
        } else if (code === 97) {
            this.resizeh = dat.g2();
        } else if (code === 98) {
            this.resizev = dat.g2();
        } else if (code === 99) {
            this.alwaysontop = true;
        } else if (code === 100) {
            this.ambient = dat.g1b();
        } else if (code === 101) {
            this.contrast = dat.g1b() * 5;
        } else if (code === 102) {
            this.headicon = dat.g2();
        } else if (code === 103) {
            this.turnspeed = dat.g2();
        } else if (code === 106) {
            this.multivarbit = dat.g2();
            if (this.multivarbit === 65535) {
                this.multivarbit = -1;
            }

            this.multivarp = dat.g2();
            if (this.multivarp === 65535) {
                this.multivarp = -1;
            }

            const count = dat.g1();
            this.multinpc = new Int32Array(count + 1);
            for (let i = 0; i <= count; i++) {
                this.multinpc[i] = dat.g2();
                if (this.multinpc[i] === 65535) {
                    this.multinpc[i] = -1;
                }
            }
        } else if (code === 107) {
            this.active = false;
        }
    }

    getTempModel(primary: SeqType | null, secondary: SeqType | null, secondaryFrame: number, primaryFrame: number): Model | null {
        if (this.multinpc) {
            const npc = this.getMultiNpc();
            return npc ? npc.getTempModel(primary, secondary, secondaryFrame, primaryFrame) : null;
        }

        let model = NpcType.modelCache.find(BigInt(this.id));

        if (!model && this.model) {
            let ready = false;
            for (let i = 0; i < this.model.length; i++) {
                if (!NpcType.models!.requestDownload(this.model[i], 0)) {
                    ready = true;
                }
            }
            if (ready) {
                return null;
            }

            const models: (Model | null)[] = new TypedArray1d(this.model.length, null);
            for (let i: number = 0; i < this.model.length; i++) {
                models[i] = Model.load(NpcType.models!, this.model[i]);
            }

            if (models.length === 1) {
                model = models[0];
            } else {
                model = Model.combineForAnim(models, models.length);
            }

            if (model) {
                if (this.recol_s && this.recol_d) {
                    for (let i: number = 0; i < this.recol_s.length; i++) {
                        model.recolour(this.recol_s[i], this.recol_d[i]);
                    }
                }

                model.prepareAnim();
                model.calculateNormals(this.ambient + 64, this.contrast + 850, -30, -50, -30, true);
                NpcType.modelCache.put(model, BigInt(this.id));
            }
        }

        if (!model) {
            return null;
        }

        let tmp: Model;
        if (primary !== null && secondary !== null) {
            tmp = primary.splitAnimateModel(model, secondary, primaryFrame, secondaryFrame);
        } else if (primary !== null) {
            tmp = primary.animateModel(primaryFrame, model);
        } else if (secondary === null) {
            tmp = Model.copyForAnim(model, true, true, false);
        } else {
            tmp = secondary.animateModel(secondaryFrame, model);
        }

        if (this.resizeh !== 128 || this.resizev !== 128) {
            tmp.resize(this.resizeh, this.resizev, this.resizeh);
        }

        return tmp;
    }

    getHead(): Model | null {
        if (this.multinpc) {
            const npc = this.getMultiNpc();
            return npc ? npc.getHead() : null;
        }

        if (!this.head) {
            return null;
        }

        let exists = false;
        for (let i = 0; i < this.head.length; i++) {
            if (!NpcType.models!.requestDownload(this.head[i], 0)) {
                exists = true;
            }
        }
        if (exists) {
            return null;
        }

        const models: (Model | null)[] = new TypedArray1d(this.head.length, null);
        for (let i: number = 0; i < this.head.length; i++) {
            models[i] = Model.load(NpcType.models!, this.head[i]);
        }

        let model: Model | null;
        if (models.length === 1) {
            model = models[0];
        } else {
            model = Model.combineForAnim(models, models.length);
        }

        if (model && this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model.recolour(this.recol_s[i], this.recol_d[i]);
            }
        }

        return model;
    }

    isMultiNpcVisible(): boolean {
        if (!this.multinpc) {
            return true;
        }

        let index = -1;
        if (this.multivarbit !== -1) {
            index = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            index = VarCache.var[this.multivarp];
        }

        return index >= 0 && index < this.multinpc.length && this.multinpc[index] !== -1;
    }

    getMultiNpc(): NpcType | null {
        if (!this.multinpc) {
            return null;
        }

        let index = -1;
        if (this.multivarbit !== -1) {
            index = VarCache.getVarbit(this.multivarbit);
        } else if (this.multivarp !== -1) {
            index = VarCache.var[this.multivarp];
        }

        if (index < 0 || index >= this.multinpc.length || this.multinpc[index] === -1) {
            return null;
        }

        return NpcType.list(this.multinpc[index]);
    }
}

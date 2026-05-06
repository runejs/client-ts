import AnimFrameSet from '#/dash3d/AnimFrameSet.js';
import Model from '#/dash3d/Model.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export const enum PreanimMove {
    DELAYMOVE = 0,
    DELAYANIM = 1,
    MERGE = 2
}

export const enum PostanimMove {
    DELAYMOVE = 0,
    ABORTANIM = 1,
    MERGE = 2
}

export const enum RestartMode {
    RESET = 1,
    RESETLOOP = 2
}

export default class SeqType extends Linkable2 {
    static numDefinitions: number = 0;
    static recentUse: LruCache<SeqType> = new LruCache(64);

    static configClient: Js5 | null = null;
    static bases: Js5 | null = null;
    static anims: Js5 | null = null;

    static framesetCache: Map<number, AnimFrameSet> = new Map();

    numFrames: number = 0;
    frames: Int32Array | null = null;
    iframes: Int32Array | null = null;
    delay: Int32Array | null = null;
    loops: number = -1;
    walkmerge: Int32Array | null = null;
    reachforward: boolean = false;
    priority: number = 5;
    replaceheldleft: number = -1;
    replaceheldright: number = -1;
    maxloops: number = 99;
    preanim_move: number = -1;
    postanim_move: number = -1;
    duplicatebehaviour: number = 2;

    static init(bases: Js5, config: Js5, anims: Js5): void {
        this.bases = bases;
        this.anims = anims;
        this.configClient = config;
        this.framesetCache.clear();
        this.numDefinitions = config.getFileIdLimit(12);
    }

    static list(id: number): SeqType {
        if (!this.configClient) {
            throw new Error();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const data = this.configClient.getFile(id, 12);
        const seq = new SeqType();
        if (data) {
            seq.decode(new Packet(data));
        }
        seq.postDecode();
        this.recentUse.put(seq, BigInt(id));
        return seq;
    }

    static getFrameSet(id: number): AnimFrameSet | null {
        const cached = this.framesetCache.get(id);
        if (cached) {
            return cached;
        }

        if (!this.anims || !this.bases) {
            return null;
        }

        const set = AnimFrameSet.load(this.anims, id, this.bases);
        if (set) {
            this.framesetCache.set(id, set);
        }
        return set;
    }

    static resetCache(): void {
        this.recentUse.clear();
        this.framesetCache.clear();
    }

    static isFrameOpaque(frame: number): boolean {
        if (frame === -1) {
            return true;
        }

        const set = this.getFrameSet(frame >>> 16);
        return set === null || !set.getAnimateTransparencies(frame & 0xffff);
    }

    splitAnimateModel(model: Model, other: SeqType, frame: number, otherFrame: number): Model {
        const transformId = this.frames![frame];
        const set = SeqType.getFrameSet(transformId >>> 16);
        const transform = transformId & 0xffff;
        if (set === null) {
            return other.animateModel(otherFrame, model);
        }

        const otherTransformId = other.frames![otherFrame];
        const otherSet = SeqType.getFrameSet(otherTransformId >>> 16);
        const otherTransform = otherTransformId & 0xffff;
        if (otherSet === null) {
            const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform), false);
            animated.animate(transformId);
            return animated;
        }

        const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform) && !otherSet.getAnimateTransparencies(otherTransform), false);
        animated.maskAnimate(transformId, otherTransformId, this.walkmerge);
        return animated;
    }

    animateModel90(frame: number, model: Model, angle: number): Model {
        const transformId = this.frames![frame];
        const set = SeqType.getFrameSet(transformId >>> 16);
        const transform = transformId & 0xffff;
        if (set === null) {
            return Model.copyForAnim(model, true, true, false);
        }

        const rotation = angle & 0x3;
        const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform), false);
        if (rotation === 1) {
            animated.rotate270();
        } else if (rotation === 2) {
            animated.rotate180();
        } else if (rotation === 3) {
            animated.rotate90();
        }

        animated.animate(transformId);

        if (rotation === 1) {
            animated.rotate90();
        } else if (rotation === 2) {
            animated.rotate180();
        } else if (rotation === 3) {
            animated.rotate270();
        }

        return animated;
    }

    animateModel2(model: Model, frame: number): Model {
        const transformId = this.frames![frame];
        const set = SeqType.getFrameSet(transformId >>> 16);
        const transform = transformId & 0xffff;
        if (set === null) {
            return Model.copyForAnim(model, true, true, false);
        }

        const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform), false);
        animated.animate(transformId);
        return animated;
    }

    animateModelWithExtra(frame: number, model: Model): Model {
        const transformId = this.frames![frame];
        const set = SeqType.getFrameSet(transformId >>> 16);
        const transform = transformId & 0xffff;
        if (set === null) {
            return Model.copyForAnim(model, true, true, false);
        }

        let extraSet: AnimFrameSet | null = null;
        let extraTransform = 0;
        if (this.iframes !== null && this.iframes.length > frame) {
            const extraTransformId = this.iframes[frame];
            extraSet = SeqType.getFrameSet(extraTransformId >>> 16);
            extraTransform = extraTransformId & 0xffff;
        }

        if (extraSet === null || extraTransform === 65535) {
            const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform), false);
            animated.animate(transformId);
            return animated;
        }

        const extraTransformId = this.iframes![frame];
        const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform) && !extraSet.getAnimateTransparencies(extraTransform), false);
        animated.animate(transformId);
        animated.animate(extraTransformId);
        return animated;
    }

    animateModel(frame: number, model: Model): Model {
        const transformId = this.frames![frame];
        const set = SeqType.getFrameSet(transformId >>> 16);
        const transform = transformId & 0xffff;
        if (set === null) {
            return Model.copyForAnim(model, true, true, false);
        }

        const animated = Model.copyForAnim(model, true, !set.getAnimateTransparencies(transform), false);
        animated.animate(transformId);
        return animated;
    }

    getDelay(frame: number) {
        if (!this.delay || !this.frames) {
            return 0;
        }

        let delay = this.delay[frame];

        if (delay === 0) {
            delay = 1;
        }

        return delay;
    }

    private postDecode(): void {
        if (this.preanim_move === -1) {
            if (this.walkmerge === null) {
                this.preanim_move = PreanimMove.DELAYMOVE;
            } else {
                this.preanim_move = PreanimMove.MERGE;
            }
        }

        if (this.postanim_move === -1) {
            if (this.walkmerge === null) {
                this.postanim_move = PostanimMove.DELAYMOVE;
            } else {
                this.postanim_move = PostanimMove.MERGE;
            }
        }
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

    decodeInner(dat: Packet, code: number) {
        if (code === 1) {
            this.numFrames = dat.g1();
            this.delay = new Int32Array(this.numFrames);
            for (let i = 0; i < this.numFrames; i++) {
                this.delay[i] = dat.g2();
            }

            this.frames = new Int32Array(this.numFrames);
            for (let i = 0; i < this.numFrames; i++) {
                this.frames[i] = dat.g2();
            }
            for (let i = 0; i < this.numFrames; i++) {
                this.frames[i] += dat.g2() << 16;
            }
        } else if (code === 2) {
            this.loops = dat.g2();
        } else if (code === 3) {
            const count = dat.g1();
            this.walkmerge = new Int32Array(count + 1);
            for (let i = 0; i < count; i++) {
                this.walkmerge[i] = dat.g1();
            }
            this.walkmerge[count] = 9999999;
        } else if (code === 4) {
            this.reachforward = true;
        } else if (code === 5) {
            this.priority = dat.g1();
        } else if (code === 6) {
            this.replaceheldleft = dat.g2();
        } else if (code === 7) {
            this.replaceheldright = dat.g2();
        } else if (code === 8) {
            this.maxloops = dat.g1();
        } else if (code === 9) {
            this.postanim_move = dat.g1();
        } else if (code === 10) {
            this.preanim_move = dat.g1();
        } else if (code === 11) {
            this.duplicatebehaviour = dat.g1();
        } else if (code === 12) {
            const count = dat.g1();
            this.iframes = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.iframes[i] = dat.g2();
            }
            for (let i = 0; i < count; i++) {
                this.iframes[i] += dat.g2() << 16;
            }
        }
    }
}

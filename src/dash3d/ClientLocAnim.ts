import LocType from '#/config/LocType.js';
import SeqType from '#/config/SeqType.js';
import { Client } from '#/client/Client.js';
import type Model from '#/dash3d/Model.js';

import ModelSource from '#/dash3d/ModelSource.js';

export default class ClientLocAnim extends ModelSource {
    readonly index: number;
    readonly shape: number;
    readonly angle: number;
    readonly heightSW: number;
    readonly heightSE: number;
    readonly heightNE: number;
    readonly heightNW: number;
    anim: SeqType | null;
    animFrame: number;
    animCycle: number;

    constructor(index: number, shape: number, angle: number, heightSW: number, heightSE: number, heightNE: number, heightNW: number, seq: number, randomFrame: boolean) {
        super();

        this.index = index;
        this.shape = shape;
        this.angle = angle;

        this.heightSW = heightSW;
        this.heightSE = heightSE;
        this.heightNE = heightNE;
        this.heightNW = heightNW;

        this.anim = seq === -1 ? null : SeqType.list(seq);
        this.animFrame = 0;
        this.animCycle = Client.loopCycle - 1;

        if (randomFrame && this.anim && this.anim.loops !== -1) {
            this.animFrame = (Math.random() * this.anim.frames!.length) | 0;
            this.animCycle -= (Math.random() * this.anim.delay![this.animFrame]) | 0;
        }
    }

    override getTempModel(): Model | null {
        if (this.anim) {
            let delta = Client.loopCycle - this.animCycle;
            if (delta > 100 && this.anim.loops > 0) {
                delta = 100;
            }

            while (this.anim.delay![this.animFrame] < delta) {
                delta -= this.anim.delay![this.animFrame];
                this.animFrame++;

                if (this.anim.frames!.length > this.animFrame) {
                    continue;
                }

                this.animFrame -= this.anim.loops;

                if (this.animFrame < 0 || this.anim.frames!.length <= this.animFrame) {
                    this.anim = null;
                    break;
                }
            }

            this.animCycle = Client.loopCycle - delta;
        }

        let loc: LocType | null = LocType.list(this.index);
        if (loc.multiloc) {
            loc = loc.getMultiLoc();
        }

        if (!loc) {
            return null;
        }

        return loc.getAnimatedModel(this.shape, this.angle, this.animFrame, this.heightSW, this.heightSE, this.heightNE, this.heightNW, this.anim);
    }
}

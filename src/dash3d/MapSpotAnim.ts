import SpotType from '#/config/SpotType.js';
import SeqType from '#/config/SeqType.js';

import type Model from '#/dash3d/Model.js';
import ModelSource from '#/dash3d/ModelSource.js';

export default class MapSpotAnim extends ModelSource {
    readonly type: number;
    readonly level: number;
    readonly x: number;
    readonly z: number;
    readonly y: number;
    readonly startCycle: number;

    animComplete: boolean = false;
    animFrame: number = 0;
    animCycle: number = 0;
    anim: SeqType | null = null;

    constructor(id: number, level: number, x: number, z: number, y: number, cycle: number, delay: number) {
        super();

        this.type = id;
        this.level = level;
        this.x = x;
        this.z = z;
        this.y = y;
        this.startCycle = cycle + delay;
        const anim = SpotType.list(this.type).anim;
        if (anim === -1) {
            this.animComplete = true;
        } else {
            this.animComplete = false;
            this.anim = SeqType.list(anim);
        }
    }

    update(delta: number): void {
        if (this.animComplete || !this.anim) {
            return;
        }

        for (this.animCycle += delta; this.animCycle > this.anim.delay![this.animFrame]; ) {
            this.animCycle -= this.anim.delay![this.animFrame];
            this.animFrame++;

            if (this.anim.frames!.length <= this.animFrame) {
                this.animComplete = true;
                return;
            }
        }
    }

    override getTempModel(): Model | null {
        return SpotType.list(this.type).getTempModel2(this.animComplete ? -1 : this.animFrame);
    }
}

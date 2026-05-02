import SpotType from '#/config/SpotType.js';
import SeqType from '#/config/SeqType.js';

import Model from '#/dash3d/Model.js';
import ModelSource from '#/dash3d/ModelSource.js';

export default class ClientProj extends ModelSource {
    readonly spotanim: number;
    readonly level: number;
    readonly srcX: number;
    readonly srcZ: number;
    readonly h1: number;
    readonly h2: number;
    readonly t1: number;
    readonly t2: number;
    readonly angle: number;
    readonly startpos: number;
    readonly target: number;

    mobile: boolean = false;
    x: number = 0.0;
    z: number = 0.0;
    y: number = 0.0;
    velocityX: number = 0.0;
    velocityZ: number = 0.0;
    velocity: number = 0.0;
    velocityY: number = 0.0;
    accelerationY: number = 0.0;
    yaw: number = 0;
    pitch: number = 0;
    animFrame: number = 0;
    animCycle: number = 0;
    anim: SeqType | null;

    constructor(spotanim: number, level: number, srcX: number, srcZ: number, h1: number, t1: number, t2: number, angle: number, startpos: number, target: number, h2: number) {
        super();

        this.spotanim = spotanim;
        this.level = level;
        this.srcX = srcX;
        this.srcZ = srcZ;
        this.h1 = h1;
        this.t1 = t1;
        this.t2 = t2;
        this.angle = angle;
        this.startpos = startpos;
        this.target = target;
        this.h2 = h2;
        this.mobile = false;
        const anim = SpotType.list(this.spotanim).anim;
        this.anim = anim === -1 ? null : SeqType.list(anim);
    }

    setTarget(cycle: number, dstZ: number, dstY: number, dstX: number): void {
        if (!this.mobile) {
            const dx: number = dstX - this.srcX;
            const dz: number = dstZ - this.srcZ;
            const d: number = Math.sqrt(dx * dx + dz * dz);

            this.x = this.srcX + (dx * this.startpos) / d;
            this.z = this.srcZ + (dz * this.startpos) / d;
            this.y = this.h1;
        }

        const dt: number = this.t2 + 1 - cycle;
        this.velocityX = (dstX - this.x) / dt;
        this.velocityZ = (dstZ - this.z) / dt;
        this.velocity = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
        if (!this.mobile) {
            this.velocityY = -this.velocity * Math.tan(this.angle * 0.02454369);
        }
        this.accelerationY = ((dstY - this.y - this.velocityY * dt) * 2.0) / (dt * dt);
    }

    move(delta: number): void {
        this.mobile = true;
        this.x += this.velocityX * delta;
        this.z += this.velocityZ * delta;
        this.y += this.velocityY * delta + this.accelerationY * 0.5 * delta * delta;
        this.velocityY += this.accelerationY * delta;
        this.yaw = ((Math.atan2(this.velocityX, this.velocityZ) * 325.949 + 1024) | 0) & 0x7ff;
        this.pitch = ((Math.atan2(this.velocityY, this.velocity) * 325.949) | 0) & 0x7ff;

        if (this.anim) {
            this.animCycle += delta;

            while (this.anim.delay![this.animFrame] < this.animCycle) {
                this.animCycle -= this.anim.delay![this.animFrame];
                this.animFrame++;
                if (this.anim.frames!.length <= this.animFrame) {
                    this.animFrame = 0;
                }
            }
        }
    }

    override getTempModel(): Model | null {
        const model: Model | null = SpotType.list(this.spotanim).getTempModel2(this.animFrame);
        if (!model) {
            return null;
        }

        model.rotateXAxis(this.pitch);
        return model;
    }
}

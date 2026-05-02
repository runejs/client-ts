import AnimBase, { AnimTransform } from '#/dash3d/AnimBase.js';

import Packet from '#/io/Packet.js';

export default class AnimFrame {
    static tempTi: Int32Array = new Int32Array(500);
    static tempTx: Int32Array = new Int32Array(500);
    static tempTy: Int32Array = new Int32Array(500);
    static tempTz: Int32Array = new Int32Array(500);

    size: number = -1;
    base: AnimBase | null = null;
    ti: Int32Array;
    tx: Int32Array;
    ty: Int32Array;
    tz: Int32Array;
    animateTransparencies: boolean = false;

    constructor(data: Uint8Array, base: AnimBase) {
        this.base = base;
        const head = new Packet(data);
        const transforms = new Packet(data);
        head.pos = 2;
        const groupCount = head.g1();
        let lastGroup = -1;
        let count = 0;
        transforms.pos = head.pos + groupCount;

        for (let group = 0; group < groupCount; group++) {
            const flags = head.g1();
            if (flags > 0) {
                if (!this.base.type) {
                    throw new Error();
                }

                if (this.base.type[group] !== AnimTransform.ORIGIN) {
                    for (let skipped = group - 1; skipped > lastGroup; skipped--) {
                        if (this.base.type[skipped] === AnimTransform.ORIGIN) {
                            AnimFrame.tempTi[count] = skipped;
                            AnimFrame.tempTx[count] = 0;
                            AnimFrame.tempTy[count] = 0;
                            AnimFrame.tempTz[count] = 0;
                            count++;
                            break;
                        }
                    }
                }

                AnimFrame.tempTi[count] = group;
                let defaultValue = 0;
                if (this.base.type[group] === AnimTransform.SCALE) {
                    defaultValue = 128;
                }

                AnimFrame.tempTx[count] = (flags & 0x1) === 0 ? defaultValue : transforms.gsmarts();
                AnimFrame.tempTy[count] = (flags & 0x2) === 0 ? defaultValue : transforms.gsmarts();
                AnimFrame.tempTz[count] = (flags & 0x4) === 0 ? defaultValue : transforms.gsmarts();
                lastGroup = group;
                count++;

                if (this.base.type[group] === AnimTransform.TRANSPARENCY) {
                    this.animateTransparencies = true;
                }
            }
        }

        if (data.length !== transforms.pos) {
            throw new Error();
        }

        this.size = count;
        this.ti = new Int32Array(count);
        this.tx = new Int32Array(count);
        this.ty = new Int32Array(count);
        this.tz = new Int32Array(count);

        for (let i = 0; i < count; i++) {
            this.ti[i] = AnimFrame.tempTi[i];
            this.tx[i] = AnimFrame.tempTx[i];
            this.ty[i] = AnimFrame.tempTy[i];
            this.tz[i] = AnimFrame.tempTz[i];
        }
    }
}

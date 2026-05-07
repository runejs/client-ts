import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import Tone from '#/sound/Tone.js';
import Wave from '#/sound/Wave.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class JagFX {
    tones: (Tone | null)[] = new TypedArray1d(10, null);
    loopBegin: number = 0;
    loopEnd: number = 0;

    static load(cache: Js5, id: number): JagFX | null {
        const data = cache.getFile(0, id);
        return data === null ? null : new JagFX(new Packet(data));
    }

    constructor(dat?: Packet) {
        if (dat) {
            this.load(dat);
        }
    }

    load(dat: Packet): void {
        for (let tone = 0; tone < 10; tone++) {
            if (dat.g1() !== 0) {
                dat.pos--;

                this.tones[tone] = new Tone();
                this.tones[tone]!.load(dat);
            }
        }

        this.loopBegin = dat.g2();
        this.loopEnd = dat.g2();
    }

    optimiseStart(): number {
        let start = 9999999;
        for (let i = 0; i < 10; i++) {
            const tone = this.tones[i];
            if (tone !== null && ((tone.start / 20) | 0) < start) {
                start = (tone.start / 20) | 0;
            }
        }

        if (this.loopBegin < this.loopEnd && ((this.loopBegin / 20) | 0) < start) {
            start = (this.loopBegin / 20) | 0;
        }

        if (start === 9999999 || start === 0) {
            return 0;
        }

        for (let i = 0; i < 10; i++) {
            const tone = this.tones[i];
            if (tone !== null) {
                tone.start -= start * 20;
            }
        }

        if (this.loopBegin < this.loopEnd) {
            this.loopBegin -= start * 20;
            this.loopEnd -= start * 20;
        }

        return start;
    }

    method708(): Int8Array {
        let var1 = 0;
        for (let var2 = 0; var2 < 10; var2++) {
            if (this.tones[var2] !== null && this.tones[var2]!.length + this.tones[var2]!.start > var1) {
                var1 = this.tones[var2]!.length + this.tones[var2]!.start;
            }
        }
        if (var1 === 0) {
            return new Int8Array(0);
        }
        const var3 = ((var1 * 22050) / 1000) | 0;
        const var4 = new Int8Array(var3);
        for (let var5 = 0; var5 < 10; var5++) {
            if (this.tones[var5] !== null) {
                const var6 = ((this.tones[var5]!.length * 22050) / 1000) | 0;
                const var7 = ((this.tones[var5]!.start * 22050) / 1000) | 0;
                const var8 = this.tones[var5]!.generate(var6, this.tones[var5]!.length);
                for (let var9 = 0; var9 < var6; var9++) {
                    let var10 = (var8[var9] >> 8) + var4[var7 + var9];
                    if ((var10 + 128 & 0xFFFFFF00) !== 0) {
                        var10 = var10 >> 31 ^ 0x7F;
                    }
                    var4[var7 + var9] = var10;
                }
            }
        }
        return var4;
    }

    toWave(): Wave {
        const var1 = this.method708();
        return new Wave(22050, var1, ((this.loopBegin * 22050) / 1000) | 0, ((this.loopEnd * 22050) / 1000) | 0);
    }
}

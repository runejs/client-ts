import Linkable from '#/datastruct/Linkable.js';
import LinkList from '#/datastruct/LinkList.js';

import PcmMixerListener from '#/sound/PcmMixerListener.js';
import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import PcmStreamable from '#/sound/PcmStreamable.js';

export default class Mixer extends PcmStream {
    readonly field240: number = 16;
    readonly field241: LinkList<PcmStream>[] = new Array(8);
    readonly controllers: LinkList<PcmMixerListener> = new LinkList();
    field243: number = 0;
    field244: number = -1;
    field245: number = 0;

    static method993(arg0: unknown, arg1: unknown): Mixer {
        PcmPlayer.method1050(arg1, arg0);
        const var2 = new Mixer();
        PcmPlayer.playStream(var2);
        return var2;
    }

    playStream(arg0: PcmStream): void {
        const var2 = this.field241[Mixer.method130(arg0)];
        var2.pushFront(arg0);
    }

    override pretendToMix(arg0: number): void {
        do {
            if (this.field244 < 0) {
                this.method132(arg0);
                return;
            }
            if (this.field245 + arg0 < this.field244) {
                this.field245 += arg0;
                this.method132(arg0);
                return;
            }
            const var2 = this.field244 - this.field245;
            this.method132(var2);
            arg0 -= var2;
            this.field245 += var2;
            this.method133();
            const var3 = this.controllers.head();
            if (var3 === null) {
                continue;
            }
            const var5 = var3.method743(this);
            if (var5 < 0) {
                var3.field2114 = 0;
                this.unlinkController(var3);
            } else {
                var3.field2114 = var5;
                this.sortController(var3.next, var3);
            }
        } while (arg0 !== 0);
    }

    sortController(arg0: Linkable | null, arg1: PcmMixerListener): void {
        while (this.controllers.sentinel !== arg0 && (arg0 as PcmMixerListener).field2114 <= arg1.field2114) {
            arg0 = arg0?.next ?? null;
        }
        this.controllers.insertBefore(arg0 as PcmMixerListener, arg1);
        this.field244 = (this.controllers.sentinel.next as PcmMixerListener).field2114;
    }

    method129(arg0: Int32Array | number[], arg1: number, arg2: number): number {
        this.field243 -= arg2;
        if (this.field243 <= 0) {
            this.field243 += PcmPlayer.frequency >> 4;
            for (let var4 = 0; var4 < 8; var4++) {
                const var5 = this.field241[var4];
                for (let var6 = var5.head(); var6 !== null; var6 = var5.next()) {
                    const var7 = Mixer.method130(var6);
                    if (var4 !== var7) {
                        this.field241[var7].pushFront(var6);
                    }
                }
            }
        }
        for (let var8 = 0; var8 < 8; var8++) {
            const var9 = this.field241[var8];
            for (let var10 = var9.head(); var10 !== null; var10 = var9.next()) {
                var10.field2167 = false;
                if (var10.field2168 !== null) {
                    var10.field2168.position = 0;
                }
            }
        }
        let var11 = 0;
        let var12 = 255;
        let var13 = 7;
        while (var12 !== 0) {
            let var14: number;
            let var15: number;
            if (var13 < 0) {
                var14 = var13 & 0x3;
                var15 = -(var13 >> 2);
            } else {
                var14 = var13;
                var15 = 0;
            }
            for (let var16 = var12 >>> var14 & 0x11111111; var16 !== 0; var16 >>>= 0x4) {
                if ((var16 & 0x1) !== 0) {
                    var12 &= ~(0x1 << var14);
                    const var17 = this.field241[var14];
                    for (let var18 = var17.head(); var18 !== null; var18 = var17.next()) {
                        if (!var18.field2167) {
                            const var19: PcmStreamable | null = var18.field2168;
                            if (var19 === null || var19.position <= var15) {
                                if (var11 < this.field240) {
                                    const var20 = var18.doMix(arg0, arg1, arg2);
                                    var11 += var20;
                                    if (var19 !== null) {
                                        var19.position += var20;
                                    }
                                } else {
                                    var18.pretendToMix(arg2);
                                }
                                var18.field2167 = true;
                            } else {
                                var12 |= 0x1 << var14;
                            }
                        }
                    }
                }
                var14 += 4;
                var15++;
            }
            var13--;
        }
        return var11;
    }

    static method130(arg0: PcmStream): number {
        return arg0.priority() >> 5;
    }

    unlinkController(arg0: PcmMixerListener): void {
        arg0.unlink();
        arg0.method742();
        const var2 = this.controllers.sentinel.next;
        if (this.controllers.sentinel === var2) {
            this.field244 = -1;
        } else {
            this.field244 = (var2 as PcmMixerListener).field2114;
        }
    }

    constructor() {
        super();
        for (let var1 = 0; var1 < 8; var1++) {
            this.field241[var1] = new LinkList();
        }
    }

    method132(arg0: number): void {
        this.field243 -= arg0;
        if (this.field243 < 0) {
            this.field243 = 0;
        }
        for (let var2 = 0; var2 < 8; var2++) {
            const var3 = this.field241[var2];
            for (let var4 = var3.head(); var4 !== null; var4 = var3.next()) {
                var4.pretendToMix(arg0);
            }
        }
    }

    method133(): void {
        if (this.field245 <= 0) {
            return;
        }
        for (let var1 = this.controllers.head(); var1 !== null; var1 = this.controllers.next()) {
            var1.field2114 -= this.field245;
        }
        this.field244 -= this.field245;
        this.field245 = 0;
    }

    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): number {
        let var5: number;
        do {
            if (this.field244 < 0) {
                return this.method129(arg0, arg1, arg2);
            }
            if (this.field245 + arg2 < this.field244) {
                this.field245 += arg2;
                return this.method129(arg0, arg1, arg2);
            }
            const var4 = this.field244 - this.field245;
            var5 = this.method129(arg0, arg1, var4);
            arg1 += var4;
            arg2 -= var4;
            this.field245 += var4;
            this.method133();
            const var6 = this.controllers.head();
            if (var6 === null) {
                continue;
            }
            const var8 = var6.method743(this);
            if (var8 < 0) {
                var6.field2114 = 0;
                this.unlinkController(var6);
            } else {
                var6.field2114 = var8;
                this.sortController(var6.next, var6);
            }
        } while (arg2 !== 0);
        return var5;
    }

    stopStream(arg0: PcmStream): void {
        arg0.unlink();
    }
}

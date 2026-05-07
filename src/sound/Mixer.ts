import Linkable from '#/datastruct/Linkable.js';
import LinkList from '#/datastruct/LinkList.js';

import PcmMixerListener from '#/sound/PcmMixerListener.js';
import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import PcmStreamable from '#/sound/PcmStreamable.js';

export default class Mixer extends PcmStream {
    readonly maxStreams: number = 16;
    readonly streamsByPriority: LinkList<PcmStream>[] = new Array(8);
    readonly controllers: LinkList<PcmMixerListener> = new LinkList();
    priorityRefreshTimer: number = 0;
    nextControllerTime: number = -1;
    controllerOffset: number = 0;

    static create(arg0: unknown, arg1: unknown): Mixer {
        PcmPlayer.initGlobal(arg1, arg0);
        const var2 = new Mixer();
        PcmPlayer.playStream(var2);
        return var2;
    }

    playStream(arg0: PcmStream): void {
        const var2 = this.streamsByPriority[Mixer.priorityBucket(arg0)];
        var2.pushFront(arg0);
    }

    override pretendToMix(arg0: number): void {
        do {
            if (this.nextControllerTime < 0) {
                this.skipStreams(arg0);
                return;
            }
            if (this.controllerOffset + arg0 < this.nextControllerTime) {
                this.controllerOffset += arg0;
                this.skipStreams(arg0);
                return;
            }
            const var2 = this.nextControllerTime - this.controllerOffset;
            this.skipStreams(var2);
            arg0 -= var2;
            this.controllerOffset += var2;
            this.normalizeControllerTimes();
            const var3 = this.controllers.head();
            if (var3 === null) {
                continue;
            }
            const var5 = var3.update(this);
            if (var5 < 0) {
                var3.remainingSamples = 0;
                this.unlinkController(var3);
            } else {
                var3.remainingSamples = var5;
                this.sortController(var3.next, var3);
            }
        } while (arg0 !== 0);
    }

    sortController(arg0: Linkable | null, arg1: PcmMixerListener): void {
        while (this.controllers.sentinel !== arg0 && (arg0 as PcmMixerListener).remainingSamples <= arg1.remainingSamples) {
            arg0 = arg0?.next ?? null;
        }
        this.controllers.insertBefore(arg0 as PcmMixerListener, arg1);
        this.nextControllerTime = (this.controllers.sentinel.next as PcmMixerListener).remainingSamples;
    }

    mixStreams(arg0: Int32Array | number[], arg1: number, arg2: number): number {
        this.priorityRefreshTimer -= arg2;
        if (this.priorityRefreshTimer <= 0) {
            this.priorityRefreshTimer += PcmPlayer.frequency >> 4;
            for (let var4 = 0; var4 < 8; var4++) {
                const var5 = this.streamsByPriority[var4];
                for (let var6 = var5.head(); var6 !== null; var6 = var5.next()) {
                    const var7 = Mixer.priorityBucket(var6);
                    if (var4 !== var7) {
                        this.streamsByPriority[var7].pushFront(var6);
                    }
                }
            }
        }
        for (let var8 = 0; var8 < 8; var8++) {
            const var9 = this.streamsByPriority[var8];
            for (let var10 = var9.head(); var10 !== null; var10 = var9.next()) {
                var10.mixed = false;
                if (var10.streamable !== null) {
                    var10.streamable.position = 0;
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
                    const var17 = this.streamsByPriority[var14];
                    for (let var18 = var17.head(); var18 !== null; var18 = var17.next()) {
                        if (!var18.mixed) {
                            const var19: PcmStreamable | null = var18.streamable;
                            if (var19 === null || var19.position <= var15) {
                                if (var11 < this.maxStreams) {
                                    const var20 = var18.doMix(arg0, arg1, arg2);
                                    var11 += var20;
                                    if (var19 !== null) {
                                        var19.position += var20;
                                    }
                                } else {
                                    var18.pretendToMix(arg2);
                                }
                                var18.mixed = true;
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

    static priorityBucket(arg0: PcmStream): number {
        return arg0.priority() >> 5;
    }

    unlinkController(arg0: PcmMixerListener): void {
        arg0.unlink();
        arg0.remove();
        const var2 = this.controllers.sentinel.next;
        if (this.controllers.sentinel === var2) {
            this.nextControllerTime = -1;
        } else {
            this.nextControllerTime = (var2 as PcmMixerListener).remainingSamples;
        }
    }

    constructor() {
        super();
        for (let var1 = 0; var1 < 8; var1++) {
            this.streamsByPriority[var1] = new LinkList();
        }
    }

    skipStreams(arg0: number): void {
        this.priorityRefreshTimer -= arg0;
        if (this.priorityRefreshTimer < 0) {
            this.priorityRefreshTimer = 0;
        }
        for (let var2 = 0; var2 < 8; var2++) {
            const var3 = this.streamsByPriority[var2];
            for (let var4 = var3.head(); var4 !== null; var4 = var3.next()) {
                var4.pretendToMix(arg0);
            }
        }
    }

    normalizeControllerTimes(): void {
        if (this.controllerOffset <= 0) {
            return;
        }
        for (let var1 = this.controllers.head(); var1 !== null; var1 = this.controllers.next()) {
            var1.remainingSamples -= this.controllerOffset;
        }
        this.nextControllerTime -= this.controllerOffset;
        this.controllerOffset = 0;
    }

    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): number {
        let var5: number;
        do {
            if (this.nextControllerTime < 0) {
                return this.mixStreams(arg0, arg1, arg2);
            }
            if (this.controllerOffset + arg2 < this.nextControllerTime) {
                this.controllerOffset += arg2;
                return this.mixStreams(arg0, arg1, arg2);
            }
            const var4 = this.nextControllerTime - this.controllerOffset;
            var5 = this.mixStreams(arg0, arg1, var4);
            arg1 += var4;
            arg2 -= var4;
            this.controllerOffset += var4;
            this.normalizeControllerTimes();
            const var6 = this.controllers.head();
            if (var6 === null) {
                continue;
            }
            const var8 = var6.update(this);
            if (var8 < 0) {
                var6.remainingSamples = 0;
                this.unlinkController(var6);
            } else {
                var6.remainingSamples = var8;
                this.sortController(var6.next, var6);
            }
        } while (arg2 !== 0);
        return var5;
    }

    stopStream(arg0: PcmStream): void {
        arg0.unlink();
    }
}

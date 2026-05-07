import ByteArrayNode from '#/datastruct/ByteArrayNode.js';
import LruCache from '#/datastruct/LruCache.js';
import Js5 from '#/js5/Js5.js';
import MidiStream from '#/sound/MidiStream.js';

export default class MidiManager {
    static field1391: boolean = false;
    static field2985: number = 0;
    static field405: number = 0;
    static field917: number = 0;
    static pendingVolume: number = 0;
    static pendingLoop: boolean = false;
    static field1462: number = 0;
    static midis: Js5 | null = null;
    static field463: number = 0;
    static field311: MidiStream | null = null;
    static field3030: number = -1;
    static field2046: number = 0;
    static field78: Uint8Array | null = null;
    static field1548: number = 0;
    static field302: number = 0;
    static field975: number = 0;
    static field1662: boolean = false;
    static field30: LruCache<ByteArrayNode> | null = null;

    static play(arg0: number, arg1: number, arg2: number, arg3: Js5): void {
        if (!MidiManager.method521()) {
            return;
        }
        MidiManager.field1391 = true;
        MidiManager.field2985 = -1;
        MidiManager.field405 = -1;
        MidiManager.field917 = arg2;
        MidiManager.pendingVolume = 0;
        MidiManager.pendingLoop = false;
        MidiManager.field1462 = arg0;
        MidiManager.midis = arg3;
        MidiManager.field463 = arg1;
    }

    static method521(): boolean {
        return MidiManager.field311 !== null;
    }

    static stop(): void {
        if (MidiManager.method521()) {
            MidiManager.method475();
            MidiManager.field1391 = false;
            MidiManager.midis = null;
        }
    }

    static method670(arg0: number, arg1: number, arg2: Js5, arg3: number): void {
        if (!MidiManager.method521()) {
            return;
        }
        MidiManager.pendingLoop = false;
        MidiManager.field405 = 10;
        MidiManager.pendingVolume = arg3;
        MidiManager.field1391 = true;
        MidiManager.midis = arg2;
        MidiManager.field2985 = -1;
        MidiManager.field917 = arg0;
        MidiManager.field1462 = 0;
        MidiManager.field463 = arg1;
    }

    static method672(): void {
        if (MidiManager.method521()) {
            MidiManager.method397();
            MidiManager.midis = null;
            MidiManager.field1391 = false;
        }
    }

    static method680(): void {
        if (!MidiManager.method521()) {
            return;
        }
        if (MidiManager.field1391) {
            const var0 = MidiManager.method25(MidiManager.pendingVolume, MidiManager.midis!, MidiManager.field463, MidiManager.field1462);
            if (var0 !== null) {
                if (MidiManager.field405 >= 0) {
                    MidiManager.method749(MidiManager.field917, MidiManager.pendingLoop, var0, MidiManager.field405);
                } else if (MidiManager.field2985 < 0) {
                    MidiManager.method7(MidiManager.pendingLoop, var0, MidiManager.field917);
                } else {
                    MidiManager.method406(MidiManager.field917, MidiManager.pendingLoop, MidiManager.field2985, var0);
                }
                MidiManager.field1391 = false;
                MidiManager.midis = null;
            }
        }
        MidiManager.method962();
    }

    static method475(): void {
        MidiManager.method7(false, null, 0);
    }

    static method7(arg0: boolean, arg1: Uint8Array | null, arg2: number): void {
        if (MidiManager.field311 === null) {
            return;
        }
        if (MidiManager.field3030 >= 0) {
            MidiManager.field311.method305();
            MidiManager.field2046 = 0;
            MidiManager.field78 = null;
            MidiManager.field1548 = 20;
            MidiManager.field3030 = -1;
        }
        if (arg1 === null) {
            return;
        }
        if (MidiManager.field1548 > 0) {
            MidiManager.field311.method304(arg2);
            MidiManager.field1548 = 0;
        }
        MidiManager.field3030 = arg2;
        MidiManager.field311.method307(arg1, arg0, arg2);
    }

    static method406(arg0: number, arg1: boolean, arg2: number, arg3: Uint8Array): void {
        if (MidiManager.field311 === null) {
            return;
        }
        if (MidiManager.field3030 >= 0) {
            arg2 -= 20;
            if (arg2 < 1) {
                arg2 = 1;
            }
            MidiManager.field1548 = arg2;
            if (MidiManager.field3030 === 0) {
                MidiManager.field302 = 0;
            } else {
                const var4 = MidiManager.method632(MidiManager.field3030);
                const var5 = var4 - MidiManager.field2046;
                MidiManager.field302 = ((arg2 + var5 + 3600 - 1) / arg2) | 0;
            }
            MidiManager.field78 = arg3;
            MidiManager.field975 = arg0;
            MidiManager.field1662 = arg1;
        } else if (MidiManager.field1548 === 0) {
            MidiManager.method7(arg1, arg3, arg0);
        } else {
            MidiManager.field975 = arg0;
            MidiManager.field1662 = arg1;
            MidiManager.field78 = arg3;
        }
    }

    static method25(arg0: number, arg1: Js5, arg2: number, arg3: number): Uint8Array | null {
        const var4 = (BigInt(arg3) << 32n) + BigInt((arg2 * 37 + arg0 & 0xFFFF) + (arg2 << 16));
        if (MidiManager.field30 !== null) {
            const var6 = MidiManager.field30.find(var4);
            if (var6 !== null) {
                return var6.data;
            }
        }
        const var7 = arg1.getFile(arg0, arg2);
        if (var7 === null) {
            return null;
        } else {
            if (MidiManager.field30 !== null) {
                MidiManager.field30.put(new ByteArrayNode(var7), var4);
            }
            return var7;
        }
    }

    static method749(arg0: number, arg1: boolean, arg2: Uint8Array | null, arg3: number): void {
        if (MidiManager.field311 === null) {
            return;
        }
        if (MidiManager.field3030 >= 0) {
            MidiManager.field302 = arg3;
            if (MidiManager.field3030 === 0) {
                MidiManager.field1548 = 1;
            } else {
                const var4 = MidiManager.method632(MidiManager.field3030);
                const var5 = var4 - MidiManager.field2046;
                MidiManager.field1548 = ((var5 + 3600) / arg3) | 0;
                if (MidiManager.field1548 < 1) {
                    MidiManager.field1548 = 1;
                }
            }
            MidiManager.field975 = arg0;
            MidiManager.field78 = arg2;
            MidiManager.field1662 = arg1;
        } else if (MidiManager.field1548 === 0) {
            MidiManager.method7(arg1, arg2, arg0);
        } else {
            MidiManager.field975 = arg0;
            MidiManager.field78 = arg2;
            MidiManager.field1662 = arg1;
        }
    }

    static method962(): void {
        if (MidiManager.field311 === null) {
            return;
        }
        if (MidiManager.field3030 >= 0) {
            if (MidiManager.field1548 > 0) {
                MidiManager.field2046 += MidiManager.field302;
                MidiManager.field311.method302(MidiManager.field3030, MidiManager.field2046);
                MidiManager.field1548--;
                if (MidiManager.field1548 === 0) {
                    MidiManager.field311.method305();
                    MidiManager.field3030 = -1;
                    MidiManager.field1548 = 20;
                }
            }
        } else if (MidiManager.field1548 > 0) {
            MidiManager.field1548--;
            if (MidiManager.field1548 === 0) {
                if (MidiManager.field78 === null) {
                    MidiManager.field311.method304(256);
                } else {
                    MidiManager.field311.method304(MidiManager.field975);
                    MidiManager.field3030 = MidiManager.field975;
                    MidiManager.field311.method307(MidiManager.field78, MidiManager.field1662, MidiManager.field975);
                    MidiManager.field78 = null;
                }
                MidiManager.field2046 = 0;
            }
        }
        MidiManager.field311.method308();
    }

    static method632(arg0: number): number {
        return (Math.log(arg0 * 0.00390625) * 868.5889638065036 + 0.5) | 0;
    }

    static method397(): void {
        MidiManager.method749(0, false, null, 10);
    }

    static method679(arg0: Js5, arg1: string, arg2: string, arg3: number): void {
        if (MidiManager.method521()) {
            const var4 = arg0.getGroupId(arg1);
            const var5 = arg0.getFileId(var4, arg2);
            MidiManager.method670(arg3, var4, arg0, var5);
        }
    }

    static method877(arg0: number): void {
        if (MidiManager.field311 === null) {
            return;
        }
        if (MidiManager.field1548 === 0) {
            if (MidiManager.field3030 >= 0) {
                MidiManager.field3030 = arg0;
                MidiManager.field311.method302(arg0, 0);
            }
        } else if (MidiManager.field78 !== null) {
            MidiManager.field975 = arg0;
        }
    }

    static method1029(): void {
        if (MidiManager.field311 === null) {
            return;
        }
        MidiManager.method475();
        if (MidiManager.field1548 > 0) {
            MidiManager.field311.method304(256);
            MidiManager.field1548 = 0;
        }
        MidiManager.field311.method303();
        MidiManager.field311 = null;
    }

    static setVolume(arg0: number): void {
        if (!MidiManager.method521()) {
            return;
        }
        if (MidiManager.field1391) {
            MidiManager.field917 = arg0;
        } else {
            MidiManager.method877(arg0);
        }
    }

    static method674(): void {
        MidiManager.method1029();
    }
}

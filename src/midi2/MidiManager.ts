import ByteArrayNode from '#/datastruct/ByteArrayNode.js';
import LruCache from '#/datastruct/LruCache.js';
import Js5 from '#/js5/Js5.js';
import MidiStream from '#/midi2/MidiStream.js';

export default class MidiManager {
    static songRequestPending: boolean = false;
    static pendingFadeTicks: number = 0;
    static pendingFadeStep: number = 0;
    static pendingSongVolume: number = 0;
    static pendingVolume: number = 0;
    static pendingLoop: boolean = false;
    static pendingCacheId: number = 0;
    static midis: Js5 | null = null;
    static pendingGroupId: number = 0;
    static midiStream: MidiStream | null = null;
    static currentVolume: number = -1;
    static currentFadeOffset: number = 0;
    static queuedMidiData: Uint8Array | null = null;
    static fadeTicks: number = 0;
    static fadeStep: number = 0;
    static queuedVolume: number = 0;
    static queuedLoop: boolean = false;
    static midiCache: LruCache<ByteArrayNode> | null = null;

    static play(arg0: number, arg1: number, arg2: number, arg3: Js5): void {
        if (!MidiManager.isReady()) {
            return;
        }
        MidiManager.songRequestPending = true;
        MidiManager.pendingFadeTicks = -1;
        MidiManager.pendingFadeStep = -1;
        MidiManager.pendingSongVolume = arg2;
        MidiManager.pendingVolume = 0;
        MidiManager.pendingLoop = false;
        MidiManager.pendingCacheId = arg0;
        MidiManager.midis = arg3;
        MidiManager.pendingGroupId = arg1;
    }

    static isReady(): boolean {
        return MidiManager.midiStream !== null;
    }

    static stop(): void {
        if (MidiManager.isReady()) {
            MidiManager.stopNow();
            MidiManager.songRequestPending = false;
            MidiManager.midis = null;
        }
    }

    static playGroup(arg0: number, arg1: number, arg2: Js5, arg3: number): void {
        if (!MidiManager.isReady()) {
            return;
        }
        MidiManager.pendingLoop = false;
        MidiManager.pendingFadeStep = 10;
        MidiManager.pendingVolume = arg3;
        MidiManager.songRequestPending = true;
        MidiManager.midis = arg2;
        MidiManager.pendingFadeTicks = -1;
        MidiManager.pendingSongVolume = arg0;
        MidiManager.pendingCacheId = 0;
        MidiManager.pendingGroupId = arg1;
    }

    static stopWithFade(): void {
        if (MidiManager.isReady()) {
            MidiManager.fadeOut();
            MidiManager.midis = null;
            MidiManager.songRequestPending = false;
        }
    }

    static loop(): void {
        if (!MidiManager.isReady()) {
            return;
        }
        if (MidiManager.songRequestPending) {
            const var0 = MidiManager.getMidiFile(MidiManager.pendingVolume, MidiManager.midis!, MidiManager.pendingGroupId, MidiManager.pendingCacheId);
            if (var0 !== null) {
                if (MidiManager.pendingFadeStep >= 0) {
                    MidiManager.fadeOutThenPlayWithStep(MidiManager.pendingSongVolume, MidiManager.pendingLoop, var0, MidiManager.pendingFadeStep);
                } else if (MidiManager.pendingFadeTicks < 0) {
                    MidiManager.playImmediate(MidiManager.pendingLoop, var0, MidiManager.pendingSongVolume);
                } else {
                    MidiManager.fadeOutThenPlay(MidiManager.pendingSongVolume, MidiManager.pendingLoop, MidiManager.pendingFadeTicks, var0);
                }
                MidiManager.songRequestPending = false;
                MidiManager.midis = null;
            }
        }
        MidiManager.update();
    }

    static stopNow(): void {
        MidiManager.playImmediate(false, null, 0);
    }

    static playImmediate(arg0: boolean, arg1: Uint8Array | null, arg2: number): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        if (MidiManager.currentVolume >= 0) {
            MidiManager.midiStream.stop();
            MidiManager.currentFadeOffset = 0;
            MidiManager.queuedMidiData = null;
            MidiManager.fadeTicks = 20;
            MidiManager.currentVolume = -1;
        }
        if (arg1 === null) {
            return;
        }
        if (MidiManager.fadeTicks > 0) {
            MidiManager.midiStream.resetVolume(arg2);
            MidiManager.fadeTicks = 0;
        }
        MidiManager.currentVolume = arg2;
        MidiManager.midiStream.play(arg1, arg0, arg2);
    }

    static fadeOutThenPlay(arg0: number, arg1: boolean, arg2: number, arg3: Uint8Array): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        if (MidiManager.currentVolume >= 0) {
            arg2 -= 20;
            if (arg2 < 1) {
                arg2 = 1;
            }
            MidiManager.fadeTicks = arg2;
            if (MidiManager.currentVolume === 0) {
                MidiManager.fadeStep = 0;
            } else {
                const var4 = MidiManager.volumeToDecibels(MidiManager.currentVolume);
                const var5 = var4 - MidiManager.currentFadeOffset;
                MidiManager.fadeStep = ((arg2 + var5 + 3600 - 1) / arg2) | 0;
            }
            MidiManager.queuedMidiData = arg3;
            MidiManager.queuedVolume = arg0;
            MidiManager.queuedLoop = arg1;
        } else if (MidiManager.fadeTicks === 0) {
            MidiManager.playImmediate(arg1, arg3, arg0);
        } else {
            MidiManager.queuedVolume = arg0;
            MidiManager.queuedLoop = arg1;
            MidiManager.queuedMidiData = arg3;
        }
    }

    static getMidiFile(arg0: number, arg1: Js5, arg2: number, arg3: number): Uint8Array | null {
        const var4 = (BigInt(arg3) << 32n) + BigInt((arg2 * 37 + arg0 & 0xFFFF) + (arg2 << 16));
        if (MidiManager.midiCache !== null) {
            const var6 = MidiManager.midiCache.find(var4);
            if (var6 !== null) {
                return var6.data;
            }
        }
        const var7 = arg1.getFile(arg0, arg2);
        if (var7 === null) {
            return null;
        } else {
            if (MidiManager.midiCache !== null) {
                MidiManager.midiCache.put(new ByteArrayNode(var7), var4);
            }
            return var7;
        }
    }

    static fadeOutThenPlayWithStep(arg0: number, arg1: boolean, arg2: Uint8Array | null, arg3: number): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        if (MidiManager.currentVolume >= 0) {
            MidiManager.fadeStep = arg3;
            if (MidiManager.currentVolume === 0) {
                MidiManager.fadeTicks = 1;
            } else {
                const var4 = MidiManager.volumeToDecibels(MidiManager.currentVolume);
                const var5 = var4 - MidiManager.currentFadeOffset;
                MidiManager.fadeTicks = ((var5 + 3600) / arg3) | 0;
                if (MidiManager.fadeTicks < 1) {
                    MidiManager.fadeTicks = 1;
                }
            }
            MidiManager.queuedVolume = arg0;
            MidiManager.queuedMidiData = arg2;
            MidiManager.queuedLoop = arg1;
        } else if (MidiManager.fadeTicks === 0) {
            MidiManager.playImmediate(arg1, arg2, arg0);
        } else {
            MidiManager.queuedVolume = arg0;
            MidiManager.queuedMidiData = arg2;
            MidiManager.queuedLoop = arg1;
        }
    }

    static update(): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        if (MidiManager.currentVolume >= 0) {
            if (MidiManager.fadeTicks > 0) {
                MidiManager.currentFadeOffset += MidiManager.fadeStep;
                MidiManager.midiStream.setVolume(MidiManager.currentVolume, MidiManager.currentFadeOffset);
                MidiManager.fadeTicks--;
                if (MidiManager.fadeTicks === 0) {
                    MidiManager.midiStream.stop();
                    MidiManager.currentVolume = -1;
                    MidiManager.fadeTicks = 20;
                }
            }
        } else if (MidiManager.fadeTicks > 0) {
            MidiManager.fadeTicks--;
            if (MidiManager.fadeTicks === 0) {
                if (MidiManager.queuedMidiData === null) {
                    MidiManager.midiStream.resetVolume(256);
                } else {
                    MidiManager.midiStream.resetVolume(MidiManager.queuedVolume);
                    MidiManager.currentVolume = MidiManager.queuedVolume;
                    MidiManager.midiStream.play(MidiManager.queuedMidiData, MidiManager.queuedLoop, MidiManager.queuedVolume);
                    MidiManager.queuedMidiData = null;
                }
                MidiManager.currentFadeOffset = 0;
            }
        }
        MidiManager.midiStream.poll();
    }

    static volumeToDecibels(arg0: number): number {
        return (Math.log(arg0 * 0.00390625) * 868.5889638065036 + 0.5) | 0;
    }

    static fadeOut(): void {
        MidiManager.fadeOutThenPlayWithStep(0, false, null, 10);
    }

    static playNamed(arg0: Js5, arg1: string, arg2: string, arg3: number): void {
        if (MidiManager.isReady()) {
            const var4 = arg0.getGroupId(arg1);
            const var5 = arg0.getFileId(var4, arg2);
            MidiManager.playGroup(arg3, var4, arg0, var5);
        }
    }

    static setActiveVolume(arg0: number): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        if (MidiManager.fadeTicks === 0) {
            if (MidiManager.currentVolume >= 0) {
                MidiManager.currentVolume = arg0;
                MidiManager.midiStream.setVolume(arg0, 0);
            }
        } else if (MidiManager.queuedMidiData !== null) {
            MidiManager.queuedVolume = arg0;
        }
    }

    static shutdown(): void {
        if (MidiManager.midiStream === null) {
            return;
        }
        MidiManager.stopNow();
        if (MidiManager.fadeTicks > 0) {
            MidiManager.midiStream.resetVolume(256);
            MidiManager.fadeTicks = 0;
        }
        MidiManager.midiStream.closeStream();
        MidiManager.midiStream = null;
    }

    static setVolume(arg0: number): void {
        if (!MidiManager.isReady()) {
            return;
        }
        if (MidiManager.songRequestPending) {
            MidiManager.pendingSongVolume = arg0;
        } else {
            MidiManager.setActiveVolume(arg0);
        }
    }

    static unload(): void {
        MidiManager.shutdown();
    }
}

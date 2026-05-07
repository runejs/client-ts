import { Client } from '#/client/Client.js';
import LocType from '#/config/LocType.js';

import Linkable from '#/datastruct/Linkable.js';
import LinkList from '#/datastruct/LinkList.js';

import type Js5 from '#/js5/Js5.js';
import JagFX from '#/sound/JagFX.js';
import WaveStream from '#/sound/WaveStream.js';

export default class BgSound extends Linkable {
    static soundlist: LinkList<BgSound> = new LinkList();
    static jagFX: Js5 | null = null;
    static ambientVolume: number = 127;
    static ambientEnabled: boolean = true;

    level: number = 0;
    minZ: number = 0;
    soundId: number = -1;
    range: number = 0;
    continuousStream: WaveStream | null = null;
    maxDelay: number = 0;
    minX: number = 0;
    random: Int32Array | null = null;
    maxX: number = 0;
    randomStream: WaveStream | null = null;
    multiloc: LocType | null = null;
    minDelay: number = 0;
    maxZ: number = 0;
    randomSoundTimer: number = 0;

    static reset(): void {
        for (let sound: BgSound | null = this.soundlist.head(); sound !== null; sound = this.soundlist.next()) {
            if (sound.continuousStream !== null) {
                Client.soundMixer?.stopStream(sound.continuousStream);
                sound.continuousStream = null;
            }
            if (sound.randomStream !== null) {
                Client.soundMixer?.stopStream(sound.randomStream);
                sound.randomStream = null;
            }
        }
        this.soundlist.clear();
    }

    static addSound(z: number, level: number, angle: number, x: number, loc: LocType): void {
        const sound = new BgSound();
        sound.range = loc.bgsound_range * 128;
        sound.maxDelay = loc.bgsound_maxdelay;
        sound.random = loc.bgsound_random;
        sound.minDelay = loc.bgsound_mindelay;
        let width = loc.width;
        let length = loc.length;
        sound.level = level;
        sound.minZ = x * 128;
        if (angle === 1 || angle === 3) {
            width = loc.length;
            length = loc.width;
        }
        sound.minX = z * 128;
        sound.maxX = (z + length) * 128;
        sound.maxZ = (x + width) * 128;
        sound.soundId = loc.bgsound_sound;
        if (loc.multiloc !== null) {
            sound.multiloc = loc;
            sound.recalcSound();
        }
        this.soundlist.push(sound);
        if (sound.random !== null) {
            sound.randomSoundTimer = ((sound.maxDelay - sound.minDelay) * Math.random() + sound.minDelay) | 0;
        }
    }

    static doMix(x: number, level: number, delta: number, z: number): void {
        for (let sound: BgSound | null = this.soundlist.head(); sound !== null; sound = this.soundlist.next()) {
            if (sound.soundId !== -1 || sound.random !== null) {
                let distance = 0;
                if (x > sound.maxZ) {
                    distance = x - sound.maxZ;
                } else if (x < sound.minZ) {
                    distance = sound.minZ - x;
                }
                if (z > sound.maxX) {
                    distance += z - sound.maxX;
                } else if (z < sound.minX) {
                    distance += sound.minX - z;
                }

                if (sound.range < distance - 64 || this.ambientVolume === 0 || sound.level !== level) {
                    if (sound.continuousStream !== null) {
                        Client.soundMixer?.stopStream(sound.continuousStream);
                        sound.continuousStream = null;
                    }
                    if (sound.randomStream !== null) {
                        Client.soundMixer?.stopStream(sound.randomStream);
                        sound.randomStream = null;
                    }
                } else {
                    distance -= 64;
                    if (distance < 0) {
                        distance = 0;
                    }
                    const volume = (((sound.range - distance) * this.ambientVolume) / sound.range) | 0;
                    if (sound.continuousStream !== null) {
                        sound.continuousStream.setVolume(volume);
                    } else if (sound.soundId >= 0 && Client.soundMixer !== null && BgSound.jagFX !== null) {
                        const var7 = JagFX.load(BgSound.jagFX, sound.soundId);
                        if (var7 !== null) {
                            const var8 = var7.toWave();
                            const var9 = WaveStream.newRatePercent(var8, volume);
                            if (var9 !== null) {
                                var9.setLoopCount(-1);
                                Client.soundMixer.playStream(var9);
                                sound.continuousStream = var9;
                            }
                        }
                    }

                    if (sound.randomStream !== null) {
                        sound.randomStream.setVolume(volume);
                        if (!sound.randomStream.isRamping()) {
                            sound.randomStream = null;
                        }
                    } else if (sound.random !== null && (sound.randomSoundTimer -= delta) <= 0 && Client.soundMixer !== null && BgSound.jagFX !== null) {
                        const soundId = sound.random[(sound.random.length * Math.random()) | 0];
                        const var11 = JagFX.load(BgSound.jagFX, soundId);
                        if (var11 !== null) {
                            const var12 = var11.toWave();
                            const var13 = WaveStream.newRatePercent(var12, volume);
                            if (var13 !== null) {
                                var13.setLoopCount(0);
                                Client.soundMixer.playStream(var13);
                                sound.randomSoundTimer = sound.minDelay + (((sound.maxDelay - sound.minDelay) * Math.random()) | 0);
                                sound.randomStream = var13;
                            }
                        }
                    }
                }
            }
        }
    }

    static recalculateMultilocs(): void {
        for (let sound: BgSound | null = this.soundlist.head(); sound !== null; sound = this.soundlist.next()) {
            if (sound.multiloc !== null) {
                sound.recalcSound();
            }
        }
    }

    recalcSound(): void {
        const oldSound = this.soundId;
        const loc = this.multiloc!.getMultiLoc();
        if (loc === null) {
            this.range = 0;
            this.minDelay = 0;
            this.maxDelay = 0;
            this.random = null;
            this.soundId = -1;
        } else {
            this.range = loc.bgsound_range * 128;
            this.minDelay = loc.bgsound_mindelay;
            this.maxDelay = loc.bgsound_maxdelay;
            this.soundId = loc.bgsound_sound;
            this.random = loc.bgsound_random;
        }
        if (this.soundId !== oldSound && this.continuousStream !== null) {
            Client.soundMixer?.stopStream(this.continuousStream);
            this.continuousStream = null;
        }
    }
}

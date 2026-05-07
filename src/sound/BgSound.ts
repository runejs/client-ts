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
    field417: number = 0;
    field420: number = -1;
    range: number = 0;
    continuousStream: WaveStream | null = null;
    field425: number = 0;
    field426: number = 0;
    random: Int32Array | null = null;
    field430: number = 0;
    randomStream: WaveStream | null = null;
    multiloc: LocType | null = null;
    field435: number = 0;
    field436: number = 0;
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
        sound.field425 = loc.bgsound_maxdelay;
        sound.random = loc.bgsound_random;
        sound.field435 = loc.bgsound_mindelay;
        let width = loc.width;
        let length = loc.length;
        sound.level = level;
        sound.field417 = x * 128;
        if (angle === 1 || angle === 3) {
            width = loc.length;
            length = loc.width;
        }
        sound.field426 = z * 128;
        sound.field430 = (z + length) * 128;
        sound.field436 = (x + width) * 128;
        sound.field420 = loc.bgsound_sound;
        if (loc.multiloc !== null) {
            sound.multiloc = loc;
            sound.recalcSound();
        }
        this.soundlist.push(sound);
        if (sound.random !== null) {
            sound.randomSoundTimer = ((sound.field425 - sound.field435) * Math.random() + sound.field435) | 0;
        }
    }

    static doMix(x: number, level: number, delta: number, z: number): void {
        for (let sound: BgSound | null = this.soundlist.head(); sound !== null; sound = this.soundlist.next()) {
            if (sound.field420 !== -1 || sound.random !== null) {
                let distance = 0;
                if (x > sound.field436) {
                    distance = x - sound.field436;
                } else if (x < sound.field417) {
                    distance = sound.field417 - x;
                }
                if (z > sound.field430) {
                    distance += z - sound.field430;
                } else if (z < sound.field426) {
                    distance += sound.field426 - z;
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
                        sound.continuousStream.method582(volume);
                    } else if (sound.field420 >= 0 && Client.soundMixer !== null && BgSound.jagFX !== null) {
                        const var7 = JagFX.load(BgSound.jagFX, sound.field420);
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
                        sound.randomStream.method582(volume);
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
                                sound.randomSoundTimer = sound.field435 + (((sound.field425 - sound.field435) * Math.random()) | 0);
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
        const oldSound = this.field420;
        const loc = this.multiloc!.getMultiLoc();
        if (loc === null) {
            this.range = 0;
            this.field435 = 0;
            this.field425 = 0;
            this.random = null;
            this.field420 = -1;
        } else {
            this.range = loc.bgsound_range * 128;
            this.field435 = loc.bgsound_mindelay;
            this.field425 = loc.bgsound_maxdelay;
            this.field420 = loc.bgsound_sound;
            this.random = loc.bgsound_random;
        }
        if (this.field420 !== oldSound && this.continuousStream !== null) {
            Client.soundMixer?.stopStream(this.continuousStream);
            this.continuousStream = null;
        }
    }
}

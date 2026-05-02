import { playWaveStream } from '#3rdparty/audio.js';

import LocType from '#/config/LocType.js';

import Linkable from '#/datastruct/Linkable.js';
import LinkList from '#/datastruct/LinkList.js';

import type Js5 from '#/js5/Js5.js';
import JagFX from '#/sound/JagFX.js';

type WaveHandle = {
    ended: boolean;
    setVolume(value: number): void;
    stop(): void;
};

export default class BgSound extends Linkable {
    static soundlist: LinkList<BgSound> = new LinkList();
    static jagFX: Js5 | null = null;
    static ambientVolume: number = 0;
    static ambientEnabled: boolean = true;

    level: number = 0;
    field417: number = 0;
    field420: number = -1;
    range: number = 0;
    continuousStream: WaveHandle | null = null;
    field425: number = 0;
    field426: number = 0;
    random: Int32Array | null = null;
    field430: number = 0;
    randomStream: WaveHandle | null = null;
    multiloc: LocType | null = null;
    field435: number = 0;
    field436: number = 0;
    randomSoundTimer: number = 0;

    private continuousPending: boolean = false;
    private randomPending: boolean = false;

    static reset(): void {
        for (let sound: BgSound | null = this.soundlist.head(); sound !== null; sound = this.soundlist.next()) {
            sound.stopContinuous();
            sound.stopRandom();
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

                if (sound.range < distance - 64 || !this.ambientEnabled || sound.level !== level) {
                    sound.stopContinuous();
                    sound.stopRandom();
                } else {
                    distance -= 64;
                    if (distance < 0) {
                        distance = 0;
                    }
                    const volume = Math.pow(10, this.ambientVolume / 20) * ((sound.range - distance) / sound.range);
                    if (sound.continuousStream !== null) {
                        sound.continuousStream.setVolume(volume);
                    } else if (!sound.continuousPending && sound.field420 >= 0) {
                        sound.startContinuous(volume);
                    }

                    if (sound.randomStream !== null) {
                        sound.randomStream.setVolume(volume);
                        if (sound.randomStream.ended) {
                            sound.randomStream = null;
                        }
                    } else if (!sound.randomPending && sound.random !== null && (sound.randomSoundTimer -= delta) <= 0) {
                        sound.startRandom(volume);
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
        if (this.field420 !== oldSound) {
            this.stopContinuous();
        }
    }

    private startContinuous(volume: number): void {
        if (BgSound.jagFX === null) {
            return;
        }

        const soundId = this.field420;
        const sound = JagFX.load(BgSound.jagFX, soundId);
        if (sound === null) {
            return;
        }
        const buf = sound.getWave(1);

        const data = buf.data.slice(0, buf.pos);
        this.continuousPending = true;
        void playWaveStream(data, volume, true).then((stream: WaveHandle) => {
            if (!this.continuousPending || this.field420 !== soundId) {
                stream.stop();
                return;
            }
            this.continuousPending = false;
            this.continuousStream = stream;
        }).catch(() => {
            this.continuousPending = false;
        });
    }

    private startRandom(volume: number): void {
        if (BgSound.jagFX === null) {
            return;
        }

        const random = this.random;
        if (random === null) {
            return;
        }

        const soundId = random[(random.length * Math.random()) | 0];
        const sound = JagFX.load(BgSound.jagFX, soundId);
        if (sound === null) {
            return;
        }
        const buf = sound.getWave(1);

        const data = buf.data.slice(0, buf.pos);
        this.randomPending = true;
        void playWaveStream(data, volume, false).then((stream: WaveHandle) => {
            if (!this.randomPending) {
                stream.stop();
                return;
            }
            this.randomPending = false;
            this.randomSoundTimer = this.field435 + (((this.field425 - this.field435) * Math.random()) | 0);
            this.randomStream = stream;
        }).catch(() => {
            this.randomPending = false;
        });
    }

    private stopContinuous(): void {
        this.continuousPending = false;
        if (this.continuousStream !== null) {
            this.continuousStream.stop();
            this.continuousStream = null;
        }
    }

    private stopRandom(): void {
        this.randomPending = false;
        if (this.randomStream !== null) {
            this.randomStream.stop();
            this.randomStream = null;
        }
    }
}

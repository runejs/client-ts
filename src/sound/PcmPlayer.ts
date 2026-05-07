import MidiStream from '#/midi2/MidiStream.js';
import PcmPlayerBase from '#/sound/PcmPlayerBase.js';
import PcmStream from '#/sound/PcmStream.js';

export default abstract class PcmPlayer extends PcmPlayerBase {
    static samples: Int32Array | null = new Int32Array(256);
    static frequency: number = 0;
    static lastLoopTime: number = 0;
    static activePlayer: PcmPlayerBase | null = null;
    static streamTimeSampleCounter: number = 0;
    static streamTimeMillis: number = 0;
    static stream: PcmStream | null = null;

    availableHistoryIndex: number = 0;
    reopenTime: number = 0;
    availableThreshold: number = 256;
    skipAcceptedCheck: boolean = false;
    availableSum: number = 0;
    availableMin: number = 0;
    availableMax: number = 0;
    readonly availableHistory: Int32Array = new Int32Array(512);
    emptyBufferCount: number = 0;
    lastAvailable: number = 0;
    capacity: number = 0;
    nextAcceptedCheckTime: number = 0;
    nextWriteTime: number = 0;

    static initGlobal(_component: unknown, _signLink: unknown): void {
        if (PcmPlayer.activePlayer === null) {
            PcmPlayer.activePlayer = new PcmPlayerBase(8000);
            PcmPlayer.frequency = 8000;
            PcmPlayer.lastLoopTime = Date.now();
        }
    }

    static init(arg0: unknown, arg1: boolean): boolean {
        return MidiStream.init(arg0, arg1);
    }

    static unload(): void {
        PcmPlayer.samples = null;
    }

    static loop(): void {
        if (PcmPlayer.activePlayer === null) {
            return;
        }
        const time = Date.now();
        if (time <= PcmPlayer.lastLoopTime) {
            return;
        }
        PcmPlayer.activePlayer.process(time);
        const delta = (time - PcmPlayer.lastLoopTime) | 0;
        PcmPlayer.lastLoopTime = time;
        PcmPlayer.streamTimeMillis += PcmPlayer.frequency * delta;
        const samples = ((PcmPlayer.streamTimeMillis - PcmPlayer.frequency * 2000) / 1000) | 0;
        if (samples > 0) {
            if (PcmPlayer.stream !== null) {
                PcmPlayer.stream.pretendToMix(samples);
            }
            PcmPlayer.streamTimeMillis -= samples * 1000;
        }
    }

    static shutdown(): void {
        if (PcmPlayer.activePlayer !== null) {
            PcmPlayer.activePlayer.play();
            PcmPlayer.activePlayer = null;
        }
    }

    static skipSamples(): void {
        if (PcmPlayer.stream !== null) {
            PcmPlayer.stream.pretendToMix(256);
        }
        PcmPlayer.updateStreamTime(256);
    }

    static playStream(arg0: PcmStream): void {
        PcmPlayer.stream = arg0;
    }

    static updateStreamTime(arg0: number): void {
        for (PcmPlayer.streamTimeSampleCounter += arg0; PcmPlayer.streamTimeSampleCounter >= PcmPlayer.frequency; PcmPlayer.streamTimeSampleCounter -= PcmPlayer.frequency) {
            PcmPlayer.streamTimeMillis -= PcmPlayer.streamTimeMillis >> 2;
        }
        PcmPlayer.streamTimeMillis -= arg0 * 1000;
        if (PcmPlayer.streamTimeMillis < 0) {
            PcmPlayer.streamTimeMillis = 0;
        }
    }

    skip(arg0: number): void {
        this.init(this.capacity);
        while (true) {
            const var3 = this.queued();
            if (var3 < this.availableThreshold) {
                this.emptyBufferCount = 0;
                this.lastAvailable = 0;
                this.nextWriteTime = arg0;
                this.nextAcceptedCheckTime = arg0;
                return;
            }
            this.write();
        }
    }

    process0(arg0: number): void {
        if (this.reopenTime !== 0) {
            while (true) {
                if (this.nextWriteTime >= arg0) {
                    if (arg0 < this.reopenTime) {
                        return;
                    }
                    try {
                        this.skip(arg0);
                    } catch (_e) {
                        this.close();
                        this.reopenTime += 5000;
                        return;
                    }
                    this.reopenTime = 0;
                    break;
                }
                PcmPlayer.skipSamples();
                this.nextWriteTime += (256000 / PcmPlayer.frequency) | 0;
            }
        }
        while (this.nextWriteTime < arg0) {
            this.nextWriteTime += (250880 / PcmPlayer.frequency) | 0;
            let var3: number;
            try {
                var3 = this.queued();
            } catch (_e) {
                this.close();
                this.reopenTime = arg0;
                return;
            }
            this.recordAvailable(var3);
            let var4 = ((this.availableSum * 3 / 512) | 0) - this.availableMin * 2;
            if (var4 < 0) {
                var4 = 0;
            } else if (var4 > this.availableMax) {
                var4 = this.availableMax;
            }
            this.availableThreshold = this.capacity - var4 - 256;
            if (this.availableThreshold < 256) {
                this.availableThreshold = 256;
            }
            if (this.capacity < 16384) {
                if (var3 >= this.capacity) {
                    this.emptyBufferCount += 5;
                    if (this.emptyBufferCount >= 100) {
                        this.close();
                        this.capacity += 2048;
                        this.reopenTime = arg0;
                        return;
                    }
                } else if (this.lastAvailable !== var3 && this.emptyBufferCount > 0) {
                    this.emptyBufferCount--;
                }
            }
            this.lastAvailable = var3;
            if (var3 < this.availableThreshold) {
                break;
            }
            try {
                this.write();
            } catch (_e) {
                this.close();
                this.reopenTime = arg0;
                return;
            }
            this.nextAcceptedCheckTime = arg0;
            this.lastAvailable -= 256;
        }
        if (arg0 < this.nextAcceptedCheckTime + 5000) {
            return;
        }
        this.close();
        this.reopenTime = arg0;
        for (let var5 = 0; var5 < 512; var5++) {
            this.availableHistory[var5] = 0;
        }
        this.availableMin = this.availableMax = this.availableSum = 0;
    }

    constructor(arg0: number) {
        super(arg0);
    }

    start(_signLink: unknown, arg1: number): void {
        this.capacity = arg1;
        this.skip(Date.now());
    }

    override play(): void {
        this.skipAcceptedCheck = true;
    }

    run(): void {
        while (true) {
            if (this.skipAcceptedCheck) {
                if (this.reopenTime === 0) {
                    this.close();
                }
                this.skipAcceptedCheck = false;
                return;
            }
            this.process(Date.now());
        }
    }

    override process(arg0: number): void {
        this.process0(arg0);
        if (this.nextWriteTime < arg0) {
            this.nextWriteTime = arg0;
        }
    }

    recordAvailable(arg0: number): void {
        const var2 = arg0 - this.availableThreshold;
        const var3 = this.availableHistory[this.availableHistoryIndex];
        this.availableHistory[this.availableHistoryIndex] = var2;
        this.availableSum += var2 - var3;
        const var4 = this.availableHistoryIndex + 1 & 0x1FF;
        if (var2 > this.availableMax) {
            this.availableMax = var2;
        }
        if (var2 < this.availableMin) {
            this.availableMin = var2;
        }
        if (this.availableMax === var3) {
            let var5 = var2;
            for (let var6 = var4; this.availableHistoryIndex !== var6 && var5 < this.availableMax; var6 = var6 + 1 & 0x1FF) {
                const var7 = this.availableHistory[var6];
                if (var7 > var5) {
                    var5 = var7;
                }
            }
            this.availableMax = var5;
        }
        if (this.availableMin === var3) {
            let var8 = var2;
            for (let var9 = var4; this.availableHistoryIndex !== var9 && var8 > this.availableMin; var9 = var9 + 1 & 0x1FF) {
                const var10 = this.availableHistory[var9];
                if (var10 < var8) {
                    var8 = var10;
                }
            }
            this.availableMin = var8;
        }
        this.availableHistoryIndex = var4;
    }

    abstract init(arg0: number): void;

    abstract close(): void;

    abstract write(): void;

    abstract queued(): number;
}

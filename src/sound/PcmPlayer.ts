import MidiStream from '#/midi2/MidiStream.js';
import PcmPlayerBase from '#/sound/PcmPlayerBase.js';
import PcmStream from '#/sound/PcmStream.js';

export default abstract class PcmPlayer extends PcmPlayerBase {
    static samples: Int32Array | null = new Int32Array(256);
    static frequency: number = 0;
    static field462: number = 0;
    static field217: PcmPlayerBase | null = null;
    static field3140: number = 0;
    static field1157: number = 0;
    static stream: PcmStream | null = null;

    field2343: number = 0;
    reopenTime: number = 0;
    field2345: number = 256;
    skipAcceptedCheck: boolean = false;
    field2346: number = 0;
    field2340: number = 0;
    field2342: number = 0;
    readonly field2351: Int32Array = new Int32Array(512);
    field2341: number = 0;
    field2348: number = 0;
    capacity: number = 0;
    nextAcceptedCheckTime: number = 0;
    field2350: number = 0;

    static method1050(_component: unknown, _signLink: unknown): void {
        if (PcmPlayer.field217 === null) {
            PcmPlayer.field217 = new PcmPlayerBase(8000);
            PcmPlayer.frequency = 8000;
            PcmPlayer.field462 = Date.now();
        }
    }

    static init(arg0: unknown, arg1: boolean): boolean {
        return MidiStream.init(arg0, arg1);
    }

    static unload(): void {
        PcmPlayer.samples = null;
    }

    static loop(): void {
        if (PcmPlayer.field217 === null) {
            return;
        }
        const time = Date.now();
        if (time <= PcmPlayer.field462) {
            return;
        }
        PcmPlayer.field217.method255(time);
        const delta = (time - PcmPlayer.field462) | 0;
        PcmPlayer.field462 = time;
        PcmPlayer.field1157 += PcmPlayer.frequency * delta;
        const samples = ((PcmPlayer.field1157 - PcmPlayer.frequency * 2000) / 1000) | 0;
        if (samples > 0) {
            if (PcmPlayer.stream !== null) {
                PcmPlayer.stream.pretendToMix(samples);
            }
            PcmPlayer.field1157 -= samples * 1000;
        }
    }

    static method967(): void {
        if (PcmPlayer.field217 !== null) {
            PcmPlayer.field217.play();
            PcmPlayer.field217 = null;
        }
    }

    static method260(): void {
        if (PcmPlayer.stream !== null) {
            PcmPlayer.stream.pretendToMix(256);
        }
        PcmPlayer.method949(256);
    }

    static playStream(arg0: PcmStream): void {
        PcmPlayer.stream = arg0;
    }

    static method949(arg0: number): void {
        for (PcmPlayer.field3140 += arg0; PcmPlayer.field3140 >= PcmPlayer.frequency; PcmPlayer.field3140 -= PcmPlayer.frequency) {
            PcmPlayer.field1157 -= PcmPlayer.field1157 >> 2;
        }
        PcmPlayer.field1157 -= arg0 * 1000;
        if (PcmPlayer.field1157 < 0) {
            PcmPlayer.field1157 = 0;
        }
    }

    skip(arg0: number): void {
        this.init(this.capacity);
        while (true) {
            const var3 = this.queued();
            if (var3 < this.field2345) {
                this.field2341 = 0;
                this.field2348 = 0;
                this.field2350 = arg0;
                this.nextAcceptedCheckTime = arg0;
                return;
            }
            this.write();
        }
    }

    method817(arg0: number): void {
        if (this.reopenTime !== 0) {
            while (true) {
                if (this.field2350 >= arg0) {
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
                PcmPlayer.method260();
                this.field2350 += (256000 / PcmPlayer.frequency) | 0;
            }
        }
        while (this.field2350 < arg0) {
            this.field2350 += (250880 / PcmPlayer.frequency) | 0;
            let var3: number;
            try {
                var3 = this.queued();
            } catch (_e) {
                this.close();
                this.reopenTime = arg0;
                return;
            }
            this.method819(var3);
            let var4 = ((this.field2346 * 3 / 512) | 0) - this.field2340 * 2;
            if (var4 < 0) {
                var4 = 0;
            } else if (var4 > this.field2342) {
                var4 = this.field2342;
            }
            this.field2345 = this.capacity - var4 - 256;
            if (this.field2345 < 256) {
                this.field2345 = 256;
            }
            if (this.capacity < 16384) {
                if (var3 >= this.capacity) {
                    this.field2341 += 5;
                    if (this.field2341 >= 100) {
                        this.close();
                        this.capacity += 2048;
                        this.reopenTime = arg0;
                        return;
                    }
                } else if (this.field2348 !== var3 && this.field2341 > 0) {
                    this.field2341--;
                }
            }
            this.field2348 = var3;
            if (var3 < this.field2345) {
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
            this.field2348 -= 256;
        }
        if (arg0 < this.nextAcceptedCheckTime + 5000) {
            return;
        }
        this.close();
        this.reopenTime = arg0;
        for (let var5 = 0; var5 < 512; var5++) {
            this.field2351[var5] = 0;
        }
        this.field2340 = this.field2342 = this.field2346 = 0;
    }

    constructor(arg0: number) {
        super(arg0);
    }

    method818(_signLink: unknown, arg1: number): void {
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
            this.method255(Date.now());
        }
    }

    override method255(arg0: number): void {
        this.method817(arg0);
        if (this.field2350 < arg0) {
            this.field2350 = arg0;
        }
    }

    method819(arg0: number): void {
        const var2 = arg0 - this.field2345;
        const var3 = this.field2351[this.field2343];
        this.field2351[this.field2343] = var2;
        this.field2346 += var2 - var3;
        const var4 = this.field2343 + 1 & 0x1FF;
        if (var2 > this.field2342) {
            this.field2342 = var2;
        }
        if (var2 < this.field2340) {
            this.field2340 = var2;
        }
        if (this.field2342 === var3) {
            let var5 = var2;
            for (let var6 = var4; this.field2343 !== var6 && var5 < this.field2342; var6 = var6 + 1 & 0x1FF) {
                const var7 = this.field2351[var6];
                if (var7 > var5) {
                    var5 = var7;
                }
            }
            this.field2342 = var5;
        }
        if (this.field2340 === var3) {
            let var8 = var2;
            for (let var9 = var4; this.field2343 !== var9 && var8 > this.field2340; var9 = var9 + 1 & 0x1FF) {
                const var10 = this.field2351[var9];
                if (var10 < var8) {
                    var8 = var10;
                }
            }
            this.field2340 = var8;
        }
        this.field2343 = var4;
    }

    abstract init(arg0: number): void;

    abstract close(): void;

    abstract write(): void;

    abstract queued(): number;
}

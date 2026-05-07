import MidiStream from '#/sound/MidiStream.js';

export default abstract class MidiPlayer extends MidiStream {
    static field1753: Int32Array = new Int32Array([12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800, 12800]);
    static field1937: Int32Array = new Int32Array(128);
    static globalVolume: number = 256;

    method996(arg0: number, arg1: number, arg2: number): void {
        const var5 = ((arg0 * Math.pow(0.1, arg1 * 5.0E-4) + 0.5) | 0);
        if (MidiPlayer.globalVolume === var5) {
            return;
        }
        MidiPlayer.globalVolume = var5;
        for (let var6 = 0; var6 < 16; var6++) {
            const var7 = MidiPlayer.getPan(var6);
            this.method306(var6 + 176, 7, var7 >> 7, arg2);
            this.method306(var6 + 176, 39, var7 & 0x7F, arg2);
        }
    }

    method997(arg0: number, arg1: number): void {
        MidiPlayer.globalVolume = arg1;
        for (let var4 = 0; var4 < 16; var4++) {
            MidiPlayer.field1753[var4] = 12800;
        }
        for (let var5 = 0; var5 < 16; var5++) {
            const var6 = MidiPlayer.getPan(var5);
            this.method306(var5 + 176, 7, var6 >> 7, arg0);
            this.method306(var5 + 176, 39, var6 & 0x7F, arg0);
        }
    }

    method1000(arg0: number): void {
        for (let var3 = 0; var3 < 128; var3++) {
            const var4 = MidiPlayer.field1937[var3];
            MidiPlayer.field1937[var3] = 0;
            for (let var5 = 0; var5 < 16; var5++) {
                if ((var4 & 0x1 << var5) !== 0) {
                    this.method306(var5 + 144, var3, 0, arg0);
                }
            }
        }
        for (let var6 = 0; var6 < 16; var6++) {
            this.method306(var6 + 176, 123, 0, arg0);
        }
        for (let var7 = 0; var7 < 16; var7++) {
            this.method306(var7 + 176, 120, 0, arg0);
        }
        for (let var8 = 0; var8 < 16; var8++) {
            this.method306(var8 + 176, 121, 0, arg0);
        }
        for (let var9 = 0; var9 < 16; var9++) {
            this.method306(var9 + 176, 0, 0, arg0);
        }
        for (let var10 = 0; var10 < 16; var10++) {
            this.method306(var10 + 176, 32, 0, arg0);
        }
        for (let var11 = 0; var11 < 16; var11++) {
            this.method306(var11 + 192, 0, 0, arg0);
        }
    }

    loadAndQueuePatches(arg0: number, arg1: number, arg2: number, arg3: number): boolean {
        if ((arg0 & 0xE0) === 128) {
            const var6 = 0x1 << (arg0 & 0xF);
            const var7 = MidiPlayer.field1937[arg1];
            if (arg0 < 144 || arg2 === 0) {
                MidiPlayer.field1937[arg1] = var7 & ~var6;
            } else if ((var7 & var6) === 0) {
                MidiPlayer.field1937[arg1] = var7 | var6;
            } else {
                this.method306(arg0, arg1, 0, arg3);
            }
            return false;
        }
        if ((arg0 & 0xF0) === 176) {
            if (arg1 === 121) {
                this.method306(arg0, arg1, arg2, arg3);
                const var8 = arg0 & 0xF;
                MidiPlayer.field1753[var8] = 12800;
                const var9 = MidiPlayer.getPan(var8);
                this.method306(arg0, 7, var9 >> 7, arg3);
                this.method306(arg0, 39, var9 & 0x7F, arg3);
                return true;
            }
            if (arg1 === 7 || arg1 === 39) {
                const var10 = arg0 & 0xF;
                if (arg1 === 7) {
                    MidiPlayer.field1753[var10] = (arg2 << 7) + (MidiPlayer.field1753[var10] & 0x7F);
                } else {
                    MidiPlayer.field1753[var10] = (MidiPlayer.field1753[var10] & 0x3F80) + arg2;
                }
                const var11 = MidiPlayer.getPan(var10);
                this.method306(arg0, 7, var11 >> 7, arg3);
                this.method306(arg0, 39, var11 & 0x7F, arg3);
                return true;
            }
        }
        return false;
    }

    static getPan(arg0: number): number {
        const var1 = MidiPlayer.field1753[arg0];
        const var2 = (MidiPlayer.globalVolume * var1 >> 8) * var1;
        return (Math.sqrt(var2) + 0.5) | 0;
    }

    abstract method306(arg0: number, arg1: number, arg2: number, arg3: number): void;
}

import Packet from '#/io/Packet.js';

export default class MidiParser {
    packet: Packet = new Packet(new Uint8Array(0));
    baseTime: number = 0;
    trackCurrentPos: Int32Array = new Int32Array(0);
    trackStartPos: Int32Array = new Int32Array(0);
    trackCurrentTick: Int32Array = new Int32Array(0);
    trackCurrentStatus: Int32Array = new Int32Array(0);
    static msgLen: Int8Array | null = new Int8Array([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    tempo: number = 0;
    division: number = 0;

    static unload(): void {
        MidiParser.msgLen = null;
    }

    nextTrackToPlay(): number {
        const var1 = this.trackCurrentPos.length;
        let var2 = -1;
        let var3 = 2147483647;
        for (let var4 = 0; var4 < var1; var4++) {
            if (this.trackCurrentPos[var4] >= 0 && this.trackCurrentTick[var4] < var3) {
                var2 = var4;
                var3 = this.trackCurrentTick[var4];
            }
        }
        return var2;
    }

    timeFromTick(arg0: number): number {
        return this.tempo * arg0 + this.baseTime;
    }

    getEvent(arg0: number): number {
        return this.getEvent2(arg0);
    }

    getTrackCount(): number {
        return this.trackCurrentPos.length;
    }

    processDeltaTime(arg0: number): void {
        const var2 = this.packet.gMidiVarLen();
        this.trackCurrentTick[arg0] += var2;
    }

    dropMidi(): void {
        this.packet = new Packet(new Uint8Array(0));
        this.trackStartPos = new Int32Array(0);
        this.trackCurrentPos = new Int32Array(0);
        this.trackCurrentTick = new Int32Array(0);
        this.trackCurrentStatus = new Int32Array(0);
    }

    setMidi(arg0: Uint8Array): void {
        this.packet = new Packet(arg0);
        this.packet.pos = 10;
        const var2 = this.packet.g2();
        this.division = this.packet.g2();
        this.tempo = 500000;
        this.trackStartPos = new Int32Array(var2);
        let var3 = 0;
        while (var3 < var2) {
            const var4 = this.packet.g4();
            const var5 = this.packet.g4();
            if (var4 === 1297379947) {
                this.trackStartPos[var3] = this.packet.pos;
                var3++;
            }
            this.packet.pos += var5;
        }
        this.trackCurrentPos = new Int32Array(this.trackStartPos);
        this.trackCurrentTick = new Int32Array(var2);
        this.trackCurrentStatus = new Int32Array(var2);
    }

    gotMidi(): boolean {
        return this.packet.length !== 0;
    }

    method343(): boolean {
        return this.packet.pos < 0;
    }

    restart(arg0: number): void {
        this.baseTime = arg0;
        const var3 = this.trackCurrentPos.length;
        for (let var4 = 0; var4 < var3; var4++) {
            this.trackCurrentTick[var4] = 0;
            this.trackCurrentStatus[var4] = 0;
            this.packet.pos = this.trackStartPos[var4];
            this.processDeltaTime(var4);
            this.trackCurrentPos[var4] = this.packet.pos;
        }
    }

    method345(arg0: number): void {
        this.trackCurrentPos[arg0] = this.packet.pos;
    }

    getEvent2(arg0: number): number {
        const var2 = this.packet.data[this.packet.pos];
        let var3: number;
        if ((var2 & 0x80) !== 0) {
            var3 = var2 & 0xFF;
            this.trackCurrentStatus[arg0] = var3;
            this.packet.pos++;
        } else {
            var3 = this.trackCurrentStatus[arg0];
        }
        if (var3 !== 240 && var3 !== 247) {
            return this.getEvent3(arg0, var3);
        }
        const var4 = this.packet.gMidiVarLen();
        if (var3 === 247 && var4 > 0) {
            const var5 = this.packet.data[this.packet.pos] & 0xFF;
            if (var5 >= 241 && var5 <= 243 || var5 === 246 || var5 === 248 || var5 >= 250 && var5 <= 252 || var5 === 254) {
                this.packet.pos++;
                this.trackCurrentStatus[arg0] = var5;
                return this.getEvent3(arg0, var5);
            }
        }
        this.packet.pos += var4;
        return 0;
    }

    getEvent3(arg0: number, arg1: number): number {
        if (arg1 !== 255) {
            const var7 = MidiParser.msgLen![arg1 - 128];
            let var8 = arg1;
            if (var7 >= 1) {
                var8 = arg1 | this.packet.g1() << 8;
            }
            if (var7 >= 2) {
                var8 |= this.packet.g1() << 16;
            }
            return var8;
        }
        const var3 = this.packet.g1();
        let var4 = this.packet.gMidiVarLen();
        if (var3 === 47) {
            this.packet.pos += var4;
            return 1;
        } else if (var3 === 81) {
            const var5 = this.packet.g3();
            var4 -= 3;
            const var6 = this.trackCurrentTick[arg0];
            this.baseTime += (this.tempo - var5) * var6;
            this.tempo = var5;
            this.packet.pos += var4;
            return 2;
        } else {
            this.packet.pos += var4;
            return 3;
        }
    }

    allTracksFinished(): boolean {
        const var1 = this.trackCurrentPos.length;
        for (let var2 = 0; var2 < var1; var2++) {
            if (this.trackCurrentPos[var2] >= 0) {
                return false;
            }
        }
        return true;
    }

    finishTrack(): void {
        this.packet.pos = -1;
    }

    method350(arg0: number): void {
        this.packet.pos = this.trackCurrentPos[arg0];
    }
}

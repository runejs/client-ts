import { playMidi, setMidiVolume, stopMidi } from '#3rdparty/tinymidipcm.js';

import MidiManager from '#/sound/MidiManager.js';

export default abstract class MidiStream {
    static method734(arg0: unknown, arg1: boolean): boolean {
        MidiManager.field1548 = 20;
        if (arg1) {
            MidiManager.field311 = new TinyMidiPlayer(arg0);
            return true;
        } else {
            return false;
        }
    }

    abstract method307(arg0: Uint8Array, arg1: boolean, arg2: number): void;

    abstract method304(arg0: number): void;

    abstract method308(): void;

    abstract method305(): void;

    abstract method302(arg0: number, arg1: number): void;

    abstract method303(): void;
}

export class TinyMidiPlayer extends MidiStream {
    readonly field1045: unknown;
    field1008: boolean = false;
    field1009: unknown = null;
    field1033: number = 0;
    field1025: boolean = false;
    field1039: Uint8Array | null = null;

    override method304(_volume: number): void {
    }

    override method305(): void {
        if (this.field1008) {
            stopMidi(false);
            this.field1008 = false;
        }
        this.field1009 = null;
    }

    override method308(): void {
        if (this.field1009 === null) {
            return;
        }
        if (this.field1039 !== null) {
            playMidi(this.field1039, this.field1033 / 100, false);
            this.field1008 = true;
        }
        this.field1009 = null;
        this.field1039 = null;
    }

    override method303(): void {
    }

    override method302(arg0: number, arg1: number): void {
        if (arg0 === 0) {
            arg0 = 1;
        }
        const var3 = MidiManager.method632(arg0) - arg1;
        if (this.field1009 !== null) {
            this.field1033 = var3;
        } else if (this.field1008) {
            setMidiVolume(var3 / 100);
        }
    }

    override method307(arg0: Uint8Array, arg1: boolean, arg2: number): void {
        this.field1009 = {};
        if (arg2 === 0) {
            arg2 = 1;
        }
        this.field1033 = MidiManager.method632(arg2);
        this.field1039 = arg0;
        this.field1025 = arg1;
    }

    constructor(arg0: unknown) {
        super();
        this.field1045 = arg0;
    }
}

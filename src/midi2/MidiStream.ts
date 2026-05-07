import { playMidi, setMidiVolume, stopMidi } from '#3rdparty/tinymidipcm.js';

import MidiManager from '#/midi2/MidiManager.js';

export default abstract class MidiStream {
    static init(arg0: unknown, arg1: boolean): boolean {
        MidiManager.fadeTicks = 20;
        if (arg1) {
            MidiManager.midiStream = new TinyMidiPlayer(arg0);
            return true;
        } else {
            return false;
        }
    }

    abstract play(arg0: Uint8Array, arg1: boolean, arg2: number): void;

    abstract resetVolume(arg0: number): void;

    abstract poll(): void;

    abstract stop(): void;

    abstract setVolume(arg0: number, arg1: number): void;

    abstract closeStream(): void;
}

export class TinyMidiPlayer extends MidiStream {
    readonly signLink: unknown;
    playing: boolean = false;
    fileRequest: unknown = null;
    volume: number = 0;
    loop: boolean = false;
    midiData: Uint8Array | null = null;

    override resetVolume(_volume: number): void {
    }

    override stop(): void {
        if (this.playing) {
            stopMidi(false);
            this.playing = false;
        }
        this.fileRequest = null;
    }

    override poll(): void {
        if (this.fileRequest === null) {
            return;
        }
        if (this.midiData !== null) {
            playMidi(this.midiData, this.volume / 100, false);
            this.playing = true;
        }
        this.fileRequest = null;
        this.midiData = null;
    }

    override closeStream(): void {
    }

    override setVolume(arg0: number, arg1: number): void {
        if (arg0 === 0) {
            arg0 = 1;
        }
        const var3 = MidiManager.volumeToDecibels(arg0) - arg1;
        if (this.fileRequest !== null) {
            this.volume = var3;
        } else if (this.playing) {
            setMidiVolume(var3 / 100);
        }
    }

    override play(arg0: Uint8Array, arg1: boolean, arg2: number): void {
        this.fileRequest = {};
        if (arg2 === 0) {
            arg2 = 1;
        }
        this.volume = MidiManager.volumeToDecibels(arg2);
        this.midiData = arg0;
        this.loop = arg1;
    }

    constructor(arg0: unknown) {
        super();
        this.signLink = arg0;
    }
}

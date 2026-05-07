import PcmStreamable from '#/sound/PcmStreamable.js';

export default class Wave extends PcmStreamable {
    samples: Int8Array;
    loopStartPosition: number;
    loopEndPosition: number;
    samplingFrequency: number = 22050;

    decimate(_decimator: unknown): Wave {
        return this;
    }

    constructor(arg0: number, arg1: Int8Array, arg2: number, arg3: number) {
        super();
        this.samplingFrequency = arg0;
        this.samples = arg1;
        this.loopStartPosition = arg2;
        this.loopEndPosition = arg3;
    }
}

import Linkable from '#/datastruct/Linkable.js';

import PcmStreamable from '#/sound/PcmStreamable.js';

export default abstract class PcmStream extends Linkable {
    mixed: boolean = false;
    streamable: PcmStreamable | null = null;

    priority(): number {
        return 255;
    }

    abstract pretendToMix(arg0: number): void;

    abstract doMix(arg0: Int32Array | number[], arg1: number, arg2: number): number;
}

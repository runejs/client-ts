import Linkable from '#/datastruct/Linkable.js';

import Mixer from '#/sound/Mixer.js';

export default abstract class PcmMixerListener extends Linkable {
    field2114: number = 0;

    abstract method742(): void;

    abstract method743(arg0: Mixer): number;
}

import Linkable from '#/datastruct/Linkable.js';

import Mixer from '#/sound/Mixer.js';

export default abstract class PcmMixerListener extends Linkable {
    remainingSamples: number = 0;

    abstract remove(): void;

    abstract update(arg0: Mixer): number;
}

import AnimBase from '#/dash3d/AnimBase.js';
import AnimFrame from '#/dash3d/AnimFrame.js';

import type Js5 from '#/js5/Js5.js';

export default class AnimFrameSet {
    list: (AnimFrame | null)[];

    static load(anims: Js5, id: number, bases: Js5): AnimFrameSet | null {
        let ready = true;
        const files = anims.getFileList(id);
        for (let i = 0; i < files.length; i++) {
            const frame = anims.peekFile(files[i], id);
            if (frame === null) {
                ready = false;
            } else {
                const baseId = (frame[1] & 0xff) | ((frame[0] & 0xff) << 8);
                if (bases.peekFile(0, baseId) === null) {
                    ready = false;
                }
            }
        }

        if (!ready) {
            return null;
        }

        try {
            return new AnimFrameSet(anims, bases, id);
        } catch (_e) {
            return null;
        }
    }

    constructor(anims: Js5, bases: Js5, id: number) {
        const baseCache: AnimBase[] = [];
        this.list = new Array(anims.getFileIdLimit(id)).fill(null);
        const files = anims.getFileList(id);
        for (let i = 0; i < files.length; i++) {
            const frame = anims.getFile(files[i], id);
            if (!frame) {
                continue;
            }

            let base: AnimBase | null = null;
            const baseId = (frame[1] & 0xff) | ((frame[0] & 0xff) << 8);
            for (let j = 0; j < baseCache.length; j++) {
                if (baseCache[j].id === baseId) {
                    base = baseCache[j];
                    break;
                }
            }

            if (base === null) {
                const baseData = bases.peekFile(0, baseId);
                if (!baseData) {
                    continue;
                }

                base = new AnimBase(baseId, baseData);
                baseCache.push(base);
            }

            this.list[files[i]] = new AnimFrame(frame, base);
        }
    }

    getAnimateTransparencies(id: number): boolean {
        return this.list[id]?.animateTransparencies ?? false;
    }
}

import { sleep } from '#/util/JsUtil.js';

export default class ThreadSleep {
    static async sleepPrecise(duration: number): Promise<void> {
        if (duration <= 0) {
            return;
        }
        if (duration % 10 === 0) {
            await ThreadSleep.sleep(duration - 1);
            await ThreadSleep.sleep(1);
        } else {
            await ThreadSleep.sleep(duration);
        }
    }

    static async sleep(duration: number): Promise<void> {
        try {
            await sleep(duration);
        } catch (_e) {
        }
    }
}

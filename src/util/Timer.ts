import ThreadSleep from '#/util/ThreadSleep.js';

export default abstract class Timer {
    static create(): Timer {
        return new OriginTimer();
    }

    abstract count(interval: number, minimumDelay: number): Promise<number>;

    abstract init(): void;

    abstract reset(): void;
}

export class OriginTimer extends Timer {
    ntime: number = 0;

    override reset(): void {
        this.init();
    }

    override init(): void {
        this.ntime = performance.now() * 1000;
    }

    override async count(interval: number, minimumDelay: number): Promise<number> {
        let sleepTime: number = minimumDelay * 1000;
        const remainingTime: number = this.ntime - performance.now() * 1000;
        if (remainingTime > sleepTime) {
            sleepTime = remainingTime;
        }
        await ThreadSleep.sleepPrecise(sleepTime / 1000);
        const time: number = performance.now() * 1000;
        let loops: number;
        for (loops = 0; loops < 10 && (loops < 1 || this.ntime < time); loops++) {
            this.ntime += interval * 1000;
        }
        if (this.ntime < time) {
            this.ntime = time;
        }
        return loops;
    }

    constructor() {
        super();
        this.init();
    }
}

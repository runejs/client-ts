export default class MonotonicTime {
    static leapMillis: number = 0;
    static previous: number = 0;

    static currentTime(): number {
        const time: number = Date.now();
        if (MonotonicTime.leapMillis > time) {
            MonotonicTime.previous += MonotonicTime.leapMillis - time;
        }
        MonotonicTime.leapMillis = time;
        return MonotonicTime.previous + time;
    }
}

export default class Skills {
    static readonly used: boolean[] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false, true, false, false];
    static readonly skillxp: Int32Array = new Int32Array(99);
    static readonly count: number = 25;

    static {
        let acc: number = 0;
        for (let i: number = 0; i < 99; i++) {
            const level: number = i + 1;
            const delta: number = (level + Math.pow(2.0, level / 7.0) * 300.0) | 0;
            acc += delta;
            Skills.skillxp[i] = (acc / 4) | 0;
        }
    }
}

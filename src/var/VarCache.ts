import VarBitType from '#/config/VarBitType.js';

export default class VarCache {
    static mask: Int32Array = new Int32Array(32);
    static var: number[] = new Array(2000).fill(0);
    static varServ: number[] = new Array(2000).fill(0);

    static {
        let value = 2;
        for (let i = 0; i < 32; i++) {
            this.mask[i] = value - 1;
            value += value;
        }
    }

    static getVarbit(id: number): number {
        const varbit = VarBitType.list(id);
        const mask = this.mask[varbit.endbit - varbit.startbit];
        return (this.var[varbit.basevar] >> varbit.startbit) & mask;
    }

    static setVarbit(id: number, value: number): void {
        const varbit = VarBitType.list(id);
        const mask = this.mask[varbit.endbit - varbit.startbit];
        if (value < 0 || value > mask) {
            value = 0;
        }

        const shiftedMask = mask << varbit.startbit;
        this.var[varbit.basevar] = (this.var[varbit.basevar] & ~shiftedMask) | ((value << varbit.startbit) & shiftedMask);
    }
}

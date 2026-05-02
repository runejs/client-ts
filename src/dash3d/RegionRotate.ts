export default class RegionRotate {
    static DX(rotation: number, x: number, z: number): number;
    static DX(locRotation: number, width: number, x: number, length: number, rotation: number, z: number): number;
    static DX(arg0: number, arg1: number, arg2: number, arg3?: number, arg4?: number, arg5?: number): number {
        if (arg3 === undefined || arg4 === undefined || arg5 === undefined) {
            const rotation = arg0 & 0x3;
            if (rotation === 0) {
                return arg1;
            } else if (rotation === 1) {
                return arg2;
            } else if (rotation === 2) {
                return 7 - arg1;
            } else {
                return 7 - arg2;
            }
        }

        let width = arg1;
        const x = arg2;
        let length = arg3;
        const rotation = arg4 & 0x3;
        const z = arg5;
        if ((arg0 & 0x1) === 1) {
            const tmp = width;
            width = length;
            length = tmp;
        }
        if (rotation === 0) {
            return x;
        } else if (rotation === 1) {
            return z;
        } else if (rotation === 2) {
            return 8 - x - width;
        } else {
            return 8 - z - length;
        }
    }

    static DZ(z: number, x: number, rotation: number): number;
    static DZ(z: number, length: number, x: number, width: number, rotation: number, locRotation: number): number;
    static DZ(arg0: number, arg1: number, arg2: number, arg3?: number, arg4?: number, arg5?: number): number {
        if (arg3 === undefined || arg4 === undefined || arg5 === undefined) {
            const rotation = arg2 & 0x3;
            if (rotation === 0) {
                return arg1;
            } else if (rotation === 1) {
                return 7 - arg0;
            } else if (rotation === 2) {
                return 7 - arg1;
            } else {
                return arg0;
            }
        }

        const z = arg0;
        let length = arg1;
        const x = arg2;
        let width = arg3;
        const rotation = arg4 & 0x3;
        if ((arg5 & 0x1) === 1) {
            const tmp = width;
            width = length;
            length = tmp;
        }
        if (rotation === 0) {
            return z;
        } else if (rotation === 1) {
            return 8 - width - x;
        } else if (rotation === 2) {
            return 8 - z - length;
        } else {
            return x;
        }
    }
}

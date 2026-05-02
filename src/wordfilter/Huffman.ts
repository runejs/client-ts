export default class Huffman {
    keys: Int32Array;
    readonly masks: Int32Array;
    readonly bits: Uint8Array;

    constructor(bits: Uint8Array) {
        this.bits = bits;
        this.masks = new Int32Array(bits.length);
        const codeForLength = new Int32Array(33);
        this.keys = new Int32Array(8);
        let nextKey = 0;

        for (let value = 0; value < bits.length; value++) {
            const bitCount = bits[value];
            if (bitCount === 0) {
                continue;
            }

            const highBit = 1 << (32 - bitCount);
            const code = codeForLength[bitCount];
            this.masks[value] = code;

            let nextCode: number;
            if ((code & highBit) === 0) {
                for (let i = bitCount - 1; i >= 1; i--) {
                    const previous = codeForLength[i];
                    if (previous !== code) {
                        break;
                    }

                    const bit = 1 << (32 - i);
                    if ((previous & bit) !== 0) {
                        codeForLength[i] = codeForLength[i - 1];
                        break;
                    }

                    codeForLength[i] = previous | bit;
                }
                nextCode = code | highBit;
            } else {
                nextCode = codeForLength[bitCount - 1];
            }

            codeForLength[bitCount] = nextCode;
            for (let i = bitCount + 1; i <= 32; i++) {
                if (codeForLength[i] === code) {
                    codeForLength[i] = nextCode;
                }
            }

            let key = 0;
            for (let bit = 0; bit < bitCount; bit++) {
                const mask = -2147483648 >>> bit;
                if ((code & mask) === 0) {
                    key++;
                } else {
                    if (this.keys[key] === 0) {
                        this.keys[key] = nextKey;
                    }
                    key = this.keys[key];
                }

                if (this.keys.length <= key) {
                    const expanded = new Int32Array(this.keys.length * 2);
                    expanded.set(this.keys);
                    this.keys = expanded;
                }
            }

            if (key >= nextKey) {
                nextKey = key + 1;
            }
            this.keys[key] = ~value;
        }
    }

    decode(src: Uint8Array | Int8Array, length: number, dstOff: number, dst: Uint8Array, srcOff: number): number {
        if (length === 0) {
            return 0;
        }

        const end = length;
        let key = 0;
        let pos = srcOff;
        while (true) {
            const value = src[pos] & 0xff;
            key = (value & 0x80) === 0 ? key + 1 : this.keys[key];
            let leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x40) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x20) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x10) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x8) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x4) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x2) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            key = (value & 0x1) === 0 ? key + 1 : this.keys[key];
            leaf = this.keys[key];
            if (leaf < 0) {
                dst[dstOff++] = ~leaf;
                if (dstOff >= end) break;
                key = 0;
            }

            pos++;
        }

        return pos + 1 - srcOff;
    }

    encode(srcOff: number, dstOff: number, length: number, src: Uint8Array, dst: Uint8Array | Int8Array): number {
        const end = length;
        let last = 0;
        let bitPos = dstOff << 3;

        while (srcOff < end) {
            const value = src[srcOff] & 0xff;
            const mask = this.masks[value];
            const bitCount = this.bits[value];
            if (bitCount === 0) {
                throw new Error(`No codeword for data value ${value}`);
            }

            let bytePos = bitPos >> 3;
            const bitOffset = bitPos & 0x7;
            bitPos += bitCount;
            const preserved = last & (-bitOffset >> 31);
            const lastByte = bytePos + ((bitOffset + bitCount - 1) >> 3);
            let shift = bitOffset + 24;

            dst[bytePos] = last = preserved | (mask >>> shift);
            if (bytePos < lastByte) {
                bytePos++;
                shift -= 8;
                dst[bytePos] = last = mask >>> shift;
                if (bytePos < lastByte) {
                    bytePos++;
                    shift -= 8;
                    dst[bytePos] = last = mask >>> shift;
                    if (bytePos < lastByte) {
                        bytePos++;
                        shift -= 8;
                        dst[bytePos] = last = mask >>> shift;
                        if (bytePos < lastByte) {
                            bytePos++;
                            shift -= 8;
                            dst[bytePos] = last = mask << -shift;
                        }
                    }
                }
            }
            srcOff++;
        }

        return ((bitPos + 7) >> 3) - dstOff;
    }
}

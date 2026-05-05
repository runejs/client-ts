import Isaac from '#/io/Isaac.js';
import Packet from '#/io/Packet.js';

export default class PacketBit extends Packet {
    private static readonly bitmask: Uint32Array = new Uint32Array(33);

    static {
        for (let i: number = 0; i < 32; i++) {
            PacketBit.bitmask[i] = (1 << i) - 1;
        }
        PacketBit.bitmask[32] = 0xffffffff;
    }

    bitPos: number = 0;
    private random: Isaac | null = null;

    seed(n: Int32Array) {
        this.random = new Isaac(n);
    }

    g1Enc() {
        return (this.view.getUint8(this.pos++) - (this.random?.nextInt ?? 0)) & 0xff;
    }

    p1Enc(opcode: number): void {
        this.view.setUint8(this.pos++, (opcode + (this.random?.nextInt ?? 0)) & 0xff);
    }

    gBitStart(): void {
        this.bitPos = this.pos << 3;
    }

    gBitEnd(): void {
        this.pos = (this.bitPos + 7) >>> 3;
    }

    bitsLeft(n: number) {
        return (n * 8) - this.bitPos;
    }

    gBit(n: number): number {
        let bytePos: number = this.bitPos >>> 3;
        let remaining: number = 8 - (this.bitPos & 7);
        let value: number = 0;
        this.bitPos += n;

        for (; n > remaining; remaining = 8) {
            value += (this.view.getUint8(bytePos++) & PacketBit.bitmask[remaining]) << (n - remaining);
            n -= remaining;
        }

        if (n === remaining) {
            value += this.view.getUint8(bytePos) & PacketBit.bitmask[remaining];
        } else {
            value += (this.view.getUint8(bytePos) >>> (remaining - n)) & PacketBit.bitmask[n];
        }

        return value;
    }
}

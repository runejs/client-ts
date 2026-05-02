import Pix3D from '#/dash3d/Pix3D.js';
import Pix8 from '#/graphics/Pix8.js';
import PixLoader from '#/graphics/PixLoader.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class Texture {
    static swapBuffer: Int32Array | null = null;

    readonly animationDirection: number;
    readonly averageRgb: number;
    readonly opaque: boolean;
    readonly fileIds: Int32Array;
    readonly op1: Int32Array | null = null;
    readonly op2: Int32Array | null = null;
    readonly op3: Int32Array;
    readonly animationSpeed: number;
    texels: Int32Array | null = null;
    used: boolean = false;

    constructor(packet: Packet) {
        this.averageRgb = packet.g2();
        this.opaque = packet.g1() === 1;

        const count = packet.g1();
        if (count < 1 || count > 4) {
            throw new Error('Invalid texture file count');
        }

        this.fileIds = new Int32Array(count);
        for (let i = 0; i < count; i++) {
            this.fileIds[i] = packet.g2();
        }

        if (count > 1) {
            this.op1 = new Int32Array(count - 1);
            for (let i = 0; i < count - 1; i++) {
                this.op1[i] = packet.g1();
            }
        }

        if (count > 1) {
            this.op2 = new Int32Array(count - 1);
            for (let i = 0; i < count - 1; i++) {
                this.op2[i] = packet.g1();
            }
        }

        this.op3 = new Int32Array(count);
        for (let i = 0; i < count; i++) {
            this.op3[i] = packet.g4();
        }

        this.animationDirection = packet.g1();
        this.animationSpeed = packet.g1();
    }

    loadTexture(brightness: number, resolution: number, sprites: Js5): boolean {
        for (let i = 0; i < this.fileIds.length; i++) {
            if (sprites.peekFile(this.fileIds[i]) === null) {
                return false;
            }
        }

        const size = resolution * resolution;
        this.texels = new Int32Array(size * 4);

        for (let i = 0; i < this.fileIds.length; i++) {
            const image: Pix8 | null = PixLoader.makePix8FromJs5Id(sprites, this.fileIds[i], 0);
            if (!image) {
                return false;
            }

            image.trim();
            const palette = image.bpal;
            const transform = this.op3[i];
            if ((transform & 0xff000000) === 0x3000000) {
                const rb = transform & 0xff00ff;
                const g = (transform >> 8) & 0xff;
                for (let p = 0; p < palette.length; p++) {
                    const rgb = palette[p];
                    if ((rgb >> 8) === (rgb & 0xffff)) {
                        const value = rgb & 0xff;
                        palette[p] = ((rb * value) >> 8) & 0xff00ff | (g * value) & 0xff00;
                    }
                }
            }

            for (let p = 0; p < palette.length; p++) {
                palette[p] = Pix3D.gammaCorrect(palette[p], brightness);
            }

            const mode = i === 0 ? 0 : this.op1![i - 1];
            if (mode !== 0) {
                continue;
            }

            if (image.wi === resolution) {
                for (let p = 0; p < size; p++) {
                    this.texels[p] = palette[image.data[p] & 0xff];
                }
            } else if (image.wi === 64 && resolution === 128) {
                let dst = 0;
                for (let y = 0; y < resolution; y++) {
                    for (let x = 0; x < resolution; x++) {
                        this.texels[dst++] = palette[image.data[(x >> 1) + ((y >> 1) << 6)] & 0xff];
                    }
                }
            } else if (image.wi === 128 && resolution === 64) {
                let dst = 0;
                for (let y = 0; y < resolution; y++) {
                    for (let x = 0; x < resolution; x++) {
                        this.texels[dst++] = palette[image.data[(x << 1) + ((y << 1) << 7)] & 0xff];
                    }
                }
            } else {
                throw new Error('Texture resolution mismatch');
            }
        }

        for (let i = 0; i < size; i++) {
            this.texels[i] &= 0xf8f8ff;
            const rgb = this.texels[i];
            this.texels[size + i] = (rgb - (rgb >>> 3)) & 0xf8f8ff;
            this.texels[size * 2 + i] = (rgb - (rgb >>> 2)) & 0xf8f8ff;
            this.texels[size * 3 + i] = (rgb - (rgb >>> 2) - (rgb >>> 3)) & 0xf8f8ff;
        }

        return true;
    }

    unload(): void {
        this.texels = null;
    }

    animate(delta: number): void {
        if (this.texels === null) {
            return;
        }

        if (this.animationDirection === 1 || this.animationDirection === 3) {
            if (Texture.swapBuffer === null || Texture.swapBuffer.length < this.texels.length) {
                Texture.swapBuffer = new Int32Array(this.texels.length);
            }

            const width = this.texels.length === 16384 ? 64 : 128;
            const quarter = this.texels.length / 4;
            let offset = delta * width * this.animationSpeed;
            const mask = quarter - 1;
            if (this.animationDirection === 1) {
                offset = -offset;
            }

            for (let i = 0; i < quarter; i++) {
                const src = (offset + i) & mask;
                Texture.swapBuffer[i] = this.texels[src];
                Texture.swapBuffer[quarter + i] = this.texels[quarter + src];
                Texture.swapBuffer[quarter * 2 + i] = this.texels[quarter * 2 + src];
                Texture.swapBuffer[quarter * 3 + i] = this.texels[quarter * 3 + src];
            }

            const old = this.texels;
            this.texels = Texture.swapBuffer;
            Texture.swapBuffer = old;
        }

        if (this.animationDirection !== 2 && this.animationDirection !== 4) {
            return;
        }

        if (Texture.swapBuffer === null || Texture.swapBuffer.length < this.texels.length) {
            Texture.swapBuffer = new Int32Array(this.texels.length);
        }

        const width = this.texels.length === 16384 ? 64 : 128;
        const quarter = this.texels.length / 4;
        let offset = this.animationSpeed * delta;
        const mask = width - 1;
        if (this.animationDirection === 2) {
            offset = -offset;
        }

        for (let row = 0; row < quarter; row += width) {
            for (let x = 0; x < width; x++) {
                const dst = row + x;
                const src = row + ((offset + x) & mask);
                Texture.swapBuffer[dst] = this.texels[src];
                Texture.swapBuffer[quarter + dst] = this.texels[quarter + src];
                Texture.swapBuffer[quarter * 2 + dst] = this.texels[quarter * 2 + src];
                Texture.swapBuffer[quarter * 3 + dst] = this.texels[quarter * 3 + src];
            }
        }

        const old = this.texels;
        this.texels = Texture.swapBuffer;
        Texture.swapBuffer = old;
    }
}

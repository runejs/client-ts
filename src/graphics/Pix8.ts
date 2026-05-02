import Pix2D from '#/graphics/Pix2D.js';

export default class Pix8 extends Pix2D {
    data: Int8Array;
    bpal: Int32Array; // base palette
    wi: number; // width
    hi: number; // height
    xof: number; // x offset
    yof: number; // y offset
    owi: number; // original width
    ohi: number; // original height

    constructor(width: number = 0, height: number = 0, paletteCount: number = 0) {
        super();

        this.data = new Int8Array(width * height);
        this.wi = this.owi = width;
        this.hi = this.ohi = height;
        this.xof = this.yof = 0;
        this.bpal = new Int32Array(paletteCount);
    }

    copy(): Pix8 {
        const image: Pix8 = new Pix8(this.wi, this.hi, this.bpal.length);
        image.owi = this.owi;
        image.ohi = this.ohi;
        image.xof = this.xof;
        image.yof = this.yof;

        const dataLength: number = this.data.length;
        for (let i: number = 0; i < dataLength; i++) {
            image.data[i] = this.data[i];
        }

        const paletteLength: number = this.bpal.length;
        for (let i: number = 0; i < paletteLength; i++) {
            image.bpal[i] = this.bpal[i];
        }

        return image;
    }

    trim(): void {
        if (this.wi === this.owi && this.hi === this.ohi) {
            return;
        }

        const pixels: Int8Array = new Int8Array(this.owi * this.ohi);
        let off: number = 0;
        for (let y: number = 0; y < this.hi; y++) {
            for (let x: number = 0; x < this.wi; x++) {
                pixels[x + this.xof + (y + this.yof) * this.owi] = this.data[off++];
            }
        }

        this.data = pixels;
        this.wi = this.owi;
        this.hi = this.ohi;
        this.xof = 0;
        this.yof = 0;
    }

    rgbAdjust(r: number, g: number, b: number): void {
        for (let i: number = 0; i < this.bpal.length; i++) {
            let red: number = (this.bpal[i] >> 16) & 0xff;
            red += r;
            if (red < 0) {
                red = 0;
            } else if (red > 255) {
                red = 255;
            }

            let green: number = (this.bpal[i] >> 8) & 0xff;
            green += g;
            if (green < 0) {
                green = 0;
            } else if (green > 255) {
                green = 255;
            }

            let blue: number = this.bpal[i] & 0xff;
            blue += b;
            if (blue < 0) {
                blue = 0;
            } else if (blue > 255) {
                blue = 255;
            }

            this.bpal[i] = (red << 16) + (green << 8) + blue;
        }
    }

    hflip(): void {
        const pixels: Int8Array = new Int8Array(this.hi * this.wi);
        let off: number = 0;

        for (let y: number = 0; y < this.hi; y++) {
            for (let x: number = this.wi - 1; x >= 0; x--) {
                pixels[off++] = this.data[this.wi * y + x];
            }
        }

        this.data = pixels;
        this.xof = this.owi - this.wi - this.xof;
    }

    vflip(): void {
        const pixels: Int8Array = new Int8Array(this.hi * this.wi);
        let off: number = 0;

        for (let y: number = this.hi - 1; y >= 0; y--) {
            for (let x: number = 0; x < this.wi; x++) {
                pixels[off++] = this.data[this.wi * y + x];
            }
        }

        this.data = pixels;
        this.yof = this.ohi - this.hi - this.yof;
    }

    plotSprite(x: number, y: number): void {
        x |= 0;
        y |= 0;

        x += this.xof;
        y += this.yof;

        let dstOff: number = x + y * Pix2D.width;
        let srcOff: number = 0;
        let h: number = this.hi;
        let w: number = this.wi;
        let dstStep: number = Pix2D.width - w;
        let srcStep: number = 0;

        if (y < Pix2D.clipMinY) {
            const cutoff: number = Pix2D.clipMinY - y;
            h -= cutoff;
            y = Pix2D.clipMinY;
            srcOff += cutoff * w;
            dstOff += cutoff * Pix2D.width;
        }

        if (y + h > Pix2D.clipMaxY) {
            h -= y + h - Pix2D.clipMaxY;
        }

        if (x < Pix2D.clipMinX) {
            const cutoff: number = Pix2D.clipMinX - x;
            w -= cutoff;
            x = Pix2D.clipMinX;
            srcOff += cutoff;
            dstOff += cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (x + w > Pix2D.clipMaxX) {
            const cutoff: number = x + w - Pix2D.clipMaxX;
            w -= cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (w > 0 && h > 0) {
            this.plot(w, h, this.data, srcOff, srcStep, Pix2D.pixels, dstOff, dstStep);
        }
    }

    private plot(w: number, h: number, src: Int8Array, srcOff: number, srcStep: number, dst: Int32Array, dstOff: number, dstStep: number): void {
        const qw: number = -(w >> 2);
        w = -(w & 0x3);

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = qw; x < 0; x++) {
                let palIndex: number = src[srcOff++];
                if (palIndex === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = this.bpal[palIndex & 0xff];
                }

                palIndex = src[srcOff++];
                if (palIndex === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = this.bpal[palIndex & 0xff];
                }

                palIndex = src[srcOff++];
                if (palIndex === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = this.bpal[palIndex & 0xff];
                }

                palIndex = src[srcOff++];
                if (palIndex === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = this.bpal[palIndex & 0xff];
                }
            }

            for (let x: number = w; x < 0; x++) {
                const palIndex: number = src[srcOff++];
                if (palIndex === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = this.bpal[palIndex & 0xff];
                }
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
    }

}

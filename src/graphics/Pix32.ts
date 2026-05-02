import Pix2D from '#/graphics/Pix2D.js';
import { decodeJpeg } from '#/graphics/Jpeg.js';
import Pix8 from '#/graphics/Pix8.js';

interface ArchiveReader {
    read(name: string): Uint8Array | null;
}

export default class Pix32 extends Pix2D {
    data: Int32Array;
    wi: number; // width
    hi: number; // height
    xof: number; // x offset
    yof: number; // y offset
    owi: number; // original width
    ohi: number; // original height

    constructor(width: number = 0, height: number = 0) {
        super();

        this.data = new Int32Array(width * height);
        this.wi = this.owi = width;
        this.hi = this.ohi = height;
        this.xof = this.yof = 0;
    }

    static async fromJpeg(archive: ArchiveReader, name: string): Promise<Pix32> {
        const dat: Uint8Array | null = archive.read(name);
        if (!dat) {
            throw new Error();
        }

        return this.fromBytes(dat);
    }

    static async fromBytes(dat: Uint8Array): Promise<Pix32> {
        const jpeg: ImageData = await decodeJpeg(dat);
        const image: Pix32 = new Pix32(jpeg.width, jpeg.height);

        const data: Uint32Array = new Uint32Array(jpeg.data.buffer);
        for (let i: number = 0; i < image.data.length; i++) {
            const pixel: number = data[i];
            image.data[i] = (((pixel >> 24) & 0xff) << 24) | ((pixel & 0xff) << 16) | (((pixel >> 8) & 0xff) << 8) | ((pixel >> 16) & 0xff);
        }
        return image;
    }

    setPixels(): void {
        Pix2D.setPixels(this.data, this.wi, this.hi);
    }

    static litSprite(dst: Int32Array, src: Int32Array, srcX: number, srcY: number, dstOff: number, dstStep: number, w: number, h: number, scaleX: number, scaleY: number, srcWidth: number): void {
        const startX: number = srcX;
        for (let y: number = -h; y < 0; y++) {
            const offY: number = (srcY >> 16) * srcWidth;
            for (let x: number = -w; x < 0; x++) {
                const rgb: number = src[(srcX >> 16) + offY];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }
                srcX += scaleX;
            }

            srcY += scaleY;
            srcX = startX;
            dstOff += dstStep;
        }
    }

    scalePlotSprite(x: number, y: number, w: number, h: number): void {
        if (w <= 0 || h <= 0) {
            return;
        }

        const width: number = this.wi;
        const height: number = this.hi;
        let srcX: number = 0;
        let srcY: number = 0;
        const fullWidth: number = this.owi;
        const fullHeight: number = this.ohi;
        const scaleX: number = ((fullWidth << 16) / w) | 0;
        const scaleY: number = ((fullHeight << 16) / h) | 0;

        if (this.xof > 0) {
            const cutoff: number = (((this.xof << 16) + scaleX - 1) / scaleX) | 0;
            x += cutoff;
            srcX = scaleX * cutoff - (this.xof << 16);
        }

        if (this.yof > 0) {
            const cutoff: number = (((this.yof << 16) + scaleY - 1) / scaleY) | 0;
            y += cutoff;
            srcY = scaleY * cutoff - (this.yof << 16);
        }

        if (width < fullWidth) {
            w = (((width << 16) + scaleX - srcX - 1) / scaleX) | 0;
        }

        if (height < fullHeight) {
            h = (((height << 16) + scaleY - srcY - 1) / scaleY) | 0;
        }

        let dstOff: number = Pix2D.width * y + x;
        let dstStep: number = Pix2D.width - w;

        if (y + h > Pix2D.clipMaxY) {
            h -= y + h - Pix2D.clipMaxY;
        }

        if (y < Pix2D.clipMinY) {
            const cutoff: number = Pix2D.clipMinY - y;
            h -= cutoff;
            dstOff += Pix2D.width * cutoff;
            srcY += scaleY * cutoff;
        }

        if (x + w > Pix2D.clipMaxX) {
            const cutoff: number = x + w - Pix2D.clipMaxX;
            w -= cutoff;
            dstStep += cutoff;
        }

        if (x < Pix2D.clipMinX) {
            const cutoff: number = Pix2D.clipMinX - x;
            w -= cutoff;
            dstOff += cutoff;
            srcX += scaleX * cutoff;
            dstStep += cutoff;
        }

        Pix32.litSprite(Pix2D.pixels, this.data, srcX, srcY, dstOff, dstStep, w, h, scaleX, scaleY, width);
    }

    transScalePlotSprite(x: number, y: number, w: number, h: number, alpha: number): void {
        if (w <= 0 || h <= 0) {
            return;
        }

        const width: number = this.wi;
        const height: number = this.hi;
        let srcX: number = 0;
        let srcY: number = 0;
        const fullWidth: number = this.owi;
        const fullHeight: number = this.ohi;
        const scaleX: number = ((fullWidth << 16) / w) | 0;
        const scaleY: number = ((fullHeight << 16) / h) | 0;

        if (this.xof > 0) {
            const cutoff: number = (((this.xof << 16) + scaleX - 1) / scaleX) | 0;
            x += cutoff;
            srcX = scaleX * cutoff - (this.xof << 16);
        }

        if (this.yof > 0) {
            const cutoff: number = (((this.yof << 16) + scaleY - 1) / scaleY) | 0;
            y += cutoff;
            srcY = scaleY * cutoff - (this.yof << 16);
        }

        if (width < fullWidth) {
            w = (((width << 16) + scaleX - srcX - 1) / scaleX) | 0;
        }

        if (height < fullHeight) {
            h = (((height << 16) + scaleY - srcY - 1) / scaleY) | 0;
        }

        let dstOff: number = Pix2D.width * y + x;
        let dstStep: number = Pix2D.width - w;

        if (y + h > Pix2D.clipMaxY) {
            h -= y + h - Pix2D.clipMaxY;
        }

        if (y < Pix2D.clipMinY) {
            const cutoff: number = Pix2D.clipMinY - y;
            h -= cutoff;
            dstOff += Pix2D.width * cutoff;
            srcY += scaleY * cutoff;
        }

        if (x + w > Pix2D.clipMaxX) {
            const cutoff: number = x + w - Pix2D.clipMaxX;
            w -= cutoff;
            dstStep += cutoff;
        }

        if (x < Pix2D.clipMinX) {
            const cutoff: number = Pix2D.clipMinX - x;
            w -= cutoff;
            dstOff += cutoff;
            srcX += scaleX * cutoff;
            dstStep += cutoff;
        }

        Pix32.plotScale(Pix2D.pixels, this.data, srcX, srcY, dstOff, dstStep, w, h, scaleX, scaleY, width, alpha);
    }

    static plotScale(dst: Int32Array, src: Int32Array, srcX: number, srcY: number, dstOff: number, dstStep: number, w: number, h: number, scaleX: number, scaleY: number, srcWidth: number, alpha: number): void {
        const invAlpha: number = 256 - alpha;
        const startX: number = srcX;

        for (let y: number = -h; y < 0; y++) {
            const offY: number = (srcY >> 16) * srcWidth;
            for (let x: number = -w; x < 0; x++) {
                const rgb: number = src[(srcX >> 16) + offY];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    const dstRgb: number = dst[dstOff];
                    dst[dstOff++] = (((rgb & 0xff00ff) * alpha + (dstRgb & 0xff00ff) * invAlpha) & 0xff00ff00) + (((rgb & 0xff00) * alpha + (dstRgb & 0xff00) * invAlpha) & 0xff0000) >> 8;
                }
                srcX += scaleX;
            }

            srcY += scaleY;
            srcX = startX;
            dstOff += dstStep;
        }
    }

    rgbAdjust(r: number, g: number, b: number): void {
        for (let i: number = 0; i < this.data.length; i++) {
            const rgb: number = this.data[i];

            if (rgb !== 0) {
                let red: number = (rgb >> 16) & 0xff;
                red += r;
                if (red < 1) {
                    red = 1;
                } else if (red > 255) {
                    red = 255;
                }

                let green: number = (rgb >> 8) & 0xff;
                green += g;
                if (green < 1) {
                    green = 1;
                } else if (green > 255) {
                    green = 255;
                }

                let blue: number = rgb & 0xff;
                blue += b;
                if (blue < 1) {
                    blue = 1;
                } else if (blue > 255) {
                    blue = 255;
                }

                this.data[i] = (red << 16) + (green << 8) + blue;
            }
        }
    }

    trim(): void {
        const pixels = new Int32Array(this.owi * this.ohi);
        for (let y = 0; y < this.hi; y++) {
            for (let x = 0; x < this.wi; x++) {
                pixels[(this.yof + y) * this.owi + this.xof + x] = this.data[this.wi * y + x];
            }
        }

        this.data = pixels;
        this.wi = this.owi;
        this.hi = this.ohi;
        this.xof = 0;
        this.yof = 0;
    }

    hflip(): void {
        const pixels: Int32Array = new Int32Array(this.hi * this.wi);
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
        const pixels: Int32Array = new Int32Array(this.hi * this.wi);
        let off: number = 0;

        for (let y: number = this.hi - 1; y >= 0; y--) {
            for (let x: number = 0; x < this.wi; x++) {
                pixels[off++] = this.data[this.wi * y + x];
            }
        }

        this.data = pixels;
        this.yof = this.ohi - this.hi - this.yof;
    }

    quickPlotSprite(x: number, y: number): void {
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
            this.plotQuick(w, h, this.data, srcOff, srcStep, Pix2D.pixels, dstOff, dstStep);
        }
    }

    private plotQuick(w: number, h: number, src: Int32Array, srcOff: number, srcStep: number, dst: Int32Array, dstOff: number, dstStep: number): void {
        const qw: number = -(w >> 2);
        w = -(w & 0x3);

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = qw; x < 0; x++) {
                dst[dstOff++] = src[srcOff++];
                dst[dstOff++] = src[srcOff++];
                dst[dstOff++] = src[srcOff++];
                dst[dstOff++] = src[srcOff++];
            }

            for (let x: number = w; x < 0; x++) {
                dst[dstOff++] = src[srcOff++];
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
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

    private plot(w: number, h: number, src: Int32Array, srcOff: number, srcStep: number, dst: Int32Array, dstOff: number, dstStep: number): void {
        const qw: number = -(w >> 2);
        w = -(w & 0x3);

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = qw; x < 0; x++) {
                let rgb: number = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                rgb = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                rgb = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                rgb = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }
            }

            for (let x: number = w; x < 0; x++) {
                const rgb: number = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
    }

    transPlotSprite(x: number, y: number, alpha: number): void {
        x |= 0;
        y |= 0;

        x += this.xof;
        y += this.yof;

        let dstStep: number = x + y * Pix2D.width;
        let srcStep: number = 0;
        let h: number = this.hi;
        let w: number = this.wi;
        let dstOff: number = Pix2D.width - w;
        let srcOff: number = 0;

        if (y < Pix2D.clipMinY) {
            const cutoff: number = Pix2D.clipMinY - y;
            h -= cutoff;
            y = Pix2D.clipMinY;
            srcStep += cutoff * w;
            dstStep += cutoff * Pix2D.width;
        }

        if (y + h > Pix2D.clipMaxY) {
            h -= y + h - Pix2D.clipMaxY;
        }

        if (x < Pix2D.clipMinX) {
            const cutoff: number = Pix2D.clipMinX - x;
            w -= cutoff;
            x = Pix2D.clipMinX;
            srcStep += cutoff;
            dstStep += cutoff;
            srcOff += cutoff;
            dstOff += cutoff;
        }

        if (x + w > Pix2D.clipMaxX) {
            const cutoff: number = x + w - Pix2D.clipMaxX;
            w -= cutoff;
            srcOff += cutoff;
            dstOff += cutoff;
        }

        if (w > 0 && h > 0) {
            this.tranSprite(Pix2D.pixels, this.data, srcStep, dstStep, w, h, dstOff, srcOff, alpha);
        }
    }

    private tranSprite(dst: Int32Array, src: Int32Array, srcOff: number, dstOff: number, w: number, h: number, dstStep: number, srcStep: number, alpha: number): void {
        const invAlpha: number = 256 - alpha;

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = -w; x < 0; x++) {
                const rgb: number = src[srcOff++];
                if (rgb === 0) {
                    dstOff++;
                } else {
                    const dstRgb: number = dst[dstOff];
                    dst[dstOff++] = ((((rgb & 0xff00ff) * alpha + (dstRgb & 0xff00ff) * invAlpha) & 0xff00ff00) + (((rgb & 0xff00) * alpha + (dstRgb & 0xff00) * invAlpha) & 0xff0000)) >> 8;
                }
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
    }

    scanlineRotatePlotSprite(x: number, y: number, w: number, h: number, anchorX: number, anchorY: number, theta: number, zoom: number, lineStart: Int32Array, lineWidth: Int32Array): void {
        x |= 0;
        y |= 0;
        w |= 0;
        h |= 0;

        try {
            const centerX: number = (-w / 2) | 0;
            const centerY: number = (-h / 2) | 0;

            const sin: number = (Math.sin(theta / 326.11) * 65536.0) | 0;
            const cos: number = (Math.cos(theta / 326.11) * 65536.0) | 0;
            const sinZoom: number = (sin * zoom) >> 8;
            const cosZoom: number = (cos * zoom) >> 8;

            let leftX: number = (anchorX << 16) + centerY * sinZoom + centerX * cosZoom;
            let leftY: number = (anchorY << 16) + (centerY * cosZoom - centerX * sinZoom);
            let leftOff: number = x + y * Pix2D.width;

            for (let i: number = 0; i < h; i++) {
                const dstOff: number = lineStart[i];
                let dstX: number = leftOff + dstOff;

                let srcX: number = leftX + cosZoom * dstOff;
                let srcY: number = leftY - sinZoom * dstOff;

                for (let j: number = -lineWidth[i]; j < 0; j++) {
                    Pix2D.pixels[dstX++] = this.data[(srcX >> 16) + (srcY >> 16) * this.wi];
                    srcX += cosZoom;
                    srcY -= sinZoom;
                }

                leftX += sinZoom;
                leftY += cosZoom;
                leftOff += Pix2D.width;
            }
        } catch (_e) {
            // empty
        }
    }

    rotatePlotSprite(x: number, y: number, theta: number): void;
    rotatePlotSprite(x: number, y: number, w: number, h: number, anchorX: number, anchorY: number, theta: number, zoom: number): void;
    rotatePlotSprite(x: number, y: number, w: number, h?: number, anchorX?: number, anchorY?: number, theta?: number, zoom?: number): void {
        x |= 0;
        y |= 0;

        if (h === undefined || anchorX === undefined || anchorY === undefined || theta === undefined || zoom === undefined) {
            try {
                const sin: number = (Math.sin(w) * 65536.0) | 0;
                const cos: number = (Math.cos(w) * 65536.0) | 0;
                const sinZoom: number = (sin * 256) >> 8;
                const cosZoom: number = (cos * 256) >> 8;
                let leftX: number = sinZoom * -10 + cosZoom * -10 + 983040;
                let leftY: number = cosZoom * -10 + 983040 - sinZoom * -10;
                let leftOff: number = Pix2D.width * y + x;

                for (let i: number = 0; i < 20; i++) {
                    let dstOff: number = leftOff;
                    let srcX: number = leftX;
                    let srcY: number = leftY;

                    for (let j: number = -20; j < 0; j++) {
                        const rgb: number = this.data[(srcX >> 16) + (srcY >> 16) * this.wi];
                        if (rgb === 0) {
                            dstOff++;
                        } else {
                            Pix2D.pixels[dstOff++] = rgb;
                        }
                        srcX += cosZoom;
                        srcY -= sinZoom;
                    }

                    leftX += sinZoom;
                    leftY += cosZoom;
                    leftOff += Pix2D.width;
                }
            } catch (_e) {
                // empty
            }
            return;
        }

        w |= 0;
        h |= 0;

        try {
            const centerX: number = (-w / 2) | 0;
            const centerY: number = (-h / 2) | 0;

            const sin: number = (Math.sin(theta) * 65536.0) | 0;
            const cos: number = (Math.cos(theta) * 65536.0) | 0;
            const sinZoom: number = (sin * zoom) >> 8;
            const cosZoom: number = (cos * zoom) >> 8;

            let leftX: number = (anchorX << 16) + (centerY * sinZoom + centerX * cosZoom);
            let leftY: number = (anchorY << 16) + (centerY * cosZoom - centerX * sinZoom);
            let leftOff: number = x + y * Pix2D.width;

            for (let i: number = 0; i < h; i++) {
                let dstX: number = leftOff;
                let srcX: number = leftX;
                let srcY: number = leftY;

                for (let j: number = -w; j < 0; j++) {
                    const rgb = this.data[(srcX >> 16) + (srcY >> 16) * this.owi];
                    if (rgb == 0) {
                        dstX++;
                    } else {
                        Pix2D.pixels[dstX++] = rgb;
                    }

                    srcX += cosZoom;
                    srcY -= sinZoom;
                }

                leftX += sinZoom;
                leftY += cosZoom;
                leftOff += Pix2D.width;
            }
        } catch (_e) {
            // empty
        }
    }

    scanlinePlotSprite(mask: Pix8, x: number, y: number): void {
        x |= 0;
        y |= 0;

        x += this.xof;
        y += this.yof;

        let dstStep: number = x + y * Pix2D.width;
        let srcStep: number = 0;
        let h: number = this.hi;
        let w: number = this.wi;
        let dstOff: number = Pix2D.width - w;
        let srcOff: number = 0;

        if (y < Pix2D.clipMinY) {
            const cutoff: number = Pix2D.clipMinY - y;
            h -= cutoff;
            y = Pix2D.clipMinY;
            srcStep += cutoff * w;
            dstStep += cutoff * Pix2D.width;
        }

        if (y + h > Pix2D.clipMaxY) {
            h -= y + h - Pix2D.clipMaxY;
        }

        if (x < Pix2D.clipMinX) {
            const cutoff: number = Pix2D.clipMinX - x;
            w -= cutoff;
            x = Pix2D.clipMinX;
            srcStep += cutoff;
            dstStep += cutoff;
            srcOff += cutoff;
            dstOff += cutoff;
        }

        if (x + w > Pix2D.clipMaxX) {
            const cutoff: number = x + w - Pix2D.clipMaxX;
            w -= cutoff;
            srcOff += cutoff;
            dstOff += cutoff;
        }

        if (w > 0 && h > 0) {
            this.plotScanline(Pix2D.pixels, this.data, srcStep, dstStep, w, h, dstOff, srcOff, mask.data);
        }
    }

    private plotScanline(dst: Int32Array, src: Int32Array, srcOff: number, dstOff: number, w: number, h: number, dstStep: number, srcStep: number, mask: Int8Array): void {
        const qw: number = -(w >> 2);
        w = -(w & 0x3);

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = qw; x < 0; x++) {
                let rgb: number = src[srcOff++];
                if (rgb !== 0 && mask[dstOff] === 0) {
                    dst[dstOff++] = rgb;
                } else {
                    dstOff++;
                }

                rgb = src[srcOff++];
                if (rgb !== 0 && mask[dstOff] === 0) {
                    dst[dstOff++] = rgb;
                } else {
                    dstOff++;
                }

                rgb = src[srcOff++];
                if (rgb !== 0 && mask[dstOff] === 0) {
                    dst[dstOff++] = rgb;
                } else {
                    dstOff++;
                }

                rgb = src[srcOff++];
                if (rgb !== 0 && mask[dstOff] === 0) {
                    dst[dstOff++] = rgb;
                } else {
                    dstOff++;
                }
            }

            for (let x: number = w; x < 0; x++) {
                const rgb: number = src[srcOff++];
                if (rgb !== 0 && mask[dstOff] === 0) {
                    dst[dstOff++] = rgb;
                } else {
                    dstOff++;
                }
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
    }
}

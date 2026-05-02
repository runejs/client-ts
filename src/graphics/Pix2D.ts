import Linkable2 from '#/datastruct/Linkable2.js';

export default class Pix2D extends Linkable2 {
    static pixels: Int32Array = new Int32Array();

    static width: number = 0;
    static height: number = 0;

    static clipMinX: number = 0;
    static clipMaxX: number = 0;
    static clipMinY: number = 0;
    static clipMaxY: number = 0;

    static sizeX: number = 0;
    static maxX: number = 0;
    static maxY: number = 0;

    static setPixels(pixels: Int32Array, width: number, height: number): void {
        this.pixels = pixels;
        this.width = width;
        this.height = height;
        this.setSubClipping(0, 0, width, height);
    }

    static resetClipping(): void {
        this.setClipping();
    }

    static setSubClipping(x1: number, y1: number, x2: number, y2: number): void {
        if (x1 < 0) {
            x1 = 0;
        }

        if (y1 < 0) {
            y1 = 0;
        }

        if (x2 > this.width) {
            x2 = this.width;
        }

        if (y2 > this.height) {
            y2 = this.height;
        }

        this.clipMinY = y1;
        this.clipMaxY = y2;
        this.clipMinX = x1;
        this.clipMaxX = x2;

        this.sizeX = this.clipMaxX - 1;
        this.maxX = (this.clipMaxX / 2) | 0;
        this.maxY = (this.clipMaxY / 2) | 0;
    }

    static setClipping(x1?: number, y1?: number, x2?: number, y2?: number): void {
        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
            this.clipMinX = 0;
            this.clipMinY = 0;
            this.clipMaxX = this.width;
            this.clipMaxY = this.height;
            this.sizeX = this.clipMaxX - 1;
            this.maxX = (this.clipMaxX / 2) | 0;
            this.maxY = (this.clipMaxY / 2) | 0;
            return;
        }

        this.setSubClipping(x1, y1, x2, y2);
    }

    static method914(clip: Int32Array | number[]): void {
        this.clipMinX = clip[0];
        this.clipMinY = clip[1];
        this.clipMaxX = clip[2];
        this.clipMaxY = clip[3];
        this.sizeX = this.clipMaxX - 1;
        this.maxX = (this.clipMaxX / 2) | 0;
        this.maxY = (this.clipMaxY / 2) | 0;
    }

    static saveClipping(clip: Int32Array | number[]): void {
        clip[0] = this.clipMinX;
        clip[1] = this.clipMinY;
        clip[2] = this.clipMaxX;
        clip[3] = this.clipMaxY;
    }

    static cls(): void {
        let offset: number = 0;
        let length: number = this.height * this.width - 7;
        while (offset < length) {
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
            this.pixels[offset++] = 0;
        }

        length += 7;
        while (offset < length) {
            this.pixels[offset++] = 0;
        }
    }

    static fillRectTrans(x: number, y: number, width: number, height: number, rgb: number, alpha: number): void {
        if (x < this.clipMinX) {
            width -= this.clipMinX - x;
            x = this.clipMinX;
        }

        if (y < this.clipMinY) {
            height -= this.clipMinY - y;
            y = this.clipMinY;
        }

        if (x + width > this.clipMaxX) {
            width = this.clipMaxX - x;
        }

        if (y + height > this.clipMaxY) {
            height = this.clipMaxY - y;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((rgb >> 16) & 0xff) * alpha;
        const g0: number = ((rgb >> 8) & 0xff) * alpha;
        const b0: number = (rgb & 0xff) * alpha;
        const step: number = this.width - width;
        let offset: number = x + y * this.width;
        for (let i: number = 0; i < height; i++) {
            for (let j: number = -width; j < 0; j++) {
                const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
                const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
                const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
                const mixed: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
                this.pixels[offset++] = mixed;
            }
            offset += step;
        }
    }

    static fillRect(x: number, y: number, width: number, height: number, rgb: number): void {
        if (x < this.clipMinX) {
            width -= this.clipMinX - x;
            x = this.clipMinX;
        }

        if (y < this.clipMinY) {
            height -= this.clipMinY - y;
            y = this.clipMinY;
        }

        if (x + width > this.clipMaxX) {
            width = this.clipMaxX - x;
        }

        if (y + height > this.clipMaxY) {
            height = this.clipMaxY - y;
        }

        const step: number = this.width - width;
        let offset: number = x + y * this.width;
        for (let i: number = -height; i < 0; i++) {
            for (let j: number = -width; j < 0; j++) {
                this.pixels[offset++] = rgb;
            }

            offset += step;
        }
    }

    static drawRect(x: number, y: number, w: number, h: number, rgb: number): void {
        this.hline(x, y, w, rgb);
        this.hline(x, y + h - 1, w, rgb);
        this.vline(x, y, h, rgb);
        this.vline(x + w - 1, y, h, rgb);
    }

    static drawRectTrans(x: number, y: number, w: number, h: number, rgb: number, alpha: number): void {
        this.hlineTrans(x, y, w, rgb, alpha);
        this.hlineTrans(x, y + h - 1, w, rgb, alpha);
        if (h >= 3) {
            this.vlineTrans(x, y + 1, h - 2, rgb, alpha);
            this.vlineTrans(x + w - 1, y + 1, h - 2, rgb, alpha);
        }
    }

    static hline(x: number, y: number, width: number, rgb: number): void {
        if (y < this.clipMinY || y >= this.clipMaxY) {
            return;
        }

        if (x < this.clipMinX) {
            width -= this.clipMinX - x;
            x = this.clipMinX;
        }

        if (x + width > this.clipMaxX) {
            width = this.clipMaxX - x;
        }

        const off: number = x + y * this.width;
        for (let i: number = 0; i < width; i++) {
            this.pixels[off + i] = rgb;
        }
    }

    static hlineTrans(x: number, y: number, width: number, rgb: number, alpha: number): void {
        if (y < this.clipMinY || y >= this.clipMaxY) {
            return;
        }

        if (x < this.clipMinX) {
            width -= this.clipMinX - x;
            x = this.clipMinX;
        }

        if (x + width > this.clipMaxX) {
            width = this.clipMaxX - x;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((rgb >> 16) & 0xff) * alpha;
        const g0: number = ((rgb >> 8) & 0xff) * alpha;
        const b0: number = (rgb & 0xff) * alpha;
        const _step: number = this.width - width;
        let offset: number = x + y * this.width;
        for (let i: number = 0; i < width; i++) {
            const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
            const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
            const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
            const mixed: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
            this.pixels[offset++] = mixed;
        }
    }

    static vline(x: number, y: number, height: number, rgb: number): void {
        if (x < this.clipMinX || x >= this.clipMaxX) {
            return;
        }

        if (y < this.clipMinY) {
            height -= this.clipMinY - y;
            y = this.clipMinY;
        }

        if (y + height > this.clipMaxY) {
            height = this.clipMaxY - y;
        }

        const off: number = x + y * this.width;
        for (let i: number = 0; i < height; i++) {
            this.pixels[off + i * this.width] = rgb;
        }
    }

    static vlineTrans(x: number, y: number, height: number, rgb: number, alpha: number): void {
        if (x < this.clipMinX || x >= this.clipMaxX) {
            return;
        }

        if (y < this.clipMinY) {
            height -= this.clipMinY - y;
            y = this.clipMinY;
        }

        if (y + height > this.clipMaxY) {
            height = this.clipMaxY - y;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((rgb >> 16) & 0xff) * alpha;
        const g0: number = ((rgb >> 8) & 0xff) * alpha;
        const b0: number = (rgb & 0xff) * alpha;
        let offset: number = x + y * this.width;
        for (let i: number = 0; i < height; i++) {
            const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
            const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
            const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
            const mixed: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
            this.pixels[offset] = mixed;
            offset += this.width;
        }
    }

    static line(x0: number, y0: number, x1: number, y1: number, rgb: number): void {
        let dx: number = x1 - x0;
        let dy: number = y1 - y0;
        if (dy === 0) {
            if (dx >= 0) {
                this.hline(x0, y0, dx + 1, rgb);
            } else {
                this.hline(x0 + dx, y0, 1 - dx, rgb);
            }
        } else if (dx !== 0) {
            if (dx + dy < 0) {
                x0 += dx;
                dx = -dx;
                y0 += dy;
                dy = -dy;
            }

            if (dx > dy) {
                const yStart: number = y0 << 16;
                let y: number = yStart + 32768;
                const dyFixed: number = dy << 16;
                const slope: number = Math.floor(dyFixed / dx + 0.5);
                let xEnd: number = x0 + dx;
                if (x0 < this.clipMinX) {
                    y += (this.clipMinX - x0) * slope;
                    x0 = this.clipMinX;
                }
                if (xEnd >= this.clipMaxX) {
                    xEnd = this.clipMaxX - 1;
                }
                while (x0 <= xEnd) {
                    const py: number = y >> 16;
                    if (py >= this.clipMinY && py < this.clipMaxY) {
                        this.pixels[this.width * py + x0] = rgb;
                    }
                    y += slope;
                    x0++;
                }
            } else {
                const xStart: number = x0 << 16;
                let x: number = xStart + 32768;
                const dxFixed: number = dx << 16;
                const slope: number = Math.floor(dxFixed / dy + 0.5);
                let yEnd: number = y0 + dy;
                if (y0 < this.clipMinY) {
                    x += (this.clipMinY - y0) * slope;
                    y0 = this.clipMinY;
                }
                if (yEnd >= this.clipMaxY) {
                    yEnd = this.clipMaxY - 1;
                }
                while (y0 <= yEnd) {
                    const px: number = x >> 16;
                    if (px >= this.clipMinX && px < this.clipMaxX) {
                        this.pixels[this.width * y0 + px] = rgb;
                    }
                    x += slope;
                    y0++;
                }
            }
        } else if (dy >= 0) {
            this.vline(x0, y0, dy + 1, rgb);
        } else {
            this.vline(x0, y0 + dy, -dy + 1, rgb);
        }
    }

}

import Pix32 from '#/graphics/Pix32.js';
import Pix8 from '#/graphics/Pix8.js';
import PixFont from '#/graphics/PixFont.js';

import Packet from '#/io/Packet.js';
import Js5 from '#/js5/Js5.js';
import Js5Loader from '#/js5/Js5Loader.js';

export default class PixLoader {
    static count: number = 0;
    static xof: Int32Array = new Int32Array(0);
    static yof: Int32Array = new Int32Array(0);
    static wi: Int32Array = new Int32Array(0);
    static hi: Int32Array = new Int32Array(0);
    static owi: number = 0;
    static ohi: number = 0;
    static bpal: Int32Array = new Int32Array(0);
    static bspr: Int8Array[] = [];

    static depack(src: Uint8Array): void {
        const packet = new Packet(src);
        packet.pos = src.length - 2;
        this.count = packet.g2();

        this.xof = new Int32Array(this.count);
        this.yof = new Int32Array(this.count);
        this.wi = new Int32Array(this.count);
        this.hi = new Int32Array(this.count);
        this.bspr = new Array(this.count);

        packet.pos = src.length - this.count * 8 - 7;
        this.owi = packet.g2();
        this.ohi = packet.g2();
        const paletteCount = (packet.g1() & 0xff) + 1;

        for (let i = 0; i < this.count; i++) {
            this.xof[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.yof[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.wi[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.hi[i] = packet.g2();
        }

        packet.pos = src.length + 3 - this.count * 8 - paletteCount * 3 - 7;
        this.bpal = new Int32Array(paletteCount);
        for (let i = 1; i < paletteCount; i++) {
            this.bpal[i] = packet.g3();
            if (this.bpal[i] === 0) {
                this.bpal[i] = 1;
            }
        }

        packet.pos = 0;
        for (let i = 0; i < this.count; i++) {
            const width = this.wi[i];
            const height = this.hi[i];
            const pixels = new Int8Array(width * height);
            this.bspr[i] = pixels;

            const encoding = packet.g1();
            if (encoding === 0) {
                for (let pixel = 0; pixel < pixels.length; pixel++) {
                    pixels[pixel] = packet.g1b();
                }
            } else if (encoding === 1) {
                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        pixels[y * width + x] = packet.g1b();
                    }
                }
            }
        }
    }

    static tryDepack(js5: Js5, file: number, group?: number): boolean {
        const data = js5.getFile(file, group);
        if (data === null) {
            return false;
        }

        this.depack(data);
        return true;
    }

    static tryDepackByName(js5: Js5, group: string, file: string): boolean {
        const groupId = js5.getGroupId(group);
        if (groupId < 0) {
            return false;
        }

        const fileId = js5.getFileId(groupId, file);
        return fileId >= 0 && this.tryDepack(js5, fileId, groupId);
    }

    static makePix8(): Pix8 {
        const image = new Pix8();
        image.owi = this.owi;
        image.ohi = this.ohi;
        image.xof = this.xof[0];
        image.yof = this.yof[0];
        image.wi = this.wi[0];
        image.hi = this.hi[0];
        image.bpal = this.bpal;
        image.data = this.bspr[0];
        this.reset();
        return image;
    }

    static makePix8Array(): Pix8[] {
        const images = new Array<Pix8>(this.count);
        for (let i = 0; i < this.count; i++) {
            const image = new Pix8();
            image.owi = this.owi;
            image.ohi = this.ohi;
            image.xof = this.xof[i];
            image.yof = this.yof[i];
            image.wi = this.wi[i];
            image.hi = this.hi[i];
            image.bpal = this.bpal;
            image.data = this.bspr[i];
            images[i] = image;
        }
        this.reset();
        return images;
    }

    static makePix32(): Pix32 {
        const image = new Pix32();
        image.owi = this.owi;
        image.ohi = this.ohi;
        image.xof = this.xof[0];
        image.yof = this.yof[0];
        image.wi = this.wi[0];
        image.hi = this.hi[0];
        image.data = this.expand(this.bspr[0], image.wi * image.hi);
        this.reset();
        return image;
    }

    static makePix32Array(): Pix32[] {
        const images = new Array<Pix32>(this.count);
        for (let i = 0; i < this.count; i++) {
            const image = new Pix32();
            image.owi = this.owi;
            image.ohi = this.ohi;
            image.xof = this.xof[i];
            image.yof = this.yof[i];
            image.wi = this.wi[i];
            image.hi = this.hi[i];
            image.data = this.expand(this.bspr[i], image.wi * image.hi);
            images[i] = image;
        }
        this.reset();
        return images;
    }

    static makePix8FromJs5(js5: Js5, group: string, file: string = ''): Pix8 | null {
        return this.tryDepackByName(js5, group, file) ? this.makePix8() : null;
    }

    static makePix8FromJs5Id(js5: Js5, group: number, file: number = 0): Pix8 | null {
        return this.tryDepack(js5, file, group) ? this.makePix8() : null;
    }

    static makePix8ArrayFromJs5(js5: Js5, group: string, file: string = ''): Pix8[] | null {
        return this.tryDepackByName(js5, group, file) ? this.makePix8Array() : null;
    }

    static makePix32FromJs5(js5: Js5, group: string, file: string = ''): Pix32 | null {
        return this.tryDepackByName(js5, group, file) ? this.makePix32() : null;
    }

    static makePix32FromJs5Id(js5: Js5, group: number, file: number = 0): Pix32 | null {
        return this.tryDepack(js5, file, group) ? this.makePix32() : null;
    }

    static makePix32ArrayFromJs5(js5: Js5, group: string, file: string = ''): Pix32[] | null {
        return this.tryDepackByName(js5, group, file) ? this.makePix32Array() : null;
    }

    static makePixFontFromJs5(js5: Js5, file: string, group: string): PixFont | null {
        return this.tryDepackByName(js5, group, file) ? this.makePixFontLoaded() : null;
    }

    static makePixFontFromJs5Id(js5: Js5, group: number, file: number = 0): PixFont | null {
        return this.tryDepack(js5, file, group) ? this.makePixFontLoaded() : null;
    }

    static async makePix8FromJs5Async(js5: Js5Loader, group: string, file: string = ''): Promise<Pix8 | null> {
        return (await this.loadByName(js5, group, file)) ? this.makePix8() : null;
    }

    static async makePix8ArrayFromJs5Async(js5: Js5Loader, group: string, file: string = ''): Promise<Pix8[] | null> {
        return (await this.loadByName(js5, group, file)) ? this.makePix8Array() : null;
    }

    static async makePix32FromJs5Async(js5: Js5Loader, group: string, file: string = ''): Promise<Pix32 | null> {
        return (await this.loadByName(js5, group, file)) ? this.makePix32() : null;
    }

    static async makePix32ArrayFromJs5Async(js5: Js5Loader, group: string, file: string = ''): Promise<Pix32[] | null> {
        return (await this.loadByName(js5, group, file)) ? this.makePix32Array() : null;
    }

    private static makePixFontLoaded(): PixFont {
        const font = PixFont.fromPixLoader(this.yof, this.wi, this.hi, this.bpal, this.bspr);
        this.reset();
        return font;
    }

    private static async loadByName(js5: Js5Loader, group: string, file: string): Promise<boolean> {
        const groupId = js5.getGroupId(group);
        if (groupId < 0) {
            return false;
        }

        const fileId = js5.getFileId(groupId, file);
        if (fileId < 0) {
            return false;
        }

        await js5.fetchGroup(groupId, true);
        return this.tryDepack(js5, fileId, groupId);
    }

    static reset(): void {
        this.xof = new Int32Array(0);
        this.yof = new Int32Array(0);
        this.wi = new Int32Array(0);
        this.hi = new Int32Array(0);
        this.bpal = new Int32Array(0);
        this.bspr = [];
        this.count = 0;
        this.owi = 0;
        this.ohi = 0;
    }

    private static expand(src: Int8Array, length: number): Int32Array {
        const out = new Int32Array(length);
        for (let i = 0; i < length; i++) {
            out[i] = this.bpal[src[i] & 0xff];
        }
        return out;
    }
}

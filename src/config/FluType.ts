import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class FluType extends Linkable2 {
    static recentUse: LruCache<FluType> = new LruCache(64);
    static configClient: Js5 | null = null;

    colour: number = 0;
    hue: number = 0;
    saturation: number = 0;
    lightness: number = 0;
    chroma: number = 0;

    static init(config: Js5): void {
        this.configClient = config;
    }

    static resetCache() {
        FluType.recentUse.clear();
    }

    static list(id: number): FluType {
        if (!this.configClient) {
            return new FluType();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const src = this.configClient.getFile(id, 1);
        const flu = new FluType();
        if (src) {
            flu.decode(id, new Packet(src));
        }
        flu.postDecode();
        this.recentUse.put(flu, BigInt(id));
        return flu;
    }

    decode(id: number, dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                return;
            }

            if (code === 1) {
                this.colour = dat.g3();
            }
        }
    }

    private postDecode(): void {
        this.getHsl(this.colour);
    }

    private getHsl(rgb: number): void {
        const red = ((rgb >> 16) & 0xff) / 256.0;
        const green = ((rgb >> 8) & 0xff) / 256.0;
        const blue = (rgb & 0xff) / 256.0;

        let min = red;
        if (green < min) min = green;
        if (blue < min) min = blue;

        let max = red;
        if (green > max) max = green;
        if (blue > max) max = blue;

        let hue = 0.0;
        let saturation = 0.0;
        const lightness = (min + max) / 2.0;

        if (min !== max) {
            saturation = lightness < 0.5 ? (max - min) / (max + min) : (max - min) / (2.0 - max - min);

            if (red === max) {
                hue = (green - blue) / (max - min);
            } else if (green === max) {
                hue = (blue - red) / (max - min) + 2.0;
            } else if (blue === max) {
                hue = (red - green) / (max - min) + 4.0;
            }
        }

        hue /= 6.0;

        this.lightness = (lightness * 256.0) | 0;
        if (this.lightness < 0) {
            this.lightness = 0;
        } else if (this.lightness > 255) {
            this.lightness = 255;
        }

        if (lightness > 0.5) {
            this.chroma = ((1.0 - lightness) * saturation * 512.0) | 0;
        } else {
            this.chroma = (lightness * saturation * 512.0) | 0;
        }
        if (this.chroma < 1) {
            this.chroma = 1;
        }

        this.saturation = (saturation * 256.0) | 0;
        if (this.saturation < 0) {
            this.saturation = 0;
        } else if (this.saturation > 255) {
            this.saturation = 255;
        }

        this.hue = (hue * this.chroma) | 0;
    }
}

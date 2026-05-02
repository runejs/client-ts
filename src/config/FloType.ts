import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class FloType extends Linkable2 {
    static recentUse: LruCache<FloType> = new LruCache(64);
    static configClient: Js5 | null = null;

    colour: number = 0;
    texture: number = -1;
    occlude: boolean = true;
    mapcolour: number = -1;

    hue: number = 0;
    saturation: number = 0;
    lightness: number = 0;
    mapHue: number = 0;
    mapSaturation: number = 0;
    mapLightness: number = 0;

    static init(config: Js5): void {
        this.configClient = config;
    }

    static resetCache() {
        FloType.recentUse.clear();
    }

    static list(id: number): FloType {
        if (!this.configClient) {
            return new FloType();
        }

        const cached = this.recentUse.find(BigInt(id));
        if (cached) {
            return cached;
        }

        const src = this.configClient.getFile(id, 4);
        const flo = new FloType();
        if (src) {
            flo.decode(id, new Packet(src));
        }
        flo.postDecode();
        this.recentUse.put(flo, BigInt(id));
        return flo;
    }

    decode(id: number, dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                break;
            }

            if (code === 1) {
                this.colour = dat.g3();
            } else if (code === 2) {
                this.texture = dat.g1();
            } else if (code === 5) {
                this.occlude = false;
            } else if (code === 7) {
                this.mapcolour = dat.g3();
            }
        }
    }

    private postDecode(): void {
        if (this.mapcolour !== -1) {
            this.getHsl(this.mapcolour);
            this.mapHue = this.hue;
            this.mapSaturation = this.saturation;
            this.mapLightness = this.lightness;
        }

        this.getHsl(this.colour);
    }

    private getHsl(rgb: number): void {
        const red: number = ((rgb >> 16) & 0xff) / 256.0;
        const green: number = ((rgb >> 8) & 0xff) / 256.0;
        const blue: number = (rgb & 0xff) / 256.0;

        let min: number = red;
        if (green < red) {
            min = green;
        }
        if (blue < min) {
            min = blue;
        }

        let max: number = red;
        if (green > red) {
            max = green;
        }
        if (blue > max) {
            max = blue;
        }

        let h: number = 0.0;
        let s: number = 0.0;
        const l: number = (min + max) / 2.0;

        if (min !== max) {
            if (l < 0.5) {
                s = (max - min) / (max + min);
            }
            if (l >= 0.5) {
                s = (max - min) / (2.0 - max - min);
            }

            if (red === max) {
                h = (green - blue) / (max - min);
            } else if (green === max) {
                h = (blue - red) / (max - min) + 2.0;
            } else if (blue === max) {
                h = (red - green) / (max - min) + 4.0;
            }
        }

        h /= 6.0;

        this.hue = (h * 256.0) | 0;
        this.saturation = (s * 256.0) | 0;
        this.lightness = (l * 256.0) | 0;

        if (this.saturation < 0) {
            this.saturation = 0;
        } else if (this.saturation > 255) {
            this.saturation = 255;
        }

        if (this.lightness < 0) {
            this.lightness = 0;
        } else if (this.lightness > 255) {
            this.lightness = 255;
        }

    }
}

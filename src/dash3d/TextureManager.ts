import Texture from '#/dash3d/Texture.js';
import type TextureProvider from '#/dash3d/TextureProvider.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class TextureManager implements TextureProvider {
    private readonly recent: Texture[] = [];
    readonly textures: (Texture | null)[];
    brightness: number;
    readonly resolution: number;
    private remaining: number;

    constructor(
        textures: Js5,
        private readonly sprites: Js5,
        private readonly poolSize: number,
        brightness: number,
        resolution: number
    ) {
        this.brightness = brightness;
        this.resolution = resolution;
        this.remaining = poolSize;
        this.textures = new Array(textures.getFileIdLimit(0)).fill(null);

        const files = textures.getFileList(0);
        for (let i = 0; i < files.length; i++) {
            const data = textures.getFile(files[i], 0);
            if (data) {
                this.textures[files[i]] = new Texture(new Packet(data));
            }
        }
    }

    reset(): void {
        for (const texture of this.textures) {
            texture?.unload();
        }
        this.recent.length = 0;
        this.remaining = this.poolSize;
    }

    getTexels(id: number): Int32Array | null {
        const texture = this.textures[id];
        if (!texture) {
            return null;
        }

        if (texture.texels) {
            this.touch(texture);
            texture.used = true;
            return texture.texels;
        }

        if (!texture.loadTexture(this.brightness, this.resolution, this.sprites)) {
            return null;
        }

        if (this.remaining === 0) {
            this.recent.pop()?.unload();
        } else {
            this.remaining--;
        }

        this.touch(texture);
        texture.used = true;
        return texture.texels;
    }

    getAverageRgb(id: number): number {
        return this.textures[id]?.averageRgb ?? 0;
    }

    isOpaque(id: number): boolean {
        return this.textures[id]?.opaque ?? false;
    }

    isLowMem(_id: number): boolean {
        return this.resolution === 64;
    }

    setBrightness(brightness: number): void {
        this.brightness = brightness;
        this.reset();
    }

    runAnims(delta: number): void {
        for (const texture of this.textures) {
            if (texture && texture.animationDirection !== 0 && texture.used) {
                texture.animate(delta);
                texture.used = false;
            }
        }
    }

    private touch(texture: Texture): void {
        const existing = this.recent.indexOf(texture);
        if (existing !== -1) {
            this.recent.splice(existing, 1);
        }
        this.recent.unshift(texture);
    }
}

import { bunzip2 } from '#/io/BZip2.js';
import Packet from '#/io/Packet.js';

export default class FileArchive {
    static hashName(name: string): number {
        let hash = 0;
        name = name.toUpperCase();
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 61 + name.charCodeAt(i) - 32) | 0;
        }
        return hash;
    }

    data: Uint8Array;
    unpacked: boolean;
    fileCount: number;
    fileHash: number[] = [];
    fileUnpackedSize: number[] = [];
    filePackedSize: number[] = [];
    fileOffset: number[] = [];
    fileUnpacked: Uint8Array[] = [];

    constructor(src: Uint8Array) {
        let data = new Packet(src);
        const unpackedSize = data.g3();
        const packedSize = data.g3();

        if (unpackedSize === packedSize) {
            this.data = src;
            this.unpacked = false;
        } else {
            this.data = bunzip2(src.subarray(6));
            data = new Packet(this.data);
            this.unpacked = true;
        }

        this.fileCount = data.g2();
        let offset = data.pos + this.fileCount * 10;
        for (let i = 0; i < this.fileCount; i++) {
            this.fileHash.push(data.g4());
            this.fileUnpackedSize.push(data.g3());
            this.filePackedSize.push(data.g3());
            this.fileOffset.push(offset);
            offset += this.filePackedSize[i];
        }
    }

    read(name: string): Uint8Array | null {
        const index = this.fileHash.indexOf(FileArchive.hashName(name));
        return index === -1 ? null : this.readIndex(index);
    }

    readIndex(index: number): Uint8Array | null {
        if (index < 0 || index >= this.fileCount) {
            return null;
        }

        if (this.fileUnpacked[index]) {
            return this.fileUnpacked[index];
        }

        const offset = this.fileOffset[index];
        const length = this.filePackedSize[index];
        const src = this.data.subarray(offset, offset + length);
        const data = this.unpacked ? src : bunzip2(src);
        this.fileUnpacked[index] = data;
        return data;
    }
}

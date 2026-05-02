import { gunzipSync } from 'fflate';

import IntHashTable from '#/datastruct/IntHashTable.js';
import JString from '#/datastruct/JString.js';

import { bunzip2 } from '#/io/BZip2.js';
import Packet from '#/io/Packet.js';

export default class Js5 {
    static readonly maxsize: number = 0;

    packed: (Uint8Array | null)[] = [];
    unpacked: ((Uint8Array | null)[] | null)[] = [];
    crc: number = 0;
    size: number = 0;
    groupIds: Int32Array = new Int32Array(0);
    groupChecksums: Int32Array = new Int32Array(0);
    groupVersions: Int32Array = new Int32Array(0);
    groupSizes: Int32Array = new Int32Array(0);
    groupNameHash: Int32Array | null = null;
    groupNameHashTable: IntHashTable | null = null;
    fileIds: Int32Array[] = [];
    fileNameHashTable: Int32Array[] = [];
    fileNameHashes: (IntHashTable | null)[] = [];

    constructor(
        readonly discardPacked: boolean = false,
        readonly discardUnpacked: boolean = false
    ) {}

    private static getPackedPayloadLength(src: Uint8Array): number {
        if (src.length < 5) {
            return src.length;
        }

        const compression = src[0] & 0xff;
        const packedSize = ((src[1] << 24) | (src[2] << 16) | (src[3] << 8) | src[4]) | 0;
        if (packedSize < 0 || (compression !== 0 && src.length < 9)) {
            return src.length;
        }

        const payloadLength = (compression === 0 ? 5 : 9) + packedSize;
        return payloadLength > 0 && payloadLength <= src.length ? payloadLength : src.length;
    }

    static getUncompressedPacket(src: Uint8Array): Uint8Array {
        const packet = new Packet(src);
        const compression = packet.g1();
        const packedSize = packet.g4();

        if (packedSize < 0 || (Js5.maxsize !== 0 && Js5.maxsize < packedSize)) {
            throw new Error('Invalid JS5 packed size');
        }

        if (compression === 0) {
            const out = new Uint8Array(packedSize);
            packet.gdata(packedSize, 0, out);
            return out;
        }

        const unpackedSize = packet.g4();
        if (unpackedSize < 0 || (Js5.maxsize !== 0 && Js5.maxsize < unpackedSize)) {
            throw new Error('Invalid JS5 unpacked size');
        }

        if (compression === 1) {
            return bunzip2(src.subarray(9, 9 + packedSize));
        }

        if (compression === 2) {
            return gunzipSync(src.subarray(9, 9 + packedSize));
        }

        throw new Error(`Unsupported JS5 compression ${compression}`);
    }

    decodeIndex(src: Uint8Array): void {
        this.crc = Packet.getcrc(src, 0, src.length);
        const packet = new Packet(Js5.getUncompressedPacket(src));
        const version = packet.g1();
        if (version !== 5) {
            throw new Error(`Unsupported JS5 index version ${version}`);
        }

        const hasNames = packet.g1();
        this.size = packet.g2();
        this.groupIds = new Int32Array(this.size);

        let groupId = 0;
        let maxGroupId = -1;
        for (let i = 0; i < this.size; i++) {
            groupId += packet.g2();
            this.groupIds[i] = groupId;
            if (groupId > maxGroupId) {
                maxGroupId = groupId;
            }
        }

        const groupLimit = maxGroupId + 1;
        this.packed = new Array(groupLimit).fill(null);
        this.unpacked = new Array(groupLimit).fill(null);
        this.groupChecksums = new Int32Array(groupLimit);
        this.groupVersions = new Int32Array(groupLimit);
        this.groupSizes = new Int32Array(groupLimit);
        this.fileIds = new Array(groupLimit);

        if (hasNames !== 0) {
            this.groupNameHash = new Int32Array(groupLimit);
            for (let i = 0; i < this.size; i++) {
                this.groupNameHash[this.groupIds[i]] = packet.g4();
            }
            this.groupNameHashTable = new IntHashTable(this.groupNameHash);
        }

        for (let i = 0; i < this.size; i++) {
            this.groupChecksums[this.groupIds[i]] = packet.g4();
        }

        for (let i = 0; i < this.size; i++) {
            this.groupVersions[this.groupIds[i]] = packet.g4();
        }

        for (let i = 0; i < this.size; i++) {
            this.groupSizes[this.groupIds[i]] = packet.g2();
        }

        for (let i = 0; i < this.size; i++) {
            const id = this.groupIds[i];
            const count = this.groupSizes[id];
            const ids = new Int32Array(count);
            let fileId = 0;
            let maxFileId = -1;

            for (let j = 0; j < count; j++) {
                fileId += packet.g2();
                ids[j] = fileId;
                if (fileId > maxFileId) {
                    maxFileId = fileId;
                }
            }

            this.fileIds[id] = ids;
            this.unpacked[id] = new Array(maxFileId + 1).fill(null);
        }

        if (hasNames !== 0) {
            this.fileNameHashTable = new Array(groupLimit);
            this.fileNameHashes = new Array(groupLimit).fill(null);

            for (let i = 0; i < this.size; i++) {
                const group = this.groupIds[i];
                const count = this.groupSizes[group];
                const hashes = new Int32Array(this.unpacked[group]?.length ?? 0);

                for (let j = 0; j < count; j++) {
                    hashes[this.fileIds[group][j]] = packet.g4();
                }

                this.fileNameHashTable[group] = hashes;
                this.fileNameHashes[group] = new IntHashTable(hashes);
            }
        }
    }

    setPackedGroup(group: number, data: Uint8Array | null): void {
        this.packed[group] = data;
    }

    getGroupCount(): number {
        return this.unpacked.length;
    }

    getFileIdLimit(group: number): number {
        return this.unpacked[group]?.length ?? 0;
    }

    getFileList(group: number): Int32Array {
        return this.fileIds[group];
    }

    getGroupId(name: string): number {
        return this.groupNameHashTable?.find(JString.hash(name.toLowerCase())) ?? -1;
    }

    getFileId(group: number, name: string): number {
        return this.fileNameHashes[group]?.find(JString.hash(name.toLowerCase())) ?? -1;
    }

    getFileByName(file: string, group: string): Uint8Array | null {
        const groupId = this.getGroupId(group);
        if (groupId < 0) {
            return null;
        }

        const fileId = this.getFileId(groupId, file);
        return fileId < 0 ? null : this.getFile(fileId, groupId);
    }

    getFile(file: number, group?: number): Uint8Array | null {
        if (typeof group === 'undefined') {
            if (this.unpacked.length === 1) {
                return this.fetchFile(0, file, null);
            }

            const files = this.unpacked[file];
            if (files && files.length === 1) {
                return this.fetchFile(file, 0, null);
            }

            throw new Error('Ambiguous JS5 file lookup');
        }

        return this.fetchFile(group, file, null);
    }

    peekFile(file: number, group?: number): Uint8Array | null {
        return this.getFile(file, group);
    }

    requestDownload(group: number, file: number): boolean;
    requestDownload(group: string, file: string): boolean;
    requestDownload(group: number | string, file: number | string): boolean {
        if (typeof group === 'string' || typeof file === 'string') {
            if (typeof group !== 'string' || typeof file !== 'string') {
                return false;
            }

            const groupId = this.getGroupId(group);
            if (groupId < 0) {
                return false;
            }

            const fileId = this.getFileId(groupId, file);
            if (fileId < 0) {
                return false;
            }

            return this.requestDownload(groupId, fileId);
        }

        if (!this.validFile(group, file)) {
            return false;
        }

        if (this.unpacked[group]?.[file]) {
            return true;
        }

        if (this.packed[group] === null) {
            this.requestGroupDownload2(group);
            return this.packed[group] !== null;
        }

        return true;
    }

    requestFullDownload(): boolean {
        let ready = true;
        for (let i = 0; i < this.groupIds.length; i++) {
            const group = this.groupIds[i];
            if (this.packed[group] === null) {
                this.requestGroupDownload2(group);
                if (this.packed[group] === null) {
                    ready = false;
                }
            }
        }
        return ready;
    }

    requestGroupDownload(group: number): boolean {
        if (this.packed[group] === null) {
            this.requestGroupDownload2(group);
        }
        return this.packed[group] !== null;
    }

    async requestGroupDownloadAsync(group: number): Promise<boolean> {
        this.requestGroupDownload2(group);
        return this.requestGroupDownload(group);
    }

    requestGroupDownload2(group: number): void {}

    updateCacheHint(group: number): void {}

    discardFiles(group: number): void {
        this.unpacked[group]?.fill(null);
    }

    discardAllFiles(): void {
        for (const files of this.unpacked) {
            files?.fill(null);
        }
    }

    fetchFile(group: number, file: number, key: ArrayLike<number> | null): Uint8Array | null {
        if (!this.validFile(group, file)) {
            return null;
        }

        const files = this.unpacked[group]!;
        if (files[file] === null) {
            if (!this.unpackGroupData(group, key)) {
                this.requestGroupDownload2(group);
                if (!this.unpackGroupData(group, key)) {
                    return null;
                }
            }
        }

        const data = files[file];
        if (this.discardUnpacked) {
            files[file] = null;
        }
        return data;
    }

    unpackGroupData(group: number, key: ArrayLike<number> | null): boolean {
        const packed = this.packed[group];
        if (packed === null) {
            return false;
        }

        const count = this.groupSizes[group];
        const files = this.unpacked[group]!;
        const ids = this.fileIds[group];

        let complete = true;
        for (let i = 0; i < count; i++) {
            if (files[ids[i]] === null) {
                complete = false;
                break;
            }
        }
        if (complete) {
            return true;
        }

        let src: Uint8Array;
        if (!key || (key[0] === 0 && key[1] === 0 && key[2] === 0 && key[3] === 0)) {
            src = packed;
        } else {
            src = packed.slice();
            new Packet(src).tinydec(key, Js5.getPackedPayloadLength(src));
        }

        const unpacked = Js5.getUncompressedPacket(src);
        if (this.discardPacked) {
            this.packed[group] = null;
        }

        if (count > 1) {
            const chunkCount = unpacked[unpacked.length - 1] & 0xff;
            const tablePos = unpacked.length - 1 - count * chunkCount * 4;
            const sizes = new Int32Array(count);
            const packet = new Packet(unpacked);
            packet.pos = tablePos;

            for (let chunk = 0; chunk < chunkCount; chunk++) {
                let size = 0;
                for (let file = 0; file < count; file++) {
                    size += packet.g4();
                    sizes[file] += size;
                }
            }

            for (let file = 0; file < count; file++) {
                if (files[ids[file]] === null) {
                    files[ids[file]] = new Uint8Array(sizes[file]);
                }
                sizes[file] = 0;
            }

            packet.pos = tablePos;
            let srcPos = 0;
            for (let chunk = 0; chunk < chunkCount; chunk++) {
                let size = 0;
                for (let file = 0; file < count; file++) {
                    size += packet.g4();
                    files[ids[file]]!.set(unpacked.subarray(srcPos, srcPos + size), sizes[file]);
                    sizes[file] += size;
                    srcPos += size;
                }
            }
        } else {
            files[ids[0]] = unpacked;
        }

        return true;
    }

    private validFile(group: number, file: number): boolean {
        return group >= 0 && group < this.unpacked.length && this.unpacked[group] !== null && file >= 0 && file < this.unpacked[group]!.length;
    }
}

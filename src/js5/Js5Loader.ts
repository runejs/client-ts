import type { Client } from '#/client/Client.js';

import Packet from '#/io/Packet.js';
import Js5 from '#/js5/Js5.js';
import Js5Net from '#/js5/Js5Net.js';

export default class Js5Loader extends Js5 {
    loadedGroups: boolean[] = [];
    loadStatus: boolean = false;
    indexCrc: number = 0;
    remoteEnabled: boolean;
    pending: Map<number, Promise<Uint8Array | null>> = new Map();
    private localLoadToken: number = 0;

    constructor(
        readonly archive: number,
        private readonly net: Js5Net,
        private readonly app: Client,
        discardPacked: boolean,
        discardUnpacked: boolean,
        remoteEnabled: boolean
    ) {
        super(discardPacked, discardUnpacked);
        this.remoteEnabled = remoteEnabled;
        this.net.method280(this, this.archive);
    }

    async requestIndex(crc: number): Promise<void> {
        this.indexCrc = crc;
        let data = await this.readCache(255, this.archive);

        if (!data || Packet.getcrc(data, 0, data.length) !== crc) {
            data = await this.net.request({
                archive: 255,
                group: this.archive,
                urgent: true,
                expectedCrc: crc,
                padding: 0
            });
            await this.writeCache(255, this.archive, data);
        }

        this.decodeIndex(data);
        await this.loadAllLocal();
    }

    override requestGroupDownload2(group: number): void {
        if (this.pending.has(group)) {
            this.net.promote(this.archive, group);
            return;
        }

        void this.fetchGroup(group, true).catch(() => {
            this.packed[group] = null;
            this.loadedGroups[group] = false;
        });
    }

    override async requestGroupDownloadAsync(group: number): Promise<boolean> {
        await this.fetchGroup(group, true);
        return this.packed[group] !== null;
    }

    override updateCacheHint(group: number): void {
        this.net.updateCacheHint(this.archive, group);
    }

    async fetchGroup(group: number, urgent: boolean): Promise<Uint8Array | null> {
        if (group < 0 || group >= this.packed.length || this.groupSizes[group] <= 0) {
            return null;
        }

        const cached = this.packed[group];
        if (cached !== null) {
            return cached;
        }

        const pending = this.pending.get(group);
        if (pending) {
            if (urgent) {
                this.net.promote(this.archive, group);
            }
            return await pending;
        }

        const promise = this.fetchGroup0(group, urgent);
        this.pending.set(group, promise);
        try {
            return await promise;
        } finally {
            this.pending.delete(group);
        }
    }

    private async fetchGroup0(group: number, urgent: boolean): Promise<Uint8Array | null> {
        let data: Uint8Array | undefined;
        if (this.loadedGroups[group]) {
            data = await this.readCache(this.archive, group);
        }

        if (!this.validateGroup(group, data)) {
            this.loadedGroups[group] = false;
            data = await this.net.request({
                archive: this.archive,
                group,
                urgent,
                expectedCrc: this.groupChecksums[group],
                padding: 2
            });

            data[data.length - 2] = this.groupVersions[group] >> 8;
            data[data.length - 1] = this.groupVersions[group];
            await this.writeCache(this.archive, group, data);
        }

        this.packed[group] = data;
        this.loadedGroups[group] = true;
        return data;
    }

    getIndexPercentage(): number {
        if (this.loadStatus) {
            return 100;
        } else if (this.packed.length === 0) {
            const progress = this.net.transferProgress(255, this.archive);
            return progress >= 100 ? 99 : progress;
        } else {
            return 99;
        }
    }

    getIndexLoadProgress(): number {
        let total = 0;
        let done = 0;

        for (let group = 0; group < this.groupSizes.length; group++) {
            if (this.groupSizes[group] > 0) {
                total += 100;
                done += this.getGroupLoadProgress(group);
            }
        }

        return total === 0 ? 100 : (done * 100 / total) | 0;
    }

    getGroupLoadProgress(group: number): number {
        if (this.packed[group] !== null) {
            return 100;
        }

        return this.loadedGroups[group] ? 100 : this.net.transferProgress(this.archive, group);
    }

    stop(): void {
        this.localLoadToken++;
        this.pending.clear();
    }

    private async loadAllLocal(): Promise<void> {
        const token = ++this.localLoadToken;
        this.loadedGroups = new Array(this.packed.length).fill(false);
        this.loadStatus = false;

        if (!this.app.db) {
            this.loadStatus = true;
            return;
        }

        const groups: number[] = [];
        for (let group = 0; group < this.loadedGroups.length; group++) {
            if (this.groupSizes[group] > 0) {
                groups.push(group);
            }
        }

        if (groups.length === 0) {
            this.loadStatus = true;
            return;
        }

        const cached = await this.app.db.readMany(this.archive, groups);
        if (token !== this.localLoadToken) {
            return;
        }

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const data = cached.get(group);
            const valid = this.validateGroup(group, data);
            this.loadedGroups[group] = valid;
        }

        if (token === this.localLoadToken) {
            this.loadStatus = true;
        }
    }

    private validateGroup(group: number, data: Uint8Array | undefined): data is Uint8Array {
        if (!data || data.length < 2) {
            return false;
        }

        const trailer = data.length - 2;
        const version = ((data[trailer] & 0xff) << 8) | (data[trailer + 1] & 0xff);
        const crc = Packet.getcrc(data, 0, trailer);
        return version === this.groupVersions[group] && crc === this.groupChecksums[group];
    }

    private async readCache(archive: number, group: number): Promise<Uint8Array | undefined> {
        try {
            return await this.app.db?.read(archive, group);
        } catch (_e) {
            return undefined;
        }
    }

    private async writeCache(archive: number, group: number, data: Uint8Array): Promise<void> {
        try {
            await this.app.db?.write(archive, group, data);
        } catch (_e) {
            // cache failures are non-fatal
        }
    }
}

import IdkType from '#/config/IdkType.js';
import NpcType from '#/config/NpcType.js';
import ObjType from '#/config/ObjType.js';
import SeqType from '#/config/SeqType.js';

import LruCache from '#/datastruct/LruCache.js';

import Model from '#/dash3d/Model.js';

import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class PlayerModel {
    static modelCache: LruCache<Model> = new LruCache(260);
    static readonly recol1s: number[] = [9104, 10275, 7595, 3610, 7975, 8526, 918, 38802, 24466, 10145, 58654, 5027, 1457, 16565, 34991, 25486];
    static readonly recol1d: number[][] = [
        [6798, 107, 10283, 16, 4797, 7744, 5799, 4634, 33697, 22433, 2983, 54193],
        [8741, 12, 64030, 43162, 7735, 8404, 1701, 38430, 24094, 10153, 56621, 4783, 1341, 16578, 35003, 25239],
        [25238, 8742, 12, 64030, 43162, 7735, 8404, 1701, 38430, 24094, 10153, 56621, 4783, 1341, 16578, 35003],
        [4626, 11146, 6439, 12, 4758, 10270],
        [4550, 4537, 5681, 5673, 5790, 6806, 8076, 4574]
    ];
    static readonly basePartMap: number[] = [8, 11, 4, 6, 9, 7, 10];

    gender: boolean = false;
    appearance: Int32Array = new Int32Array(12);
    transmog: number = -1;
    baseId: bigint = 0n;
    headModelHashToModelCacheID: bigint = -1n;
    colour: Int32Array = new Int32Array(5);

    static resetCache(): void {
        this.modelCache.clear();
    }

    method634(): number {
        return this.transmog === -1 ? (this.colour[4] << 20) + ((this.colour[0] << 25) + (this.appearance[0] << 15)) + (this.appearance[8] << 10) + (this.appearance[11] << 5) + this.appearance[1] : NpcType.list(this.transmog).id + 305419896;
    }

    idkSaveDesign(packet: Packet): void {
        packet.p1(this.gender ? 1 : 0);
        for (let i: number = 0; i < 7; i++) {
            const part: number = this.appearance[PlayerModel.basePartMap[i]];
            if (part === 0) {
                packet.p1(-1);
            } else {
                packet.p1(part - 256);
            }
        }
        for (let i: number = 0; i < 5; i++) {
            packet.p1(this.colour[i]);
        }
    }

    getTempModel(primary: SeqType | null, secondary: SeqType | null, secondaryFrame: number, primaryFrame: number): Model | null {
        if (this.transmog !== -1) {
            return NpcType.list(this.transmog).getTempModel(primary, secondary, secondaryFrame, primaryFrame);
        }

        let hash: bigint = this.baseId;
        let appearance: Int32Array = this.appearance;
        if (primary !== null && (primary.replaceheldleft >= 0 || primary.replaceheldright >= 0)) {
            appearance = new Int32Array(12);
            for (let i: number = 0; i < 12; i++) {
                appearance[i] = this.appearance[i];
            }
            if (primary.replaceheldleft >= 0) {
                hash += BigInt(primary.replaceheldleft - this.appearance[5]) << 8n;
                appearance[5] = primary.replaceheldleft;
            }
            if (primary.replaceheldright >= 0) {
                hash += BigInt(primary.replaceheldright - this.appearance[3]) << 16n;
                appearance[3] = primary.replaceheldright;
            }
        }

        let model: Model | null = PlayerModel.modelCache.find(hash);
        if (model === null) {
            let loading = false;
            for (let i: number = 0; i < 12; i++) {
                const part: number = appearance[i];
                if (part >= 256 && part < 512 && !IdkType.list(part - 256).checkModel()) {
                    loading = true;
                }
                if (part >= 512 && !ObjType.list(part - 512).checkWearModel(this.gender ? 1 : 0)) {
                    loading = true;
                }
            }
            if (loading) {
                if (this.headModelHashToModelCacheID !== -1n) {
                    model = PlayerModel.modelCache.find(this.headModelHashToModelCacheID);
                }
                if (model === null) {
                    return null;
                }
            }
            if (model === null) {
                const models: (Model | null)[] = new TypedArray1d(12, null);
                let count = 0;
                for (let i: number = 0; i < 12; i++) {
                    const part: number = appearance[i];
                    if (part >= 256 && part < 512) {
                        const idkModel: Model | null = IdkType.list(part - 256).getModelNoCheck();
                        if (idkModel !== null) {
                            models[count++] = idkModel;
                        }
                    }
                    if (part >= 512) {
                        const objModel: Model | null = ObjType.list(part - 512).getWearModelNoCheck(this.gender ? 1 : 0);
                        if (objModel !== null) {
                            models[count++] = objModel;
                        }
                    }
                }
                model = Model.combineForAnim(models, count);
                for (let i: number = 0; i < 5; i++) {
                    if (this.colour[i] !== 0) {
                        model.recolour(PlayerModel.recol1d[i][0], PlayerModel.recol1d[i][this.colour[i]]);
                        if (i === 1) {
                            model.recolour(PlayerModel.recol1s[0], PlayerModel.recol1s[this.colour[i]]);
                        }
                    }
                }
                model.prepareAnim();
                model.calculateNormals(64, 850, -30, -50, -30, true);
                PlayerModel.modelCache.put(model, hash);
                this.headModelHashToModelCacheID = hash;
            }
        }

        if (primary === null && secondary === null) {
            return model;
        }

        let primaryTransform = -1;
        let secondaryTransform = -1;
        if (primary?.frames) {
            primaryTransform = primary.frames[primaryFrame];
        }
        if (secondary?.frames) {
            secondaryTransform = secondary.frames[secondaryFrame];
        }

        const animated: Model = Model.copyForAnim(model, true, SeqType.isFrameOpaque(primaryTransform) && SeqType.isFrameOpaque(secondaryTransform), false);
        if (primaryTransform !== -1 && secondaryTransform !== -1) {
            animated.maskAnimate(primaryTransform, secondaryTransform, primary?.walkmerge ?? null);
        } else if (primaryTransform !== -1) {
            animated.animate(primaryTransform);
        } else if (secondaryTransform !== -1) {
            animated.animate(secondaryTransform);
        }
        return animated;
    }

    calcBaseId(): void {
        const part9: number = this.appearance[9];
        const part5: number = this.appearance[5];
        const oldBaseId: bigint = this.baseId;
        this.appearance[5] = part9;
        this.appearance[9] = part5;
        this.baseId = 0n;
        for (let i: number = 0; i < 12; i++) {
            this.baseId <<= 4n;
            if (this.appearance[i] >= 256) {
                this.baseId += BigInt(this.appearance[i] - 256);
            }
        }
        if (this.appearance[0] >= 256) {
            this.baseId += BigInt(this.appearance[0] - 256) >> 4n;
        }
        if (this.appearance[1] >= 256) {
            this.baseId += BigInt(this.appearance[1] - 256) >> 8n;
        }
        for (let i: number = 0; i < 5; i++) {
            this.baseId <<= 3n;
            this.baseId += BigInt(this.colour[i]);
        }
        this.baseId <<= 1n;
        this.baseId += this.gender ? 1n : 0n;
        this.appearance[5] = part5;
        this.appearance[9] = part9;
        if (oldBaseId !== 0n && this.baseId !== oldBaseId) {
            PlayerModel.modelCache.remove(oldBaseId);
        }
    }

    getHeadModel(): Model | null {
        if (this.transmog !== -1) {
            return NpcType.list(this.transmog).getHead();
        }

        let loading = false;
        for (let i: number = 0; i < 12; i++) {
            const part: number = this.appearance[i];
            if (part >= 256 && part < 512 && !IdkType.list(part - 256).checkHead()) {
                loading = true;
            }
            if (part >= 512 && !ObjType.list(part - 512).checkHeadModel(this.gender ? 1 : 0)) {
                loading = true;
            }
        }
        if (loading) {
            return null;
        }

        const models: (Model | null)[] = new TypedArray1d(12, null);
        let count = 0;
        for (let i: number = 0; i < 12; i++) {
            const part: number = this.appearance[i];
            if (part >= 256 && part < 512) {
                const idkModel: Model | null = IdkType.list(part - 256).getHeadNoCheck();
                if (idkModel !== null) {
                    models[count++] = idkModel;
                }
            }
            if (part >= 512) {
                const objModel: Model | null = ObjType.list(part - 512).getHeadModelNoCheck(this.gender ? 1 : 0);
                if (objModel !== null) {
                    models[count++] = objModel;
                }
            }
        }

        const model: Model = Model.combineForAnim(models, count);
        for (let i: number = 0; i < 5; i++) {
            if (this.colour[i] !== 0) {
                model.recolour(PlayerModel.recol1d[i][0], PlayerModel.recol1d[i][this.colour[i]]);
                if (i === 1) {
                    model.recolour(PlayerModel.recol1s[0], PlayerModel.recol1s[this.colour[i]]);
                }
            }
        }
        return model;
    }

    setAppearance(appearance: Int32Array | null, gender: boolean, colour: Int32Array, transmog: number): void {
        if (appearance === null) {
            appearance = new Int32Array(12);
            for (let part: number = 0; part < 7; part++) {
                for (let id: number = 0; id < IdkType.numDefinitions; id++) {
                    const type: IdkType = IdkType.list(id);
                    if (type !== null && !type.disable && part + (gender ? 7 : 0) === type.part) {
                        appearance[PlayerModel.basePartMap[part]] = id + 256;
                        break;
                    }
                }
            }
        }
        this.transmog = transmog;
        this.gender = gender;
        this.appearance = appearance;
        this.colour = colour;
        this.calcBaseId();
    }

    idkChangePart(part: number, forward: boolean): void {
        if (part === 1 && this.gender) {
            return;
        }
        let kit: number = this.appearance[PlayerModel.basePartMap[part]];
        if (kit === 0) {
            return;
        }
        kit -= 256;

        let type: IdkType;
        do {
            if (forward) {
                kit++;
                if (IdkType.numDefinitions <= kit) {
                    kit = 0;
                }
            } else {
                kit--;
                if (kit < 0) {
                    kit = IdkType.numDefinitions - 1;
                }
            }
            type = IdkType.list(kit);
        } while (type === null || type.disable || type.part !== part + (this.gender ? 7 : 0));

        this.appearance[PlayerModel.basePartMap[part]] = kit + 256;
        this.calcBaseId();
    }

    idkChangeGender(gender: boolean): void {
        if (this.gender !== gender) {
            this.setAppearance(null, gender, this.colour, -1);
        }
    }

    idkChangeColour(forward: boolean, part: number): void {
        let colour: number = this.colour[part];
        if (forward) {
            colour++;
            if (colour >= PlayerModel.recol1d[part].length) {
                colour = 0;
            }
        } else {
            colour--;
            if (colour < 0) {
                colour = PlayerModel.recol1d[part].length - 1;
            }
        }
        this.colour[part] = colour;
        this.calcBaseId();
    }
}

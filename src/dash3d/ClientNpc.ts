import NpcType from '#/config/NpcType.js';
import SeqType from '#/config/SeqType.js';
import SpotType from '#/config/SpotType.js';

import ClientEntity from '#/dash3d/ClientEntity.js';

import Model from '#/dash3d/Model.js';

export const enum NpcUpdate {
    HITMARK2 = 0x2,
    ANIM = 0x10,
    FACEENTITY = 0x4,
    SAY = 0x40,
    HITMARK = 0x1,
    CHANGETYPE = 0x80,
    SPOTANIM = 0x20,
    FACESQUARE = 0x8
}

export default class ClientNpc extends ClientEntity {
    type: NpcType | null = null;

    override getTempModel(): Model | null {
        if (this.type == null) {
            return null;
        }

        let model = this.getTempModel2();
        if (model == null) {
            return null;
        }

        model.calcBoundingCylinder();
        this.height = model.minY;

        if (this.spotanimId != -1 && this.spotanimFrame != -1) {
            const spotModel = SpotType.list(this.spotanimId).getTempModel2(this.spotanimFrame);

            if (spotModel != null) {
                const temp: Model = spotModel;
                temp.translate(0, -this.spotanimHeight, 0);

                const models: Model[] = [model, temp];
                model = Model.combine(models, 2);
            }
        }

        if (this.type.size == 1) {
            model.useAABBMouseCheck = true;
        }

        return model;
    }

    private getTempModel2(): Model | null {
        if (!this.type) {
            return null;
        }

        const primary: SeqType | null = this.primaryAnim !== -1 && this.primaryAnimDelay === 0 ? SeqType.list(this.primaryAnim) : null;
        const secondary: SeqType | null = this.secondaryAnim === -1 || (this.readyanim === this.secondaryAnim && primary !== null) ? null : SeqType.list(this.secondaryAnim);
        return this.type.getTempModel(primary, secondary, this.secondaryAnimFrame, this.primaryAnimFrame);
    }

    isReady(): boolean {
        return this.type !== null;
    }
}

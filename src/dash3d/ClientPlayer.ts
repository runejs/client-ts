import ObjType from '#/config/ObjType.js';
import SpotType from '#/config/SpotType.js';
import SeqType from '#/config/SeqType.js';
import { Client } from '#/client/Client.js';

import JString from '#/jstring/JString.js';

import ClientEntity from '#/dash3d/ClientEntity.js';
import Model from '#/dash3d/Model.js';
import PlayerModel from '#/dash3d/PlayerModel.js';

import Packet from '#/io/Packet.js';

export const enum PlayerUpdate {
    APPEARANCE = 0x20,
    ANIM = 0x1,
    FACEENTITY = 0x4,
    SAY = 0x80,
    HITMARK = 0x100,
    FACESQUARE = 0x10,
    CHAT = 0x8,
    BIG_UPDATE = 0x2,
    SPOTANIM = 0x200,
    EXACTMOVE = 0x400,
    HITMARK2 = 0x40,
}

export default class ClientPlayer extends ClientEntity {
    name: string | null = null;
    headiconPrayer: number = -1;
    headiconPk: number = -1;
    team: number = 0;
    combatLevel: number = 0;
    lowMemory: boolean = false;
    model: PlayerModel | null = null;
    y: number = 0;
    locStartCycle: number = 0;
    locStopCycle: number = 0;
    locOffsetX: number = 0;
    locOffsetY: number = 0;
    locOffsetZ: number = 0;
    locModel: Model | null = null;
    minTileX: number = 0;
    minTileZ: number = 0;
    maxTileX: number = 0;
    maxTileZ: number = 0;
    skillLevel: number = 0;

    setAppearance(buf: Packet): void {
        buf.pos = 0;

        const gender: number = buf.g1();
        this.headiconPk = buf.g1b();
        this.headiconPrayer = buf.g1b();
        let transmog: number = -1;
        this.team = 0;
        const appearance: Int32Array = new Int32Array(12);

        for (let part: number = 0; part < 12; part++) {
            const msb: number = buf.g1();
            if (msb === 0) {
                appearance[part] = 0;
            } else {
                appearance[part] = (msb << 8) + buf.g1();
                if (part === 0 && appearance[0] === 65535) {
                    transmog = buf.g2();
                    break;
                }
                if (appearance[part] >= 512) {
                    const team: number = ObjType.list(appearance[part] - 512).team;
                    if (team !== 0) {
                        this.team = team;
                    }
                }
            }
        }

        const colours: Int32Array = new Int32Array(5);
        for (let part: number = 0; part < 5; part++) {
            let colour: number = buf.g1();
            if (colour < 0 || PlayerModel.recol1d[part].length <= colour) {
                colour = 0;
            }
            colours[part] = colour;
        }

        this.readyanim = buf.g2();
        if (this.readyanim === 65535) {
            this.readyanim = -1;
        }

        this.turnleftanim = buf.g2();
        if (this.turnleftanim === 65535) {
            this.turnleftanim = -1;
        }
        this.turnrightanim = this.turnleftanim;

        this.walkanim = buf.g2();
        if (this.walkanim === 65535) {
            this.walkanim = -1;
        }

        this.walkanim_b = buf.g2();
        if (this.walkanim_b === 65535) {
            this.walkanim_b = -1;
        }

        this.walkanim_r = buf.g2();
        if (this.walkanim_r === 65535) {
            this.walkanim_r = -1;
        }

        this.walkanim_l = buf.g2();
        if (this.walkanim_l === 65535) {
            this.walkanim_l = -1;
        }

        this.runanim = buf.g2();
        if (this.runanim === 65535) {
            this.runanim = -1;
        }

        this.name = JString.toScreenName(JString.toRawUsername(buf.g8()));
        this.combatLevel = buf.g1();
        this.skillLevel = buf.g2();
        if (this.model === null) {
            this.model = new PlayerModel();
        }
        this.model.setAppearance(appearance, gender === 1, colours, transmog);
    }

    override getTempModel(): Model | null {
        if (this.model === null) {
            return null;
        }

        let model = this.getTempModel2();
        if (model == null) {
            return null;
        }

        model.calcBoundingCylinder();
        this.height = model.minY;

        if (this.lowMemory) {
            model.useAABBMouseCheck = true;
            return model;
        }

        if (this.spotanimId != -1 && this.spotanimFrame != -1) {
            const spotModel = SpotType.list(this.spotanimId).getTempModel2(this.spotanimFrame);

            if (spotModel != null) {
                const temp: Model = spotModel;
                temp.translate(0, -this.spotanimHeight, 0);

                const models: Model[] = [model, temp];
                model = Model.combine(models, 2);
            }
        }

        if (this.locModel != null) {
            if (Client.loopCycle >= this.locStopCycle) {
                this.locModel = null;
            }

            if (Client.loopCycle >= this.locStartCycle && Client.loopCycle < this.locStopCycle) {
                const loc = this.locModel;
                if (loc) {
                    loc.translate(this.locOffsetX - this.x, this.locOffsetY - this.y, this.locOffsetZ - this.z);

                    if (this.dstYaw == 512) {
                        loc.rotate90();
                        loc.rotate90();
                        loc.rotate90();
                    } else if (this.dstYaw == 1024) {
                        loc.rotate90();
                        loc.rotate90();
                    } else if (this.dstYaw == 1536) {
                        loc.rotate90();
                    }

                    const models: Model[] = [model, loc];
                    model = Model.combine(models, 2);

                    if (this.dstYaw == 512) {
                        loc.rotate90();
                    } else if (this.dstYaw == 1024) {
                        loc.rotate90();
                        loc.rotate90();
                    } else if (this.dstYaw == 1536) {
                        loc.rotate90();
                        loc.rotate90();
                        loc.rotate90();
                    }

                    loc.translate(this.x - this.locOffsetX, this.y - this.locOffsetY, this.z - this.locOffsetZ);
                }
            }
        }

        model.useAABBMouseCheck = true;
        return model;
    }

    getTempModel2(): Model | null {
        if (this.model === null) {
            return null;
        }
        const primary: SeqType | null = this.primaryAnim !== -1 && this.primaryAnimDelay === 0 ? SeqType.list(this.primaryAnim) : null;
        const secondary: SeqType | null = this.secondaryAnim === -1 || this.lowMemory || (this.readyanim === this.secondaryAnim && primary !== null) ? null : SeqType.list(this.secondaryAnim);
        return this.model.getTempModel(primary, secondary, this.secondaryAnimFrame, this.primaryAnimFrame);
    }

    getHeadModel(): Model | null {
        return this.model?.getHeadModel() ?? null;
    }

    isReady(): boolean {
        return this.model !== null;
    }
}

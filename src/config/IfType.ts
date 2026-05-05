import Packet from '#/io/Packet.js';

import Model from '#/dash3d/Model.js';
import PixFont from '#/graphics/PixFont.js';
import PixLoader from '#/graphics/PixLoader.js';

import LruCache from '#/datastruct/LruCache.js';

import Pix32 from '#/graphics/Pix32.js';

import { TypedArray1d } from '#/util/Arrays.js';
import NpcType from '#/config/NpcType.js';
import ObjType from '#/config/ObjType.js';
import SeqType from '#/config/SeqType.js';
import type PlayerModel from '#/dash3d/PlayerModel.js';
import type Js5 from '#/js5/Js5.js';

export const enum ComponentType {
    TYPE_LAYER = 0,
    TYPE_UNUSED = 1, // TODO
    TYPE_INV = 2,
    TYPE_RECT = 3,
    TYPE_TEXT = 4,
    TYPE_GRAPHIC = 5,
    TYPE_MODEL = 6,
    TYPE_INV_TEXT = 7,
    TYPE_TOOLTIP = 8,
    TYPE_LINE = 9,
};

export const enum ButtonType {
    BUTTON_OK = 1,
    BUTTON_TARGET = 2,
    BUTTON_CLOSE = 3,
    BUTTON_TOGGLE = 4,
    BUTTON_SELECT = 5,
    BUTTON_CONTINUE = 6,
};

export default class IfType {
    static list: IfType[][] = [];
    static open: boolean[] = [];
    static modelCache: LruCache<Model> = new LruCache(50);
    static spriteCache: LruCache<Pix32> = new LruCache(200);
    static fontCache: LruCache<PixFont> = new LruCache(20);
    static loadingAsset: boolean = false;
    static interfaces: Js5 | null = null;
    static sprites: Js5 | null = null;
    static models: Js5 | null = null;
    static reportAbuseComId: number = -1;

    animFrame: number = 0;
    animCycle: number = 0;
    id: number = -1;
    parentId: number = -1;
    layerId: number = -1;
    dataX: number = 0;
    dataY: number = 0;
    v3: boolean = false;
    type: number = -1;
    buttonType: number = -1;
    clientCode: number = 0;
    width: number = 0;
    height: number = 0;
    trans: number = 0;
    overLayerId: number = -1;
    x: number = 0;
    y: number = 0;
    scripts: (Int32Array | null)[] | null = null;
    scriptComparator: Uint8Array | null = null;
    scriptOperand: Uint16Array | null = null;
    scrollPos: number = 0;
    scrollPosX: number = 0;
    scrollPosY: number = 0;
    field2500: boolean = false;
    field2536: boolean = false;
    field2488: boolean = false;
    hide: boolean = false;
    children: number[] | null = null;
    childX: number[] | null = null;
    childY: number[] | null = null;
    linkObjType: Int32Array | null = null;
    linkObjNumber: Int32Array | null = null;
    objSwap: boolean = false;
    objOps: boolean = false;
    objUse: boolean = false;
    objReplace: boolean = false;
    marginX: number = 0;
    marginY: number = 0;
    invBackgroundX: Int16Array | null = null;
    invBackgroundY: Int16Array | null = null;
    invBackground: Int32Array | null = null;
    iop: (string | null)[] | null = null;
    fill: boolean = false;
    centre: boolean = false;
    hAlign: number = 0;
    vAlign: number = 0;
    lineHeight: number = 0;
    font: number = 0;
    shadow: boolean = false;
    text: string | null = '';
    text2: string | null = '';
    colour: number = 0;
    colour2: number = 0;
    colourOver: number = 0;
    colour2Over: number = 0;
    graphic: number = -1;
    graphic2: number = -1;
    rotate: number = 0;
    tiling: boolean = false;
    model1Type: number = 1;
    model1Id: number = -1;
    model2Id: number = -1;
    model2Type: number = 1;
    modelAnim: number = -1;
    modelAnim2: number = -1;
    modelZoom: number = 100;
    modelXAn: number = 0;
    modelZAn: number = 0;
    modelYAn: number = 0;
    modelXOf: number = 0;
    modelYOf: number = 0;
    modelSpin: number = 0;
    orthog: boolean = false;
    invobject: number = -1;
    invcount: number = 0;
    field2542: number = 0;
    targetVerb: string | null = '';
    targetBase: string | null = '';
    targetMask: number = 0;
    buttonText: string | null = 'Ok';
    hashook: boolean = false;
    opNames: (string | null)[] | null = null;
    field2544: number = -1;
    subcomponents: IfType[] | null = null;
    field2475: (number | string)[] | null = null;
    field2478: (number | string)[] | null = null;
    field2483: (number | string)[] | null = null;
    field2486: (number | string)[] | null = null;
    field2487: (number | string)[] | null = null;
    field2450: (number | string)[] | null = null;
    field2456: (number | string)[] | null = null;
    field2464: (number | string)[] | null = null;
    field2501: (number | string)[] | null = null;
    field2513: (number | string)[] | null = null;
    field2518: (number | string)[] | null = null;
    field2553: (number | string)[] | null = null;

    static init(interfaces: Js5, sprites: Js5, models: Js5): void {
        this.interfaces = interfaces;
        this.sprites = sprites;
        this.models = models;
        this.list = new Array(interfaces.getGroupCount());
        this.open = new Array(interfaces.getGroupCount()).fill(false);
    }

    static openInterface(group: number): boolean {
        const interfaces = this.interfaces;
        if (!interfaces) {
            return false;
        }

        if (this.open[group]) {
            return true;
        }

        if (!interfaces.requestGroupDownload(group)) {
            return false;
        }

        const limit = interfaces.getFileIdLimit(group);
        if (limit === 0) {
            this.open[group] = true;
            return true;
        }

        if (!this.list[group]) {
            this.list[group] = new Array(limit);
        }

        for (let file = 0; file < limit; file++) {
            if (!this.list[group][file]) {
                const data = interfaces.getFile(file, group);
                if (!data) {
                    continue;
                }

                this.list[group][file] = new IfType();
                this.list[group][file].id = (group << 16) + file;
                this.list[group][file].parentId = (group << 16) + file;
                if (data[0] === 0xFF) {
                    this.list[group][file].decode3(new Packet(data), group);
                } else {
                    this.list[group][file].decode(new Packet(data), group);
                }
            }
        }

        this.open[group] = true;
        return true;
    }

    static async openInterfaceAsync(group: number): Promise<boolean> {
        const interfaces = this.interfaces;
        if (!interfaces || group < 0 || group >= this.open.length) {
            return false;
        }
        if (this.open[group]) {
            return true;
        }
        if (!this.openInterface(group)) {
            if (!(await interfaces.requestGroupDownloadAsync(group))) {
                return false;
            }
        }
        return this.openInterface(group);
    }

    static closeInterface(group: number): void {
        const interfaces = this.interfaces;
        if (group === -1 || group < 0 || group >= this.open.length || !this.open[group]) {
            return;
        }

        interfaces?.discardFiles(group);
        const components = this.list[group];
        if (!components) {
            this.open[group] = false;
            return;
        }

        let empty = true;
        for (let file = 0; file < components.length; file++) {
            const com = components[file];
            if (!com) {
                continue;
            }
            if (com.type === ComponentType.TYPE_INV) {
                empty = false;
            } else {
                components[file] = undefined as unknown as IfType;
            }
        }

        if (empty) {
            this.list[group] = undefined as unknown as IfType[];
        }
        this.open[group] = false;
    }

    static get(id: number): IfType | null {
        const group = id >> 16;
        const file = id & 0xffff;
        if (!this.list[group] || !this.list[group][file]) {
            if (!this.openInterface(group)) {
                return null;
            }
        }
        return this.list[group][file];
    }

    static async getAsync(id: number): Promise<IfType | null> {
        const group = id >> 16;
        const file = id & 0xffff;
        if (!this.list[group] || !this.list[group][file]) {
            if (!(await this.openInterfaceAsync(group))) {
                return null;
            }
        }
        return this.list[group]?.[file] ?? null;
    }

    static resetCache(): void {
        this.spriteCache.clear();
        this.modelCache.clear();
        this.fontCache.clear();
    }

    static decodeHook(data: Packet): (number | string)[] | null {
        const count = data.g1();
        if (count === 0) {
            return null;
        }

        const hook: (number | string)[] = new Array(count);
        for (let i = 0; i < count; i++) {
            const type = data.g1();
            if (type === 0) {
                hook[i] = data.g4();
            } else if (type === 1) {
                hook[i] = data.gjstr();
            }
        }
        return hook;
    }

    decode(data: Packet, group: number): void {
        this.v3 = false;
        this.type = data.g1();
        this.buttonType = data.g1();
        this.clientCode = data.g2();
        this.dataX = this.x = data.g2b();
        this.dataY = this.y = data.g2b();
        this.width = data.g2();
        this.height = data.g2();
        this.trans = data.g1();
        this.layerId = data.g2();
        if (this.layerId === 65535) {
            this.layerId = -1;
        }
        this.overLayerId = data.g2();
        if (this.overLayerId === 65535) {
            this.overLayerId = -1;
        }

        const scriptStackCount = data.g1();
        if (scriptStackCount > 0) {
            this.scriptComparator = new Uint8Array(scriptStackCount);
            this.scriptOperand = new Uint16Array(scriptStackCount);
            for (let i = 0; i < scriptStackCount; i++) {
                this.scriptComparator[i] = data.g1();
                this.scriptOperand[i] = data.g2();
            }
        }

        const scriptCount = data.g1();
        if (scriptCount > 0) {
            this.scripts = new TypedArray1d(scriptCount, null);
            for (let i = 0; i < scriptCount; i++) {
                const opcodeCount = data.g2();
                const script = new Int32Array(opcodeCount);
                this.scripts[i] = script;
                for (let j = 0; j < opcodeCount; j++) {
                    const opcode = data.g2();
                    script[j] = opcode === 65535 ? -1 : opcode;
                }
            }
        }

        if (this.type === ComponentType.TYPE_LAYER) {
            this.scrollPos = data.g2();
            this.hide = data.g1() === 1;
        }
        if (this.type === ComponentType.TYPE_UNUSED) {
            data.g2();
            data.g1();
        }
        if (this.type === ComponentType.TYPE_INV) {
            this.linkObjType = new Int32Array(this.width * this.height);
            this.linkObjNumber = new Int32Array(this.width * this.height);
            this.objSwap = data.g1() === 1;
            this.objOps = data.g1() === 1;
            this.objUse = data.g1() === 1;
            this.objReplace = data.g1() === 1;
            this.marginX = data.g1();
            this.marginY = data.g1();
            this.invBackgroundX = new Int16Array(20);
            this.invBackgroundY = new Int16Array(20);
            this.invBackground = new Int32Array(20);
            this.invBackground.fill(-1);
            for (let i = 0; i < 20; i++) {
                if (data.g1() === 1) {
                    this.invBackgroundX[i] = data.g2b();
                    this.invBackgroundY[i] = data.g2b();
                    this.invBackground[i] = data.g4();
                }
            }
            this.iop = new TypedArray1d(5, null);
            for (let i = 0; i < 5; i++) {
                this.iop[i] = data.gjstr() || null;
            }
        }
        if (this.type === ComponentType.TYPE_RECT) {
            this.fill = data.g1() === 1;
        }
        if (this.type === ComponentType.TYPE_TEXT || this.type === ComponentType.TYPE_UNUSED) {
            this.hAlign = data.g1();
            this.vAlign = data.g1();
            this.lineHeight = data.g1();
            this.centre = this.hAlign === 1;
            this.font = data.g2();
            this.shadow = data.g1() === 1;
        }
        if (this.type === ComponentType.TYPE_TEXT) {
            this.text = data.gjstr();
            this.text2 = data.gjstr();
        }
        if (this.type === ComponentType.TYPE_UNUSED || this.type === ComponentType.TYPE_RECT || this.type === ComponentType.TYPE_TEXT) {
            this.colour = data.g4();
        }
        if (this.type === ComponentType.TYPE_RECT || this.type === ComponentType.TYPE_TEXT) {
            this.colour2 = data.g4();
            this.colourOver = data.g4();
            this.colour2Over = data.g4();
        }
        if (this.type === ComponentType.TYPE_GRAPHIC) {
            this.graphic = data.g4();
            this.graphic2 = data.g4();
        }
        if (this.type === ComponentType.TYPE_MODEL) {
            this.model1Type = 1;
            this.model1Id = data.g2();
            if (this.model1Id === 65535) this.model1Id = -1;
            this.model2Type = 1;
            this.model2Id = data.g2();
            if (this.model2Id === 65535) this.model2Id = -1;
            this.modelAnim = data.g2();
            if (this.modelAnim === 65535) this.modelAnim = -1;
            this.modelAnim2 = data.g2();
            if (this.modelAnim2 === 65535) this.modelAnim2 = -1;
            this.modelZoom = data.g2();
            this.modelXAn = data.g2();
            this.modelYAn = data.g2();
        }
        if (this.type === ComponentType.TYPE_INV_TEXT) {
            this.linkObjType = new Int32Array(this.width * this.height);
            this.linkObjNumber = new Int32Array(this.width * this.height);
            this.hAlign = data.g1();
            this.centre = this.hAlign === 1;
            this.font = data.g2();
            this.shadow = data.g1() === 1;
            this.colour = data.g4();
            this.marginX = data.g2b();
            this.marginY = data.g2b();
            this.objOps = data.g1() === 1;
            this.iop = new TypedArray1d(5, null);
            for (let i = 0; i < 5; i++) {
                this.iop[i] = data.gjstr() || null;
            }
        }
        if (this.type === ComponentType.TYPE_TOOLTIP) {
            this.text = data.gjstr();
        }
        if (this.buttonType === ButtonType.BUTTON_TARGET || this.type === ComponentType.TYPE_INV) {
            this.targetVerb = data.gjstr();
            this.targetBase = data.gjstr();
            this.targetMask = data.g2();
        }
        if (this.buttonType === ButtonType.BUTTON_OK || this.buttonType === ButtonType.BUTTON_TOGGLE || this.buttonType === ButtonType.BUTTON_SELECT || this.buttonType === ButtonType.BUTTON_CONTINUE) {
            this.buttonText = data.gjstr();
            if (this.buttonText.length === 0) {
                this.buttonText = this.buttonType === ButtonType.BUTTON_OK ? 'Ok' : this.buttonType === ButtonType.BUTTON_CONTINUE ? 'Continue' : 'Select';
            }
        }
    }

    decode3(data: Packet, group: number): void {
        data.g1();
        this.v3 = true;
        this.type = data.g1();
        this.clientCode = data.g2();
        this.dataX = this.x = data.g2b();
        this.dataY = this.y = data.g2b();
        this.width = data.g2();
        this.height = this.type === 9 ? data.g2b() : data.g2();
        this.layerId = data.g2();
        if (this.layerId === 65535) {
            this.layerId = -1;
        }
        this.hide = data.g1() === 1;
        this.hashook = data.g1() === 1;

        if (this.type === ComponentType.TYPE_LAYER) {
            this.scrollPosX = data.g2();
            this.scrollPosY = data.g2();
        }
        if (this.type === ComponentType.TYPE_GRAPHIC) {
            this.graphic = data.g4();
            this.rotate = data.g2();
            this.tiling = data.g1() === 1;
            this.trans = data.g1();
        }
        if (this.type === ComponentType.TYPE_MODEL) {
            this.model1Type = 1;
            this.model1Id = data.g2();
            if (this.model1Id === 65535) this.model1Id = -1;
            this.modelXOf = data.g2b();
            this.modelYOf = data.g2b();
            this.modelXAn = data.g2();
            this.modelYAn = data.g2();
            this.modelZAn = data.g2();
            this.modelZoom = data.g2();
            this.modelAnim = data.g2();
            if (this.modelAnim === 65535) this.modelAnim = -1;
            this.orthog = data.g1() === 1;
        }
        if (this.type === ComponentType.TYPE_TEXT) {
            this.font = data.g2();
            this.text = data.gjstr();
            this.lineHeight = data.g1();
            this.hAlign = data.g1();
            this.vAlign = data.g1();
            this.shadow = data.g1() === 1;
            this.colour = data.g4();
        }
        if (this.type === ComponentType.TYPE_RECT) {
            this.colour = data.g4();
            this.fill = data.g1() === 1;
            this.trans = data.g1();
        }
        if (this.type === 9) {
            data.g1();
            this.colour = data.g4();
        }

        if (this.hashook) {
            this.field2483 = IfType.decodeHook(data);
            this.field2487 = IfType.decodeHook(data);
            this.field2450 = IfType.decodeHook(data);
            this.field2513 = IfType.decodeHook(data);
            this.field2464 = IfType.decodeHook(data);
            this.field2478 = IfType.decodeHook(data);
            this.field2475 = IfType.decodeHook(data);
            IfType.decodeHook(data);
            this.field2456 = IfType.decodeHook(data);
            this.field2518 = IfType.decodeHook(data);
            IfType.decodeHook(data);
            this.field2501 = IfType.decodeHook(data);
            this.field2553 = IfType.decodeHook(data);
            this.field2486 = IfType.decodeHook(data);
            this.objOps = data.g1() === 1;
            this.field2542 = data.g2();
            this.field2500 = data.g1() === 1;
            data.g1();
            const ops = data.g1();
            if (ops > 0) {
                this.opNames = new Array(ops);
                for (let i = 0; i < ops; i++) {
                    this.opNames[i] = data.gjstr();
                }
            }
            this.field2544 = data.g2();
            if (this.field2544 === 65535) {
                this.field2544 = -1;
            }
        }
    }

    swapSlots(src: number, dst: number) {
        if (!this.linkObjType || !this.linkObjNumber) {
            return;
        }

        let tmp = this.linkObjType[src];
        this.linkObjType[src] = this.linkObjType[dst];
        this.linkObjType[dst] = tmp;

        tmp = this.linkObjNumber[src];
        this.linkObjNumber[src] = this.linkObjNumber[dst];
        this.linkObjNumber[dst] = tmp;
    }

    getTempModel(seq: SeqType | null, frame: number, active: boolean, player: PlayerModel | null): Model | null {
        IfType.loadingAsset = false;
        let id: number;
        let type: number;
        if (active) {
            id = this.model2Id;
            type = this.model2Type;
        } else {
            type = this.model1Type;
            id = this.model1Id;
        }

        if (type === 0) {
            return null;
        }
        if (type === 1 && id === -1) {
            return null;
        }

        let model = IfType.modelCache.find(BigInt((type << 16) + id));
        if (model === null) {
            if (type === 1) {
                model = Model.load(IfType.models!, id);
                if (model === null) {
                    IfType.loadingAsset = true;
                    return null;
                }
                model.prepareAnim();
                model.calculateNormals(64, 768, -50, -10, -50, true);
            }
            if (type === 2) {
                model = NpcType.list(id).getHead();
                if (model === null) {
                    IfType.loadingAsset = true;
                    return null;
                }
                model.prepareAnim();
                model.calculateNormals(64, 768, -50, -10, -50, true);
            }
            if (type === 3) {
                if (player === null) {
                    return null;
                }
                model = player.getHeadModel();
                if (model === null) {
                    IfType.loadingAsset = true;
                    return null;
                }
                model.prepareAnim();
                model.calculateNormals(64, 768, -50, -10, -50, true);
            }
            if (type === 4) {
                const obj = ObjType.list(id);
                model = obj.getModelLit(false, 10);
                if (model === null) {
                    IfType.loadingAsset = true;
                    return null;
                }
                model.prepareAnim();
                model.calculateNormals(obj.ambient + 64, obj.contrast + 768, -50, -10, -50, true);
            }
            if (model !== null) {
                IfType.modelCache.put(model, BigInt((type << 16) + id));
            }
        }

        if (model === null) {
            return null;
        }

        if (seq !== null) {
            model = seq.animateModelWithExtra(frame, model);
        }

        return model;
    }

    getInvBackground(slot: number): Pix32 | null {
        IfType.loadingAsset = false;
        if (!this.invBackground || slot < 0 || slot >= this.invBackground.length) {
            return null;
        }

        return IfType.getSprite(this.invBackground[slot]);
    }

    getGraphic(active: boolean): Pix32 | null {
        IfType.loadingAsset = false;
        return IfType.getSprite(active ? this.graphic2 : this.graphic);
    }

    getFont(): PixFont | null {
        IfType.loadingAsset = false;
        if (this.font === 65535 || !IfType.sprites) {
            return null;
        }

        let font = IfType.fontCache.find(BigInt(this.font));
        if (font) {
            return font;
        }

        font = PixLoader.makePixFontFromJs5Id(IfType.sprites, this.font, 0);
        if (font) {
            IfType.fontCache.put(font, BigInt(this.font));
        } else {
            IfType.loadingAsset = true;
        }
        return font;
    }

    private static getSprite(id: number): Pix32 | null {
        this.loadingAsset = false;
        if (id === -1 || !this.sprites) {
            return null;
        }

        const key = BigInt(id);
        let image = this.spriteCache.find(key);
        if (image) {
            return image;
        }

        image = PixLoader.makePix32FromJs5Id(this.sprites, id, 0);
        if (image) {
            this.spriteCache.put(image, key);
        } else {
            this.loadingAsset = true;
        }
        return image;
    }
}

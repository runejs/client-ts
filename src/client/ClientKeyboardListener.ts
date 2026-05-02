import { CanvasEnabledKeys, KeyCodes } from '#/client/KeyCodes.js';

export default class ClientKeyboardListener {
    static instance: ClientKeyboardListener | null = new ClientKeyboardListener();
    static keyHeldReadPos: number = 0;
    static idleTimer: number = 0;
    static KEY_CODE_MAP: number[] = new Array(600).fill(-1);
    static keyHeldBuffer: Int32Array = new Int32Array(128);
    static keyWritePos: number = 0;
    static keyReadPos: number = 0;
    static keyCodeBuffer: Int32Array = new Int32Array(128);
    static keyChBuffer: Int32Array = new Int32Array(128);
    static keyHeldWritePos: number = 0;
    static lastKeyWritePos: number = 0;
    static keyHeld: number[] = new Array(112).fill(0);
    static code: number = 0;
    static ch: number = 0;

    private static readonly keydown = (event: KeyboardEvent): void => ClientKeyboardListener.instance?.keyPressed(event);
    private static readonly keyup = (event: KeyboardEvent): void => ClientKeyboardListener.instance?.keyReleased(event);
    private static readonly blur = (event: FocusEvent): void => ClientKeyboardListener.instance?.focusLost(event);
    private static readonly focus = (event: FocusEvent): void => ClientKeyboardListener.instance?.focusGained(event);

    static setupKeyCodeMap(): void {
        const map = ClientKeyboardListener.KEY_CODE_MAP;
        map.fill(-1);

        map[8] = 85;
        map[9] = 80;
        map[10] = 84;
        map[12] = 91;
        map[16] = 81;
        map[17] = 82;
        map[18] = 86;
        map[27] = 0;
        map[32] = 83;
        map[33] = 104;
        map[34] = 105;
        map[35] = 103;
        map[36] = 102;
        map[37] = 96;
        map[38] = 98;
        map[39] = 97;
        map[40] = 99;
        map[48] = 25;
        map[49] = 16;
        map[50] = 17;
        map[51] = 18;
        map[52] = 19;
        map[53] = 20;
        map[54] = 21;
        map[55] = 22;
        map[56] = 23;
        map[57] = 24;
        map[65] = 48;
        map[66] = 68;
        map[67] = 66;
        map[68] = 50;
        map[69] = 34;
        map[70] = 51;
        map[71] = 52;
        map[72] = 53;
        map[73] = 39;
        map[74] = 54;
        map[75] = 55;
        map[76] = 56;
        map[77] = 70;
        map[78] = 69;
        map[79] = 40;
        map[80] = 41;
        map[81] = 32;
        map[82] = 35;
        map[83] = 49;
        map[84] = 36;
        map[85] = 38;
        map[86] = 67;
        map[87] = 33;
        map[88] = 65;
        map[89] = 37;
        map[90] = 64;
        map[112] = 1;
        map[113] = 2;
        map[114] = 3;
        map[115] = 4;
        map[116] = 5;
        map[117] = 6;
        map[118] = 7;
        map[119] = 8;
        map[120] = 9;
        map[121] = 10;
        map[122] = 11;
        map[123] = 12;
        map[127] = 85;
        map[155] = 100;

        map[44] = 71;
        map[45] = 26;
        map[46] = 72;
        map[47] = 73;
        map[59] = 57;
        map[61] = 27;
        map[91] = 42;
        map[92] = 74;
        map[93] = 43;
        map[192] = 28;
        map[222] = 58;
    }

    static addListeners(target: HTMLElement): void {
        target.addEventListener('keydown', ClientKeyboardListener.keydown, false);
        target.addEventListener('keyup', ClientKeyboardListener.keyup, false);
        target.addEventListener('blur', ClientKeyboardListener.blur, false);
        target.addEventListener('focus', ClientKeyboardListener.focus, false);
    }

    static removeListeners(target: HTMLElement): void {
        target.removeEventListener('keydown', ClientKeyboardListener.keydown, false);
        target.removeEventListener('keyup', ClientKeyboardListener.keyup, false);
        target.removeEventListener('blur', ClientKeyboardListener.blur, false);
        target.removeEventListener('focus', ClientKeyboardListener.focus, false);
    }

    static shutdown(): void {
        ClientKeyboardListener.instance = null;
    }

    static loop(): void {
        ClientKeyboardListener.cycle();
    }

    static cycle(): void {
        ClientKeyboardListener.keyReadPos = ClientKeyboardListener.lastKeyWritePos;
        if (ClientKeyboardListener.keyHeldReadPos < 0) {
            ClientKeyboardListener.keyHeld.fill(0);
            ClientKeyboardListener.keyHeldReadPos = ClientKeyboardListener.keyHeldWritePos;
        } else {
            while (ClientKeyboardListener.keyHeldReadPos !== ClientKeyboardListener.keyHeldWritePos) {
                const key = ClientKeyboardListener.keyHeldBuffer[ClientKeyboardListener.keyHeldWritePos];
                ClientKeyboardListener.keyHeldWritePos = (ClientKeyboardListener.keyHeldWritePos + 1) & 0x7f;
                if (key < 0) {
                    ClientKeyboardListener.keyHeld[~key] = 0;
                } else {
                    ClientKeyboardListener.keyHeld[key] = 1;
                }
            }
        }
        ClientKeyboardListener.lastKeyWritePos = ClientKeyboardListener.keyWritePos;
    }

    static pollKey(): boolean {
        if (ClientKeyboardListener.keyReadPos === ClientKeyboardListener.lastKeyWritePos) {
            return false;
        }
        ClientKeyboardListener.code = ClientKeyboardListener.keyCodeBuffer[ClientKeyboardListener.keyReadPos];
        ClientKeyboardListener.ch = ClientKeyboardListener.keyChBuffer[ClientKeyboardListener.keyReadPos];
        ClientKeyboardListener.keyReadPos = (ClientKeyboardListener.keyReadPos + 1) & 0x7f;
        return true;
    }

    static getIdleTimer(): number {
        return ClientKeyboardListener.idleTimer++;
    }

    static method870(event: KeyboardEvent): number {
        let ch = -1;
        if (event.key.length === 1) {
            ch = event.key.charCodeAt(0);
        }
        if (event.ctrlKey && ch > 0) {
            if ((ch >= 65 && ch <= 93) || ch === 95) {
                ch -= 64;
            } else if (ch >= 97 && ch <= 122) {
                ch -= 96;
            }
        }
        if (ch <= 0 || ch >= 256) {
            ch = -1;
        }
        return ch;
    }

    keyTyped(event: KeyboardEvent): void {
        event.preventDefault();
    }

    focusGained(_event: FocusEvent): void {
    }

    focusLost(_event: FocusEvent): void {
        if (ClientKeyboardListener.instance) {
            ClientKeyboardListener.keyHeldReadPos = -1;
        }
    }

    keyPressed(event: KeyboardEvent): void {
        if (!ClientKeyboardListener.instance) {
            return;
        }

        ClientKeyboardListener.idleTimer = 0;
        const javaCode = KeyCodes.get(event.key)?.code ?? -1;
        let code = javaCode >= 0 && javaCode < ClientKeyboardListener.KEY_CODE_MAP.length ? ClientKeyboardListener.KEY_CODE_MAP[javaCode] : -1;
        if ((code & 0x80) !== 0) {
            code = -1;
        }
        const ch = code === 85 || code === 80 || code === 84 || code === 0 || code === 101 ? -1 : ClientKeyboardListener.method870(event);

        if (ClientKeyboardListener.keyHeldReadPos >= 0 && code >= 0) {
            ClientKeyboardListener.keyHeldBuffer[ClientKeyboardListener.keyHeldReadPos] = code;
            ClientKeyboardListener.keyHeldReadPos = (ClientKeyboardListener.keyHeldReadPos + 1) & 0x7f;
            if (ClientKeyboardListener.keyHeldReadPos === ClientKeyboardListener.keyHeldWritePos) {
                ClientKeyboardListener.keyHeldReadPos = -1;
            }
        }

        if (code >= 0 || ch >= 0) {
            const next = (ClientKeyboardListener.keyWritePos + 1) & 0x7f;
            if (ClientKeyboardListener.keyReadPos !== next) {
                ClientKeyboardListener.keyCodeBuffer[ClientKeyboardListener.keyWritePos] = code;
                ClientKeyboardListener.keyChBuffer[ClientKeyboardListener.keyWritePos] = ch;
                ClientKeyboardListener.keyWritePos = next;
            }
        }

        if (!CanvasEnabledKeys.includes(event.key)) {
            event.preventDefault();
        }
    }

    keyReleased(event: KeyboardEvent): void {
        if (!ClientKeyboardListener.instance) {
            return;
        }

        ClientKeyboardListener.idleTimer = 0;
        const javaCode = KeyCodes.get(event.key)?.code ?? -1;
        const code = javaCode >= 0 && javaCode < ClientKeyboardListener.KEY_CODE_MAP.length ? ClientKeyboardListener.KEY_CODE_MAP[javaCode] & 0xffffff7f : -1;
        if (ClientKeyboardListener.keyHeldReadPos >= 0 && code >= 0) {
            ClientKeyboardListener.keyHeldBuffer[ClientKeyboardListener.keyHeldReadPos] = ~code;
            ClientKeyboardListener.keyHeldReadPos = (ClientKeyboardListener.keyHeldReadPos + 1) & 0x7f;
            if (ClientKeyboardListener.keyHeldReadPos === ClientKeyboardListener.keyHeldWritePos) {
                ClientKeyboardListener.keyHeldReadPos = -1;
            }
        }

        if (!CanvasEnabledKeys.includes(event.key)) {
            event.preventDefault();
        }
    }
}

ClientKeyboardListener.setupKeyCodeMap();

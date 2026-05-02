import { canvas } from '#/graphics/Canvas.js';

export default class ClientMouseListener {
    static instance: ClientMouseListener | null = new ClientMouseListener();
    static idleTimer: number = 0;
    static nextMouseX: number = -1;
    static nextMouseY: number = -1;
    static nextMouseButton: number = 0;
    static nextMouseClickX: number = 0;
    static nextMouseClickY: number = 0;
    static nextMouseClickTime: number = 0;
    static nextMouseClickButton: number = 0;
    static mouseY: number = 0;
    static mouseX: number = 0;
    static mouseClickX: number = 0;
    static mouseClickY: number = 0;
    static mouseButton: number = 0;
    static mouseClickButton: number = 0;
    static mouseClickTime: number = 0;

    private static readonly mouseenter = (event: MouseEvent): void => ClientMouseListener.instance?.mouseEntered(event);
    private static readonly mouseleave = (event: MouseEvent): void => ClientMouseListener.instance?.mouseExited(event);
    private static readonly blur = (event: FocusEvent): void => ClientMouseListener.instance?.focusLost(event);
    private static readonly focus = (event: FocusEvent): void => ClientMouseListener.instance?.focusGained(event);
    private static readonly mousedown = (event: MouseEvent): void => ClientMouseListener.instance?.mousePressed(event);
    private static readonly mouseup = (event: MouseEvent): void => ClientMouseListener.instance?.mouseReleased(event);
    private static readonly mousemove = (event: MouseEvent): void => ClientMouseListener.instance?.mouseMoved(event);
    private static readonly mouseclick = (event: MouseEvent): void => ClientMouseListener.instance?.mouseClicked(event);
    private static readonly touchstart = (event: TouchEvent): void => ClientMouseListener.instance?.touchStart(event);

    static addListeners(target: HTMLElement): void {
        target.addEventListener('mousedown', ClientMouseListener.mousedown, false);
        target.addEventListener('mouseup', ClientMouseListener.mouseup, false);
        target.addEventListener('click', ClientMouseListener.mouseclick, false);
        target.addEventListener('mousemove', ClientMouseListener.mousemove, false);
        target.addEventListener('mouseenter', ClientMouseListener.mouseenter, false);
        target.addEventListener('mouseleave', ClientMouseListener.mouseleave, false);
        target.addEventListener('blur', ClientMouseListener.blur, false);
        target.addEventListener('focus', ClientMouseListener.focus, false);
        target.addEventListener('touchstart', ClientMouseListener.touchstart, { passive: false });
    }

    static removeListeners(target: HTMLElement): void {
        target.removeEventListener('mousedown', ClientMouseListener.mousedown, false);
        target.removeEventListener('mouseup', ClientMouseListener.mouseup, false);
        target.removeEventListener('click', ClientMouseListener.mouseclick, false);
        target.removeEventListener('mousemove', ClientMouseListener.mousemove, false);
        target.removeEventListener('mouseenter', ClientMouseListener.mouseenter, false);
        target.removeEventListener('mouseleave', ClientMouseListener.mouseleave, false);
        target.removeEventListener('blur', ClientMouseListener.blur, false);
        target.removeEventListener('focus', ClientMouseListener.focus, false);
        target.removeEventListener('touchstart', ClientMouseListener.touchstart);
    }

    static shutdown(): void {
        ClientMouseListener.instance = null;
    }

    static loop(): void {
        ClientMouseListener.cycle();
    }

    static cycle(): void {
        ClientMouseListener.mouseButton = ClientMouseListener.nextMouseButton;
        ClientMouseListener.mouseX = ClientMouseListener.nextMouseX;
        ClientMouseListener.mouseY = ClientMouseListener.nextMouseY;
        ClientMouseListener.mouseClickButton = ClientMouseListener.nextMouseClickButton;
        ClientMouseListener.mouseClickX = ClientMouseListener.nextMouseClickX;
        ClientMouseListener.mouseClickY = ClientMouseListener.nextMouseClickY;
        ClientMouseListener.mouseClickTime = ClientMouseListener.nextMouseClickTime;
        ClientMouseListener.nextMouseClickButton = 0;
    }

    static getIdleTimer(): number {
        return ClientMouseListener.idleTimer++;
    }

    static setIdleTimer(value: number): void {
        ClientMouseListener.idleTimer = value;
    }

    mouseEntered(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const pos = ClientMouseListener.getMousePos(event);
            ClientMouseListener.nextMouseX = pos.x;
            ClientMouseListener.nextMouseY = pos.y;
        }
    }

    mouseExited(_event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            ClientMouseListener.nextMouseX = -1;
            ClientMouseListener.nextMouseY = -1;
        }
    }

    focusLost(_event: FocusEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.nextMouseButton = 0;
        }
    }

    mouseDragged(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const pos = ClientMouseListener.getMousePos(event);
            ClientMouseListener.nextMouseX = pos.x;
            ClientMouseListener.nextMouseY = pos.y;
        }
    }

    focusGained(_event: FocusEvent): void {
    }

    mousePressed(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const pos = ClientMouseListener.getMousePos(event);
            ClientMouseListener.nextMouseClickX = pos.x;
            ClientMouseListener.nextMouseClickY = pos.y;
            ClientMouseListener.nextMouseClickTime = performance.now();
            if (event.button === 2 || event.metaKey) {
                ClientMouseListener.nextMouseClickButton = 2;
                ClientMouseListener.nextMouseButton = 2;
            } else {
                ClientMouseListener.nextMouseClickButton = 1;
                ClientMouseListener.nextMouseButton = 1;
            }
        }
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    mouseClicked(event: MouseEvent): void {
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    mouseMoved(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            const pos = ClientMouseListener.getMousePos(event);
            ClientMouseListener.nextMouseX = pos.x;
            ClientMouseListener.nextMouseY = pos.y;
        }
    }

    mouseReleased(event: MouseEvent): void {
        if (ClientMouseListener.instance) {
            ClientMouseListener.idleTimer = 0;
            ClientMouseListener.nextMouseButton = 0;
        }
        if (event.button === 2) {
            event.preventDefault();
        }
    }

    touchStart(event: TouchEvent): void {
        if (event.touches.length < 2) {
            event.preventDefault();
        }
    }

    private static getMousePos(event: MouseEvent): { x: number; y: number } {
        const fixedWidth = canvas.width;
        const fixedHeight = canvas.height;
        const bounds = canvas.getBoundingClientRect();
        const clickX = event.clientX - bounds.left;
        const clickY = event.clientY - bounds.top;
        let x = 0;
        let y = 0;

        if (document.fullscreenElement !== null) {
            const gameAspectRatio = fixedWidth / fixedHeight;
            const ourAspectRatio = window.innerWidth / window.innerHeight;
            const wider = ourAspectRatio >= gameAspectRatio;
            let trueCanvasWidth = 0;
            let trueCanvasHeight = 0;
            let offsetX = 0;
            let offsetY = 0;
            if (wider) {
                trueCanvasWidth = window.innerHeight * gameAspectRatio;
                trueCanvasHeight = window.innerHeight;
                offsetX = (window.innerWidth - trueCanvasWidth) / 2;
            } else {
                trueCanvasWidth = window.innerWidth;
                trueCanvasHeight = window.innerWidth / gameAspectRatio;
                offsetY = (window.innerHeight - trueCanvasHeight) / 2;
            }
            x = ((clickX - offsetX) * (fixedWidth / trueCanvasWidth)) | 0;
            y = ((clickY - offsetY) * (fixedHeight / trueCanvasHeight)) | 0;
        } else {
            x = (clickX * (canvas.width / bounds.width)) | 0;
            y = (clickY * (canvas.height / bounds.height)) | 0;
        }

        if (x < 0) {
            x = 0;
        } else if (x > fixedWidth) {
            x = fixedWidth;
        }
        if (y < 0) {
            y = 0;
        } else if (y > fixedHeight) {
            y = fixedHeight;
        }

        return { x, y };
    }
}

import ClientKeyboardListener from '#/client/ClientKeyboardListener.js';

import { canvas, canvas2d } from '#/graphics/Canvas.js';
import Pix3D from '#/dash3d/Pix3D.js';
import PixMap from '#/graphics/PixMap.js';

import { sleep } from '#/util/JsUtil.js';

export default abstract class GameShell {
    public static fullredraw: boolean = true;
    private static progressBar: HTMLCanvasElement | null = null;

    protected state: number = 0;
    protected deltime: number = 20;
    protected mindel: number = 1;
    protected otim: number[] = new Array(10);
    protected fps: number = 0;
    protected debug: boolean = false;
    public static drawArea: PixMap | null = null;
    protected focus: boolean = true;

    /// custom
    protected resizeToFit: boolean = false;
    protected tfps: number = 50;
    private alreadyErrored: boolean = false;

    private readonly resizeHandler = (): void => {
        if (this.resizeToFit) {
            this.resize(window.innerWidth, window.innerHeight);
        }
    };

    protected async maininit() { }
    protected mainquit() { }
    protected async mainloop() { }
    protected async mainredraw() { }
    protected refresh() { }

    constructor(resizetoFit: boolean = false) {
        canvas.tabIndex = -1;
        canvas2d.fillStyle = 'black';
        canvas2d.fillRect(0, 0, canvas.width, canvas.height);

        this.resizeToFit = resizetoFit;
        if (this.resizeToFit) {
            this.resize(window.innerWidth, window.innerHeight);
        } else {
            this.resize(canvas.width, canvas.height);
        }
    }

    protected get sWid(): number {
        return canvas.width;
    }

    protected get sHei(): number {
        return canvas.height;
    }

    protected resize(width: number, height: number) {
        canvas.width = width;
        canvas.height = height;
        GameShell.drawArea = new PixMap(width, height);
        Pix3D.setRenderClipping();
    }

    public error(message: string): void {
        if (this.alreadyErrored) {
            return;
        }

        this.alreadyErrored = true;
        const page = `error_game_${message}`;
        globalThis.console.log(page);
        try {
            window.location.href = new URL(`${page}.ws`, window.location.href).href;
        } catch (_e) {
            // ignore browser navigation failures
        }
    }

    async run() {
        window.addEventListener('resize', this.resizeHandler, false);

        canvas.onfocus = this.onfocus.bind(this);
        canvas.onblur = this.onblur.bind(this);

        if (this.isTouchDevice && !this.hasTouchEvents) {
            // edge case: we can't control canvas touch action behavior to allow zooming
            // device has a touch screen but browser does not expose touchstart
            canvas.style.touchAction = 'none';
        }

        // Preventing mouse events from bubbling up to the context menu in the browser for our canvas.
        // This may need to be hooked up to our own context menu in the future.
        canvas.oncontextmenu = (e: MouseEvent): void => {
            e.preventDefault();
        };

        window.oncontextmenu = (e: MouseEvent): void => {
            e.preventDefault();
        };

        await this.drawProgress('Loading...', 0);
        await this.maininit();

        let ntime: number = 0;
        let opos: number = 0;
        let ratio: number = 256;
        let delta: number = 1;
        let count: number = 0;

        for (let i: number = 0; i < 10; i++) {
            this.otim[i] = performance.now();
        }

        while (this.state >= 0) {
            if (this.state > 0) {
                this.state--;

                if (this.state === 0) {
                    this.shutdown();
                    return;
                }
            }

            const lastRatio: number = ratio;
            const lastDelta: number = delta;

            ratio = 300;
            delta = 1;

            ntime = performance.now();

            const otim: number = this.otim[opos];
            if (otim === 0) {
                ratio = lastRatio;
                delta = lastDelta;
            } else if (ntime > otim) {
                ratio = ((this.deltime * 2560) / (ntime - otim)) | 0;
            }

            if (ratio < 25) {
                ratio = 25;
            } else if (ratio > 256) {
                ratio = 256;
                delta = (this.deltime - (ntime - otim) / 10) | 0;
            }

            this.otim[opos] = ntime;
            opos = (opos + 1) % 10;

            if (delta > 1) {
                for (let i: number = 0; i < 10; i++) {
                    if (this.otim[i] !== 0) {
                        this.otim[i] += delta;
                    }
                }
            }

            if (delta < this.mindel) {
                delta = this.mindel;
            }

            await sleep(delta);

            while (count < 256) {
                await this.mainloop();
                count += ratio;
            }
            count &= 0xff;

            if (this.deltime > 0) {
                this.fps = ((ratio * 1000) / (this.deltime * 256)) | 0;
            }

            await this.mainredraw();

            // this is custom for targeting specific fps (on mobile).
            if (this.tfps < 50) {
                const tfps: number = 1000 / this.tfps - (performance.now() - ntime);
                if (tfps > 0) {
                    await sleep(tfps);
                }
            }

            if (this.debug) {
                console.log('ntime:' + ntime);
                for (let i = 0; i < 10; i++) {
                    const o = (opos - i - 1 + 20) % 10;
                    console.log('otim' + o + ':' + this.otim[o]);
                }
                console.log('fps:' + this.fps + ' ratio:' + ratio + ' count:' + count);
                console.log('del:' + delta + ' deltime:' + this.deltime + ' mindel:' + this.mindel);
                console.log('opos:' + opos);
                this.debug = false;
            }
        }

        if (this.state === -1) {
            this.shutdown();
        }
    }

    protected shutdown() {
        this.state = -2;
        this.mainquit();

        window.removeEventListener('resize', this.resizeHandler, false);
        canvas.onfocus = null;
        canvas.onblur = null;
        canvas.oncontextmenu = null;
        window.oncontextmenu = null;
    }

    protected setFramerate(rate: number) {
        this.deltime = (1000 / rate) | 0;
    }

    protected setTargetedFramerate(rate: number) {
        this.tfps = Math.max(Math.min(50, rate | 0), 0);
    }

    protected start() {
        if (this.state >= 0) {
            this.state = 0;
        }
    }

    protected stop() {
        if (this.state >= 0) {
            this.state = (4000 / this.deltime) | 0;
        }
    }

    public static resetProgress(): void {
        GameShell.progressBar = null;
    }

    protected async drawProgress(message: string, progress: number): Promise<void> {
        const width: number = this.sWid;
        const height: number = this.sHei;

        if (GameShell.fullredraw) {
            canvas2d.fillStyle = 'black';
            canvas2d.fillRect(0, 0, width, height);
            GameShell.fullredraw = false;
        }

        const x: number = ((width / 2) | 0) - 152;
        const y: number = ((height / 2) | 0) - 18;
        const fillWidth: number = progress * 3;

        if (!GameShell.progressBar) {
            GameShell.progressBar = document.createElement('canvas');
            GameShell.progressBar.width = 304;
            GameShell.progressBar.height = 34;
        }

        const ctx = GameShell.progressBar.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 304, 34);
            ctx.fillStyle = 'rgb(140, 17, 17)';
            ctx.fillRect(0, 0, 304, 1);
            ctx.fillRect(0, 33, 304, 1);
            ctx.fillRect(0, 0, 1, 34);
            ctx.fillRect(303, 0, 1, 34);
            ctx.fillRect(2, 2, fillWidth, 30);
            ctx.fillStyle = 'black';
            ctx.fillRect(1, 1, 302, 1);
            ctx.fillRect(1, 32, 302, 1);
            ctx.fillRect(1, 1, 1, 32);
            ctx.fillRect(302, 1, 1, 32);
            ctx.fillRect(fillWidth + 2, 2, 300 - fillWidth, 30);
            ctx.font = 'bold 13px Helvetica, sans-serif';
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
            ctx.fillText(message, (304 - ctx.measureText(message).width) / 2, 22);
            canvas2d.drawImage(GameShell.progressBar, x, y);
        }

        await sleep(5); // return a slice of time to the main loop so it can update the progress bar
    }

    // ----

    protected pointerDown(_x: number, _y: number, _e: PointerEvent) {
    }

    protected mouseUp(_x: number, _y: number, _e: MouseEvent) {
    }

    protected pointerUp(_x: number, _y: number, _e: PointerEvent) {
    }

    protected pointerEnter(_x: number, _y: number, _e: PointerEvent) {
    }

    protected pointerLeave(_e: PointerEvent) {
    }

    protected pointerMove(_x: number, _y: number, _e: PointerEvent) {
    }

    protected touchStart(_e: TouchEvent) {
    }

    private onfocus(_e: FocusEvent) {
        this.focus = true;
        GameShell.fullredraw = true;
        this.refresh();
    }

    private onblur(_e: FocusEvent) {
        this.focus = false;

        // custom: taken from later version to release all keys
        ClientKeyboardListener.keyHeld.fill(0);
    }

    // ----

    private get hasTouchEvents() {
        return 'ontouchstart' in window;
    }

    private get isTouchDevice() {
        return (
            this.hasTouchEvents ||
            navigator.maxTouchPoints > 0 ||
            (navigator as any).msMaxTouchPoints > 0
        );
    }

    protected get isMobile(): boolean {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile/i.test(navigator.userAgent)) {
            return true;
        }

        return this.isTouchDevice;
    }

}

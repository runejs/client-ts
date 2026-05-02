import ClientMouseListener from '#/client/ClientMouseListener.js';

export default class MouseTracking {
    active: boolean = false;
    length: number = 0;
    x: number[] = new Array(500);
    y: number[] = new Array(500);

    constructor() {
    }

    cycle() {
        if (this.active) {
            if (this.length < 500) {
                this.x[this.length] = ClientMouseListener.mouseX;
                this.y[this.length] = ClientMouseListener.mouseY;
                this.length++;
            }
        }
    }
}

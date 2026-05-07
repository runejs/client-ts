import Linkable2 from '#/datastruct/Linkable2.js';

export default class ByteArrayNode extends Linkable2 {
    readonly data: Uint8Array;

    constructor(arg0: Uint8Array) {
        super();
        this.data = arg0;
    }
}

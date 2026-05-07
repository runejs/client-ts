import PcmPlayer from '#/sound/PcmPlayer.js';

declare global {
    interface Window {
        audioContext: AudioContext;
    }
}

export default class WebPcmPlayer extends PcmPlayer {
    readonly buffer: Int16Array = new Int16Array(256);
    line: AudioBufferSourceNode | null = null;
    nextBufferTime: number = 0;

    override init(arg0: number): void {
        this.capacity = arg0;
        this.nextBufferTime = window.audioContext.currentTime;
    }

    override queued(): number {
        const var1 = ((this.nextBufferTime - window.audioContext.currentTime) * PcmPlayer.frequency) | 0;
        if (var1 <= 0) {
            return this.capacity;
        }
        const var2 = this.capacity - var1;
        return var2 < 0 ? 0 : var2;
    }

    override write(): void {
        if (PcmPlayer.samples === null) {
            return;
        }
        PcmPlayer.samples.fill(0, 0, 256);
        if (PcmPlayer.stream !== null) {
            PcmPlayer.stream.doMix(PcmPlayer.samples, 0, 256);
        }
        const audioBuffer = window.audioContext.createBuffer(1, 256, PcmPlayer.frequency);
        const audioData = audioBuffer.getChannelData(0);
        for (let var1 = 0; var1 < 256; var1++) {
            let var2 = PcmPlayer.samples[var1];
            if ((var2 + 8388608 & 0xFF000000) !== 0) {
                var2 = var2 >> 31 ^ 0x7FFFFF;
            }
            this.buffer[var1] = var2 >> 8;
            audioData[var1] = this.buffer[var1] / 32768;
        }
        if (this.nextBufferTime < window.audioContext.currentTime) {
            this.nextBufferTime = window.audioContext.currentTime;
        }
        const line = window.audioContext.createBufferSource();
        line.buffer = audioBuffer;
        line.connect(window.audioContext.destination);
        line.start(this.nextBufferTime);
        this.line = line;
        this.nextBufferTime += audioBuffer.duration;
    }

    constructor() {
        super(22050);
        PcmPlayer.frequency = 22050;
        PcmPlayer.lastLoopTime = Date.now();
        this.capacity = 16384;
        this.availableThreshold = 256;
        this.nextWriteTime = Date.now();
        this.nextAcceptedCheckTime = Date.now();
    }

    override close(): void {
        if (this.line !== null) {
            this.line.disconnect();
            this.line = null;
        }
    }
}

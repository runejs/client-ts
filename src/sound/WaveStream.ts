import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import Wave from '#/sound/Wave.js';

export default class WaveStream extends PcmStream {
    volumeShift: number = 0;
    volumeStep: number = 0;
    readonly loopStartPosition: number;
    volumeChangeDelta: number = 0;
    pitch: number;
    volume: number = 0;
    loopCount: number = 0;
    volumeMono: number;
    readonly loopEndPosition: number;
    loopReversed: boolean = false;
    position: number = 0;

    mixBackwards(arg0: Int32Array | number[], arg1: number, arg2: number, arg3: number, arg4: number): number {
        if (this.volumeChangeDelta > 0) {
            let var6 = this.volumeChangeDelta + arg1;
            if (var6 > arg3) {
                var6 = arg3;
            }
            this.volumeChangeDelta += arg1;
            if (this.pitch === -256 && (this.position & 0xFF) === 0) {
                arg1 = WaveStream.doMixBackwards1To1RampMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeShift, this.volumeStep, var6, arg2, this);
            } else {
                arg1 = WaveStream.mixBackwardsInterpolatedRampMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeShift, this.volumeStep, var6, arg2, this, this.pitch, arg4);
            }
            this.volumeChangeDelta -= arg1;
            if (this.volumeChangeDelta !== 0) {
                return arg1;
            }
            if (this.volume === -2147483648) {
                this.unlink();
                return arg3;
            }
            this.volumeMono = this.volume;
        }
        return this.pitch === -256 && (this.position & 0xFF) === 0 ? WaveStream.mixBackwards1To1Mono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this) : WaveStream.mixBackwardsInterpolatedMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this, this.pitch, arg4);
    }

    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): number {
        if (this.volumeMono === 0 && (this.volumeChangeDelta === 0 || this.volume === 0 || this.volume === -2147483648)) {
            this.pretendToMix(arg2);
            return 0;
        }
        const var4 = this.streamable as Wave;
        const var5 = this.loopStartPosition << 8;
        const var6 = this.loopEndPosition << 8;
        const var7 = var4.samples.length << 8;
        const var8 = var6 - var5;
        if (var8 <= 0) {
            this.loopCount = 0;
        }
        let var9 = arg1;
        const var10 = arg1 + arg2;
        if (this.loopCount >= 0) {
            if (this.loopCount > 0) {
                if (this.loopReversed) {
                    if (this.pitch < 0) {
                        var9 = this.mixBackwards(arg0, arg1, var5, var10, var4.samples[this.loopStartPosition]);
                        if (this.position >= var5) {
                            return 1;
                        }
                        this.position = var5 + var5 - this.position - 1;
                        this.pitch = -this.pitch;
                        if (--this.loopCount === 0) {
                            if (this.pitch < 0) {
                                this.mixBackwards(arg0, var9, 0, var10, 0);
                                if (this.position < 0) {
                                    this.position = 0;
                                    this.unlink();
                                }
                            } else {
                                this.mixForwards(arg0, var9, var7, var10, 0);
                                if (this.position >= var7) {
                                    this.position = var7 - 1;
                                    this.unlink();
                                }
                            }
                            return 1;
                        }
                    }
                    do {
                        var9 = this.mixForwards(arg0, var9, var6, var10, var4.samples[this.loopEndPosition - 1]);
                        if (this.position < var6) {
                            return 1;
                        }
                        this.position = var6 + var6 - this.position - 1;
                        this.pitch = -this.pitch;
                        if (--this.loopCount === 0) {
                            break;
                        }
                        var9 = this.mixBackwards(arg0, var9, var5, var10, var4.samples[this.loopStartPosition]);
                        if (this.position >= var5) {
                            return 1;
                        }
                        this.position = var5 + var5 - this.position - 1;
                        this.pitch = -this.pitch;
                    } while (--this.loopCount !== 0);
                } else if (this.pitch < 0) {
                    while (true) {
                        var9 = this.mixBackwards(arg0, var9, var5, var10, var4.samples[this.loopEndPosition - 1]);
                        if (this.position >= var5) {
                            return 1;
                        }
                        const var12 = ((var6 - this.position - 1) / var8) | 0;
                        if (var12 >= this.loopCount) {
                            this.position += this.loopCount * var8;
                            this.loopCount = 0;
                            break;
                        }
                        this.position += var8 * var12;
                        this.loopCount -= var12;
                    }
                } else {
                    while (true) {
                        var9 = this.mixForwards(arg0, var9, var6, var10, var4.samples[this.loopStartPosition]);
                        if (this.position < var6) {
                            return 1;
                        }
                        const var13 = ((this.position - var5) / var8) | 0;
                        if (var13 >= this.loopCount) {
                            this.position -= this.loopCount * var8;
                            this.loopCount = 0;
                            break;
                        }
                        this.position -= var8 * var13;
                        this.loopCount -= var13;
                    }
                }
            }
            if (this.pitch < 0) {
                this.mixBackwards(arg0, var9, 0, var10, 0);
                if (this.position < 0) {
                    this.position = 0;
                    this.unlink();
                }
            } else {
                this.mixForwards(arg0, var9, var7, var10, 0);
                if (this.position >= var7) {
                    this.position = var7 - 1;
                    this.unlink();
                }
            }
            return 1;
        } else if (this.loopReversed) {
            if (this.pitch < 0) {
                var9 = this.mixBackwards(arg0, arg1, var5, var10, var4.samples[this.loopStartPosition]);
                if (this.position >= var5) {
                    return 1;
                }
                this.position = var5 + var5 - this.position - 1;
                this.pitch = -this.pitch;
            }
            while (true) {
                const var11 = this.mixForwards(arg0, var9, var6, var10, var4.samples[this.loopEndPosition - 1]);
                if (this.position < var6) {
                    return 1;
                }
                this.position = var6 + var6 - this.position - 1;
                this.pitch = -this.pitch;
                var9 = this.mixBackwards(arg0, var11, var5, var10, var4.samples[this.loopStartPosition]);
                if (this.position >= var5) {
                    return 1;
                }
                this.position = var5 + var5 - this.position - 1;
                this.pitch = -this.pitch;
            }
        } else if (this.pitch < 0) {
            while (true) {
                var9 = this.mixBackwards(arg0, var9, var5, var10, var4.samples[this.loopEndPosition - 1]);
                if (this.position >= var5) {
                    return 1;
                }
                this.position = var6 - (var6 - 1 - this.position) % var8 - 1;
            }
        } else {
            while (true) {
                var9 = this.mixForwards(arg0, var9, var6, var10, var4.samples[this.loopStartPosition]);
                if (this.position < var6) {
                    return 1;
                }
                this.position = (this.position - var5) % var8 + var5;
            }
        }
    }

    static mixForwardsInterpolatedRampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: WaveStream, arg10: number, arg11: number): number {
        let var12: number;
        if (arg10 === 0 || (var12 = (((arg8 + arg10 - arg2 - 257) / arg10) | 0) + arg3) > arg7) {
            var12 = arg7;
        }
        while (arg3 < var12) {
            const var13 = arg2 >> 8;
            const var14 = arg0[var13];
            arg1[arg3++] += ((var14 << 8) + (arg2 & 0xFF) * (arg0[var13 + 1] - var14)) * arg4 >> arg5;
            arg4 += arg6;
            arg2 += arg10;
        }
        let var15: number;
        if (arg10 === 0 || (var15 = (((arg8 + arg10 - arg2 - 1) / arg10) | 0) + arg3) > arg7) {
            var15 = arg7;
        }
        while (arg3 < var15) {
            const var16 = arg0[arg2 >> 8];
            arg1[arg3++] += ((var16 << 8) + (arg2 & 0xFF) * (arg11 - var16)) * arg4 >> arg5;
            arg4 += arg6;
            arg2 += arg10;
        }
        arg9.volumeMono = arg4;
        arg9.position = arg2;
        return arg3;
    }

    static mixBackwardsInterpolatedRampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: WaveStream, arg10: number, arg11: number): number {
        let var12: number;
        if (arg10 === 0 || (var12 = (((arg8 + arg10 + 256 - arg2) / arg10) | 0) + arg3) > arg7) {
            var12 = arg7;
        }
        while (arg3 < var12) {
            const var13 = arg2 >> 8;
            const var14 = arg0[var13 - 1];
            arg1[arg3++] += ((var14 << 8) + (arg2 & 0xFF) * (arg0[var13] - var14)) * arg4 >> arg5;
            arg4 += arg6;
            arg2 += arg10;
        }
        let var15: number;
        if (arg10 === 0 || (var15 = (((arg8 + arg10 - arg2) / arg10) | 0) + arg3) > arg7) {
            var15 = arg7;
        }
        while (arg3 < var15) {
            arg1[arg3++] += ((arg11 << 8) + (arg2 & 0xFF) * (arg0[arg2 >> 8] - arg11)) * arg4 >> arg5;
            arg4 += arg6;
            arg2 += arg10;
        }
        arg9.volumeMono = arg4;
        arg9.position = arg2;
        return arg3;
    }

    setVolume(arg0: number): void {
        this.volumeMono = arg0;
        this.volumeChangeDelta = 0;
    }

    static mixBackwardsInterpolatedMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream, arg8: number, arg9: number): number {
        let var10: number;
        if (arg8 === 0 || (var10 = (((arg6 + arg8 + 256 - arg2) / arg8) | 0) + arg3) > arg5) {
            var10 = arg5;
        }
        while (arg3 < var10) {
            const var11 = arg2 >> 8;
            const var12 = arg0[var11 - 1];
            arg1[arg3++] += ((var12 << 8) + (arg2 & 0xFF) * (arg0[var11] - var12)) * arg4;
            arg2 += arg8;
        }
        let var13: number;
        if (arg8 === 0 || (var13 = (((arg6 + arg8 - arg2) / arg8) | 0) + arg3) > arg5) {
            var13 = arg5;
        }
        while (arg3 < var13) {
            arg1[arg3++] += ((arg9 << 8) + (arg2 & 0xFF) * (arg0[arg2 >> 8] - arg9)) * arg4;
            arg2 += arg8;
        }
        arg7.position = arg2;
        return arg3;
    }

    static doMixBackwards1To1RampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: WaveStream): number {
        let var10 = arg2 >> 8;
        const var11 = arg8 >> 8;
        let var12 = arg4 << 8;
        const var13 = arg6 << 8;
        let var14: number;
        if ((var14 = arg3 + var10 + 1 - var11) > arg7) {
            var14 = arg7;
        }
        var14 -= 3;
        while (arg3 < var14) {
            arg1[arg3++] += arg0[var10--] * var12 >> arg5;
            const var15 = var12 + var13;
            arg1[arg3++] += arg0[var10--] * var15 >> arg5;
            const var16 = var13 + var15;
            arg1[arg3++] += arg0[var10--] * var16 >> arg5;
            const var17 = var13 + var16;
            arg1[arg3++] += arg0[var10--] * var17 >> arg5;
            var12 = var13 + var17;
        }
        var14 += 3;
        while (arg3 < var14) {
            arg1[arg3++] += arg0[var10--] * var12 >> arg5;
            var12 += var13;
        }
        arg9.volumeMono = var12 >> 8;
        arg9.position = var10 << 8;
        return arg3;
    }

    setLoopCount(arg0: number): void {
        this.loopCount = arg0;
    }

    static mixBackwards1To1Mono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream): number {
        let var8 = arg2 >> 8;
        const var9 = arg6 >> 8;
        const var10 = arg4 << 8;
        let var11: number;
        if ((var11 = arg3 + var8 + 1 - var9) > arg5) {
            var11 = arg5;
        }
        var11 -= 3;
        while (arg3 < var11) {
            arg1[arg3++] += arg0[var8--] * var10;
            arg1[arg3++] += arg0[var8--] * var10;
            arg1[arg3++] += arg0[var8--] * var10;
            arg1[arg3++] += arg0[var8--] * var10;
        }
        var11 += 3;
        while (arg3 < var11) {
            arg1[arg3++] += arg0[var8--] * var10;
        }
        arg7.position = var8 << 8;
        return arg3;
    }

    static doMixForwards1To1RampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: WaveStream): number {
        let var10 = arg2 >> 8;
        const var11 = arg8 >> 8;
        let var12 = arg4 << 8;
        const var13 = arg6 << 8;
        let var14: number;
        if ((var14 = arg3 + var11 - var10) > arg7) {
            var14 = arg7;
        }
        var14 -= 3;
        while (arg3 < var14) {
            arg1[arg3++] += arg0[var10++] * var12 >> arg5;
            const var15 = var12 + var13;
            arg1[arg3++] += arg0[var10++] * var15 >> arg5;
            const var16 = var13 + var15;
            arg1[arg3++] += arg0[var10++] * var16 >> arg5;
            const var17 = var13 + var16;
            arg1[arg3++] += arg0[var10++] * var17 >> arg5;
            var12 = var13 + var17;
        }
        var14 += 3;
        while (arg3 < var14) {
            arg1[arg3++] += arg0[var10++] * var12 >> arg5;
            var12 += var13;
        }
        arg9.volumeMono = var12 >> 8;
        arg9.position = var10 << 8;
        return arg3;
    }

    override priority(): number {
        const var1 = this.volumeMono * 3;
        let var2 = (var1 >>> 31) + (var1 ^ var1 >> 31);
        if (this.loopCount === 0) {
            var2 -= this.position * var2 / (((this.streamable as Wave).samples.length << 8));
        } else if (this.loopCount >= 0) {
            var2 -= this.loopStartPosition * var2 / (this.streamable as Wave).samples.length;
        }
        return var2 > 255 ? 255 : var2;
    }

    isRamping(): boolean {
        return this.isLinked();
    }

    static newRatePercent(arg0: Wave, arg1: number): WaveStream | null {
        return arg0.samples === null || arg0.samples.length === 0 ? null : new WaveStream(arg0, ((arg0.samplingFrequency * 256 * 100) / (PcmPlayer.frequency * 100)) | 0, arg1);
    }

    static mixForwardsInterpolatedMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream, arg8: number, arg9: number): number {
        let var10: number;
        if (arg8 === 0 || (var10 = (((arg6 + arg8 - arg2 - 257) / arg8) | 0) + arg3) > arg5) {
            var10 = arg5;
        }
        while (arg3 < var10) {
            const var11 = arg2 >> 8;
            const var12 = arg0[var11];
            arg1[arg3++] += ((var12 << 8) + (arg2 & 0xFF) * (arg0[var11 + 1] - var12)) * arg4;
            arg2 += arg8;
        }
        let var13: number;
        if (arg8 === 0 || (var13 = (((arg6 + arg8 - arg2 - 1) / arg8) | 0) + arg3) > arg5) {
            var13 = arg5;
        }
        while (arg3 < var13) {
            const var14 = arg0[arg2 >> 8];
            arg1[arg3++] += ((var14 << 8) + (arg2 & 0xFF) * (arg9 - var14)) * arg4;
            arg2 += arg8;
        }
        arg7.position = arg2;
        return arg3;
    }

    override pretendToMix(arg0: number): void {
        if (this.volumeChangeDelta > 0) {
            if (arg0 >= this.volumeChangeDelta) {
                if (this.volume === -2147483648) {
                    this.unlink();
                    arg0 = this.volumeChangeDelta;
                } else {
                    this.volumeMono = this.volume;
                }
                this.volumeChangeDelta = 0;
            } else {
                this.volumeMono += this.volumeStep * arg0;
                this.volumeChangeDelta -= arg0;
            }
        }
        this.position += this.pitch * arg0;
        const var2 = this.streamable as Wave;
        const var3 = this.loopStartPosition << 8;
        const var4 = this.loopEndPosition << 8;
        const var5 = var2.samples.length << 8;
        const var6 = var4 - var3;
        if (var6 <= 0) {
            this.loopCount = 0;
        }
        if (this.loopCount >= 0) {
            if (this.loopCount > 0) {
                if (this.loopReversed) {
                    if (this.pitch < 0) {
                        if (this.position >= var3) {
                            return;
                        }
                        this.position = var3 + var3 - this.position - 1;
                        this.pitch = -this.pitch;
                        if (--this.loopCount === 0) {
                            if (this.pitch < 0) {
                                if (this.position < 0) {
                                    this.position = 0;
                                    this.unlink();
                                    return;
                                }
                            } else if (this.position >= var5) {
                                this.position = var5 - 1;
                                this.unlink();
                            }
                            return;
                        }
                    }
                    do {
                        if (this.position < var4) {
                            return;
                        }
                        this.position = var4 + var4 - this.position - 1;
                        this.pitch = -this.pitch;
                        if (--this.loopCount === 0) {
                            break;
                        }
                        if (this.position >= var3) {
                            return;
                        }
                        this.position = var3 + var3 - this.position - 1;
                        this.pitch = -this.pitch;
                    } while (--this.loopCount !== 0);
                } else if (this.pitch < 0) {
                    if (this.position >= var3) {
                        return;
                    }
                    const var7 = ((var4 - this.position - 1) / var6) | 0;
                    if (var7 < this.loopCount) {
                        this.position += var6 * var7;
                        this.loopCount -= var7;
                        return;
                    }
                    this.position += this.loopCount * var6;
                    this.loopCount = 0;
                } else if (this.position >= var4) {
                    const var8 = ((this.position - var3) / var6) | 0;
                    if (var8 < this.loopCount) {
                        this.position -= var6 * var8;
                        this.loopCount -= var8;
                        return;
                    }
                    this.position -= this.loopCount * var6;
                    this.loopCount = 0;
                } else {
                    return;
                }
            }
            if (this.pitch < 0) {
                if (this.position < 0) {
                    this.position = 0;
                    this.unlink();
                    return;
                }
            } else if (this.position >= var5) {
                this.position = var5 - 1;
                this.unlink();
            }
        } else if (this.loopReversed) {
            if (this.pitch < 0) {
                if (this.position >= var3) {
                    return;
                }
                this.position = var3 + var3 - this.position - 1;
                this.pitch = -this.pitch;
            }
            while (this.position >= var4) {
                this.position = var4 + var4 - this.position - 1;
                this.pitch = -this.pitch;
                if (this.position >= var3) {
                    return;
                }
                this.position = var3 + var3 - this.position - 1;
                this.pitch = -this.pitch;
            }
        } else if (this.pitch < 0) {
            if (this.position < var3) {
                this.position = var4 - (var4 - 1 - this.position) % var6 - 1;
            }
        } else if (this.position >= var4) {
            this.position = (this.position - var3) % var6 + var3;
        }
    }

    mixForwards(arg0: Int32Array | number[], arg1: number, arg2: number, arg3: number, arg4: number): number {
        if (this.volumeChangeDelta > 0) {
            let var6 = this.volumeChangeDelta + arg1;
            if (var6 > arg3) {
                var6 = arg3;
            }
            this.volumeChangeDelta += arg1;
            if (this.pitch === 256 && (this.position & 0xFF) === 0) {
                arg1 = WaveStream.doMixForwards1To1RampMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeShift, this.volumeStep, var6, arg2, this);
            } else {
                arg1 = WaveStream.mixForwardsInterpolatedRampMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeShift, this.volumeStep, var6, arg2, this, this.pitch, arg4);
            }
            this.volumeChangeDelta -= arg1;
            if (this.volumeChangeDelta !== 0) {
                return arg1;
            }
            if (this.volume === -2147483648) {
                this.unlink();
                return arg3;
            }
            this.volumeMono = this.volume;
        }
        return this.pitch === 256 && (this.position & 0xFF) === 0 ? WaveStream.mixForwards1To1Mono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this) : WaveStream.mixForwardsInterpolatedMono((this.streamable as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this, this.pitch, arg4);
    }

    static mixForwards1To1Mono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream): number {
        let var8 = arg2 >> 8;
        const var9 = arg6 >> 8;
        const var10 = arg4 << 8;
        let var11: number;
        if ((var11 = arg3 + var9 - var8) > arg5) {
            var11 = arg5;
        }
        var11 -= 3;
        while (arg3 < var11) {
            arg1[arg3++] += arg0[var8++] * var10;
            arg1[arg3++] += arg0[var8++] * var10;
            arg1[arg3++] += arg0[var8++] * var10;
            arg1[arg3++] += arg0[var8++] * var10;
        }
        var11 += 3;
        while (arg3 < var11) {
            arg1[arg3++] += arg0[var8++] * var10;
        }
        arg7.position = var8 << 8;
        return arg3;
    }

    constructor(arg0: Wave, arg1: number, arg2: number) {
        super();
        this.streamable = arg0;
        this.loopStartPosition = arg0.loopStartPosition;
        this.loopEndPosition = arg0.loopEndPosition;
        this.pitch = arg1;
        this.volumeMono = arg2;
        this.position = 0;
    }
}

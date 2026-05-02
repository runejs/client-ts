import Packet from '#/io/Packet.js';
import Huffman from '#/wordfilter/Huffman.js';

export default class WordPack {
    private static huffman: Huffman | null = null;

    static setHuffman(huffman: Huffman): void {
        this.huffman = huffman;
    }

    static unpack(packet: Packet, _length?: number): string {
        try {
            if (!this.huffman) {
                return 'Cabbage';
            }

            let length = packet.gsmart();
            if (length > 32767) {
                length = 32767;
            }

            const bytes = new Uint8Array(length);
            packet.pos += this.huffman.decode(packet.data, length, 0, bytes, packet.pos);
            return String.fromCharCode(...bytes);
        } catch (_e) {
            return 'Cabbage';
        }
    }

    static pack(packet: Packet, str: string): number {
        if (!this.huffman) {
            return 0;
        }

        const start = packet.pos;
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i) & 0xff;
        }

        packet.psmart(bytes.length);
        packet.pos += this.huffman.encode(0, packet.pos, bytes.length, bytes, packet.data);
        return packet.pos - start;
    }
}

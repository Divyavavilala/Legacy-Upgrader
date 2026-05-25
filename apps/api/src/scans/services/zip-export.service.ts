import { Injectable } from '@nestjs/common';
import type { GeneratedOutputFile } from './modernization-output.service';

/**
 * Minimal ZIP builder (store method, no compression) — avoids extra dependencies.
 */
@Injectable()
export class ZipExportService {
  async createZipBuffer(files: GeneratedOutputFile[]): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuf = Buffer.from(file.path, 'utf-8');
      const dataBuf = Buffer.from(file.content, 'utf-8');
      const crc = this.crc32(dataBuf);

      const localHeader = Buffer.alloc(30 + nameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(dataBuf.length, 18);
      localHeader.writeUInt32LE(dataBuf.length, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);
      nameBuf.copy(localHeader, 30);

      chunks.push(localHeader, dataBuf);

      const centralHeader = Buffer.alloc(46 + nameBuf.length);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(dataBuf.length, 20);
      centralHeader.writeUInt32LE(dataBuf.length, 24);
      centralHeader.writeUInt16LE(nameBuf.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      nameBuf.copy(centralHeader, 46);
      central.push(centralHeader);

      offset += localHeader.length + dataBuf.length;
    }

    const centralDir = Buffer.concat(central);
    const centralOffset = offset;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralDir.length, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...chunks, centralDir, end]);
  }

  private crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i]!;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}

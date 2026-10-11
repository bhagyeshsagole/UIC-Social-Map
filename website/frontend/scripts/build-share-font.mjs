// Convert the bundled, OFL-licensed Inter WOFF1 into sfnt for the edge renderer.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
const w=await readFile(new URL('../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff',import.meta.url));
if(w.toString('ascii',0,4)!=='wOFF')throw new Error('Expected WOFF1');
const n=w.readUInt16BE(12),chunks=[];let offset=12+n*16;
const header=Buffer.alloc(offset);w.copy(header,0,4,8);header.writeUInt16BE(n,4);
const power=2**Math.floor(Math.log2(n));header.writeUInt16BE(power*16,6);header.writeUInt16BE(Math.log2(power),8);header.writeUInt16BE(n*16-power*16,10);
let headOffset;
for(let i=0;i<n;i++){
 const p=44+i*20,start=w.readUInt32BE(p+4),compressed=w.readUInt32BE(p+8),length=w.readUInt32BE(p+12);
 const raw=w.subarray(start,start+compressed),data=compressed<length?inflateSync(raw):Buffer.from(raw);
 if(data.length!==length)throw new Error('Invalid font table');
 const table=Buffer.alloc(Math.ceil(length/4)*4);data.copy(table);w.copy(header,12+i*16,p,p+4);header.writeUInt32BE(w.readUInt32BE(p+16),16+i*16);header.writeUInt32BE(offset,20+i*16);header.writeUInt32BE(length,24+i*16);
 if(w.toString('ascii',p,p+4)==='head'){table.writeUInt32BE(0,8);headOffset=offset+8;}
 chunks.push(table);offset+=table.length;
}
const output=Buffer.concat([header,...chunks]);let sum=0;for(let p=0;p<output.length;p+=4)sum=(sum+output.readUInt32BE(p))>>>0;
output.writeUInt32BE((0xB1B0AFBA-sum)>>>0,headOffset);
await mkdir(new URL('../public/fonts/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/fonts/inter-share.ttf',import.meta.url),output);
await copyFile(new URL('../node_modules/@fontsource/inter/LICENSE',import.meta.url),new URL('../public/fonts/Inter-OFL.txt',import.meta.url));
console.log('Built licensed Inter share font.');

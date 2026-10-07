import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tagEvent,INTERESTS,TAGGER_VERSION} from '../src/interests.js';

export function tagFeed(feed) {
  if(feed.schemaVersion!==1 || !Array.isArray(feed.events)) throw new Error('Expected a schemaVersion 1 event feed.');
  return {...feed,interestTaggerVersion:TAGGER_VERSION,events:feed.events.map(tagEvent)};
}
export async function tagSnapshot(file=new URL('../public/campus-events.json',import.meta.url)) {
  const feed=tagFeed(JSON.parse(await readFile(file,'utf8')));
  const temp=typeof file==='string'?`${file}.tmp`:new URL(`${file.href}.tmp`);
  await writeFile(temp,JSON.stringify(feed,null,2)+'\n');
  await rename(temp,file);
  return {events:feed.events.length,matched:feed.events.filter(e=>e.interestIds.length).length,
    interests:Object.fromEntries(INTERESTS.map(i=>[i.id,feed.events.filter(e=>e.interestIds.includes(i.id)).length]))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await tagSnapshot(process.argv[2]),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}

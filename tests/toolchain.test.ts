import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const expoRequire=createRequire(require.resolve('expo/package.json'));
const metroRequire=createRequire(expoRequire.resolve('@expo/metro-config/package.json'));
it('the active Expo Metro extracts dimensions from an image file without a compatibility patch',async()=>{
  const root=mkdtempSync(join(tmpdir(),'locamap-image-'));
  try {
    const path=join(root,'tiny.png');
    writeFileSync(path,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
    const {getAssetData}=metroRequire('metro/private/Assets');
    const result=await getAssetData(path,'tiny.png',[],null,'/assets');
    expect(result).toMatchObject({width:1,height:1,type:'png'});
  }finally {rmSync(root,{recursive:true,force:true});}
});
it('the patched Xcode dependency still generates project identifiers',()=>{
  const project=require('xcode').project('unused.pbxproj');
  project.hash={project:{objects:{}}};
  expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
});

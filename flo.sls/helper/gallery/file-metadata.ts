import { promisify } from 'util';
import * as childProcess from 'child_process';
import * as plist from 'plist';

const execFileP = promisify(childProcess.execFile);

const parse = (data) => {
  const object = plist.parse(data);
  const returnValue = {};

  for (const [key, value] of Object.entries(object)) {
    let keyReturn: string;
    keyReturn = key.replace(/^kMDItem/, '').replace(/_/g, '');
    keyReturn = keyReturn.startsWith('FS')
      ? keyReturn.replace(/^FS/, 'fs')
      : keyReturn[0].toLowerCase() + keyReturn.slice(1);
    returnValue[keyReturn] = value;
  }

  return returnValue;
};

export async function fileMetadataAsync(filePath) {
  const { stdout } = await execFileP('mdls', ['-plist', '-', filePath]);
  return parse(stdout.trim());
}

export function fileMetadataSync(filePath) {
  const stdout = childProcess.execFileSync('mdls', ['-plist', '-', filePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return parse(stdout.trim());
}

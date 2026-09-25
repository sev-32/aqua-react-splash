import { cp, mkdir, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
await mkdir(`${root}/dist`, { recursive: true });
await cp(`${root}/public`, `${root}/dist`, { recursive: true });

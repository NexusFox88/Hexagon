import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
/** Read only authorized literal Modal CLI flags; never execute the source file. */
export async function modalTestCredential() {
  if (process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET) return JSON.stringify({ token_id: process.env.MODAL_TOKEN_ID, token_secret: process.env.MODAL_TOKEN_SECRET });
  // Dedicated credential created in the user-authenticated browser workspace.
  try {
    const value = JSON.parse(await readFile('.local/credentials/modal.json', 'utf8'));
    if (typeof value.token_id !== 'string' || typeof value.token_secret !== 'string') throw new Error('Invalid local Modal credential');
    return JSON.stringify({ token_id: value.token_id, token_secret: value.token_secret });
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const contents = await readFile(`${homedir()}/Desktop/sandbox_credential.txt`, 'utf8');
  const line = contents.split('\n').find(line => /\bmodal\b/.test(line) && line.includes('--token-id') && line.includes('--token-secret'));
  if (!line) throw new Error('Modal credential flags not found');
  const field = (name: string) => { const value = line.match(new RegExp(`--${name}(?:=|\\s+)(?:"([^"\\n]+)"|'([^'\\n]+)'|([^\\s]+))`)); const literal = value?.[1] || value?.[2] || value?.[3]; if (!literal || /[$`]/.test(literal)) throw new Error('Modal credential must be literal'); return literal; };
  return JSON.stringify({ token_id: field('token-id'), token_secret: field('token-secret') });
}

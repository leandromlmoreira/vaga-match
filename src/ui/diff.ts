export interface DiffParts {
  readonly prefix: string;
  readonly removed: string;
  readonly added: string;
  readonly suffix: string;
}

const WORD = /[\p{L}\p{N}#+]/u;

function isWord(ch: string | undefined): boolean {
  return ch !== undefined && WORD.test(ch);
}

export function diffInline(before: string, after: string): DiffParts {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  const touchesWord = (i: number, j: number) => isWord(before[i]) || isWord(after[j]);
  while (start > 0 && isWord(before[start - 1]) && touchesWord(start, start)) start--;
  while (endBefore < before.length && isWord(before[endBefore]) && touchesWord(endBefore - 1, endAfter - 1)) {
    endBefore++;
    endAfter++;
  }
  return {
    prefix: before.slice(0, start),
    removed: before.slice(start, endBefore),
    added: after.slice(start, endAfter),
    suffix: before.slice(endBefore),
  };
}

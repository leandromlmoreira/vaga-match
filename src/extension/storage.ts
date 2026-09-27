export interface StoredResume {
  readonly text: string;
  readonly updatedAt: number;
}

const KEY = "resume";

function isStoredResume(value: unknown): value is StoredResume {
  return typeof value === "object" && value !== null && typeof (value as StoredResume).text === "string" && typeof (value as StoredResume).updatedAt === "number";
}

export async function loadResume(): Promise<StoredResume | null> {
  const data = await chrome.storage.local.get(KEY);
  const value: unknown = data[KEY];
  return isStoredResume(value) && value.text.trim().length > 0 ? value : null;
}

export async function saveResume(text: string): Promise<StoredResume> {
  const value: StoredResume = { text, updatedAt: Date.now() };
  await chrome.storage.local.set({ [KEY]: value });
  return value;
}

export async function deleteResume(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

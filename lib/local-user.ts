export const LOCAL_USER_STORAGE_KEY = "prospect-hunter-user";

export type LocalUser = {
  id: string;
  name: string;
};

export function loadLocalUser(storage?: Storage | null): LocalUser {
  if (!storage) {
    return { id: "owner", name: "Operador 1" };
  }

  const raw = storage.getItem(LOCAL_USER_STORAGE_KEY);
  if (!raw) {
    return { id: "owner", name: "Operador 1" };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { id?: unknown }).id === "string" &&
      typeof (parsed as { name?: unknown }).name === "string"
    ) {
      return parsed as LocalUser;
    }
  } catch {
    return { id: "owner", name: "Operador 1" };
  }

  return { id: "owner", name: "Operador 1" };
}

export function saveLocalUser(user: LocalUser, storage?: Storage | null): void {
  if (!storage) {
    return;
  }

  storage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
}

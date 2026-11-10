import { getJSON } from "./archive";

export type Capabilities = {
  api_version: string;
  audience?: string;
  collection?: string;
  collections?: string[];
  modules: Record<string, string>;
};

type Pending = {
  promise: Promise<unknown>;
  controller: AbortController;
  waiters: number;
};

const abortError = () =>
  new DOMException("The request was aborted.", "AbortError");

// Identical parameters in another order are the same query.
const canonical = (path: string) => {
  const [base, query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  params.sort();
  return `${base}?${params}`;
};

// In-memory reuse for catalog reads, for one page session. Playback resolution,
// recording details and status polling stay outside it: they bind playback or
// report live progress, and nothing here reaches browser storage.
export function createCatalogData({
  request = getJSON as <T>(path: string, signal: AbortSignal) => Promise<T>,
  now = Date.now,
  freshMs = 30_000,
  maxEntries = 64,
} = {}) {
  const pending = new Map<string, Pending>();
  const settled = new Map<string, { value: unknown; at: number }>();
  let runtime: Capabilities | undefined;

  const remember = (key: string, value: unknown) => {
    settled.delete(key);
    settled.set(key, { value, at: now() });
    while (settled.size > maxEntries)
      settled.delete(settled.keys().next().value as string);
  };

  // Each caller can abort only its own wait. The shared request stops when its
  // last caller leaves, and leaves the map so a later read starts a new one.
  const join = <T>(
    key: string,
    path: string,
    signal: AbortSignal,
    retain: boolean,
  ): Promise<T> => {
    if (signal.aborted) return Promise.reject(abortError());
    const cached = settled.get(key);
    if (cached && now() - cached.at < freshMs) {
      settled.delete(key);
      settled.set(key, cached);
      return Promise.resolve(cached.value as T);
    }
    settled.delete(key);
    let entry = pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      const created: Pending = {
        controller,
        waiters: 0,
        promise: request<T>(path, controller.signal).then(
          (value) => {
            if (pending.get(key) === created) {
              pending.delete(key);
              if (retain) remember(key, value);
            }
            return value;
          },
          (reason: unknown) => {
            if (pending.get(key) === created) pending.delete(key);
            throw reason;
          },
        ),
      };
      pending.set(key, created);
      entry = created;
    }
    const shared = entry;
    shared.waiters += 1;
    return new Promise<T>((resolve, reject) => {
      const abandon = () => {
        shared.waiters -= 1;
        if (shared.waiters === 0 && pending.get(key) === shared) {
          pending.delete(key);
          shared.controller.abort();
        }
        reject(abortError());
      };
      signal.addEventListener("abort", abandon, { once: true });
      shared.promise.then(
        (value) => {
          signal.removeEventListener("abort", abandon);
          resolve(value as T);
        },
        (reason: unknown) => {
          signal.removeEventListener("abort", abandon);
          reject(reason);
        },
      );
    });
  };

  const capabilities = async (signal: AbortSignal): Promise<Capabilities> => {
    if (signal.aborted) throw abortError();
    if (runtime) return runtime;
    const version = await join<Capabilities>(
      "capabilities",
      "/api/version",
      signal,
      false,
    );
    runtime = version;
    return version;
  };

  return {
    capabilities,
    // A retry after a failure must be able to observe a repaired runtime.
    resetCapabilities: () => {
      runtime = undefined;
    },
    // Scoped to the runtime that answered, so a different engine, audience or
    // module set can never receive another's cached responses.
    read: async <T>(path: string, signal: AbortSignal): Promise<T> => {
      const version = await capabilities(signal);
      return join<T>(
        `${JSON.stringify(version)}\n${canonical(path)}`,
        path,
        signal,
        true,
      );
    },
  };
}

export const catalogData = createCatalogData();

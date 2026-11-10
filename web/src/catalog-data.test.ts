import { describe, expect, it, vi } from "vitest";
import { createCatalogData } from "./catalog-data";

const version = { api_version: "1", audience: "private", modules: {} };

function harness(options: { freshMs?: number; maxEntries?: number } = {}) {
  let clock = 1_000;
  const calls: {
    path: string;
    signal: AbortSignal;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }[] = [];
  const request = <T,>(path: string, signal: AbortSignal) =>
    new Promise<T>((resolve, reject) => {
      calls.push({ path, signal, resolve: resolve as (value: unknown) => void, reject });
    });
  const data = createCatalogData({ request, now: () => clock, ...options });
  const answerVersion = async (body: unknown = version) => {
    await vi.waitFor(() =>
      expect(calls.some((call) => call.path === "/api/version")).toBe(true),
    );
    calls.find((call) => call.path === "/api/version")!.resolve(body);
    await Promise.resolve();
  };
  const pending = async (path: string) => {
    await vi.waitFor(() =>
      expect(calls.filter((call) => call.path === path).length).toBeGreaterThan(0),
    );
    return calls.filter((call) => call.path === path).at(-1)!;
  };
  const count = (path: string) => calls.filter((call) => call.path === path).length;
  return { data, calls, answerVersion, pending, count, advance: (ms: number) => (clock += ms) };
}

const live = () => new AbortController().signal;

describe("catalog data reuse", () => {
  it("shares one successful capability read across callers", async () => {
    const { data, answerVersion, count } = harness();
    const reads = [data.capabilities(live()), data.capabilities(live())];
    await answerVersion();
    await expect(Promise.all(reads)).resolves.toEqual([version, version]);
    await expect(data.capabilities(live())).resolves.toEqual(version);
    expect(count("/api/version")).toBe(1);
  });

  it("does not retain a failed capability read and rereads after an explicit reset", async () => {
    const { data, pending, count } = harness();
    const first = data.capabilities(live());
    (await pending("/api/version")).reject(new Error("down"));
    await expect(first).rejects.toThrow("down");
    const second = data.capabilities(live());
    expect(count("/api/version")).toBe(2);
    (await pending("/api/version")).resolve(version);
    await second;
    data.resetCapabilities();
    void data.capabilities(live());
    expect(count("/api/version")).toBe(3);
  });

  it("coalesces identical in-flight pages regardless of parameter order", async () => {
    const { data, answerVersion, pending, count, calls } = harness();
    const one = data.read("/items?a=1&b=2", live());
    const two = data.read("/items?b=2&a=1", live());
    await answerVersion();
    (await pending("/items?a=1&b=2")).resolve({ total: 1 });
    await expect(Promise.all([one, two])).resolves.toEqual([{ total: 1 }, { total: 1 }]);
    expect(count("/items?a=1&b=2") + count("/items?b=2&a=1")).toBe(1);
    expect(calls).toHaveLength(2);
  });

  it("reuses a fresh page for 30 seconds and revalidates after expiry", async () => {
    const { data, answerVersion, pending, count, advance } = harness();
    const first = data.read("/items?cursor=", live());
    await answerVersion();
    (await pending("/items?cursor=")).resolve({ total: 1 });
    await first;
    advance(29_999);
    await expect(data.read("/items?cursor=", live())).resolves.toEqual({ total: 1 });
    expect(count("/items?cursor=")).toBe(1);
    advance(1);
    const expired = data.read("/items?cursor=", live());
    (await vi.waitFor(async () => {
      expect(count("/items?cursor=")).toBe(2);
      return pending("/items?cursor=");
    })).resolve({ total: 2 });
    await expect(expired).resolves.toEqual({ total: 2 });
  });

  it("keeps complete queries separate, including cursor and seed", async () => {
    const { data, answerVersion, pending, count } = harness();
    const a = data.read("/items?cursor=a&seed=1", live());
    const b = data.read("/items?cursor=b&seed=1", live());
    const c = data.read("/items?cursor=a&seed=2", live());
    await answerVersion();
    (await pending("/items?cursor=a&seed=1")).resolve("a1");
    (await pending("/items?cursor=b&seed=1")).resolve("b1");
    (await pending("/items?cursor=a&seed=2")).resolve("a2");
    await expect(Promise.all([a, b, c])).resolves.toEqual(["a1", "b1", "a2"]);
    expect(count("/items?cursor=a&seed=1")).toBe(1);
  });

  it("does not reuse responses across runtime identities", async () => {
    const { data, answerVersion, pending, count } = harness();
    const first = data.read("/facets", live());
    await answerVersion();
    (await pending("/facets")).resolve("private");
    await first;
    data.resetCapabilities();
    const second = data.read("/facets", live());
    await vi.waitFor(() => expect(count("/api/version")).toBe(2));
    const reread = await pending("/api/version");
    reread.resolve({ ...version, audience: "public" });
    await vi.waitFor(() => expect(count("/facets")).toBe(2));
    (await pending("/facets")).resolve("public");
    await expect(second).resolves.toBe("public");
  });

  it("does not retain errors, so a retry issues a new request", async () => {
    const { data, answerVersion, pending, count } = harness();
    const first = data.read("/items", live());
    await answerVersion();
    (await pending("/items")).reject(new Error("timeout"));
    await expect(first).rejects.toThrow("timeout");
    const retry = data.read("/items", live());
    await vi.waitFor(() => expect(count("/items")).toBe(2));
    (await pending("/items")).resolve("ok");
    await expect(retry).resolves.toBe("ok");
  });

  it("lets one caller abort without stranding another", async () => {
    const { data, answerVersion, pending } = harness();
    const leaving = new AbortController();
    const left = data.read("/items", leaving.signal);
    const stays = data.read("/items", live());
    await answerVersion();
    const shared = await pending("/items");
    leaving.abort();
    await expect(left).rejects.toMatchObject({ name: "AbortError" });
    expect(shared.signal.aborted).toBe(false);
    shared.resolve("page");
    await expect(stays).resolves.toBe("page");
  });

  it("aborts when the last caller leaves and starts fresh afterwards", async () => {
    const { data, answerVersion, pending, count } = harness();
    const leaving = new AbortController();
    const abandoned = data.read("/items", leaving.signal);
    await answerVersion();
    const first = await pending("/items");
    leaving.abort();
    await expect(abandoned).rejects.toMatchObject({ name: "AbortError" });
    expect(first.signal.aborted).toBe(true);
    const next = data.read("/items", live());
    await vi.waitFor(() => expect(count("/items")).toBe(2));
    const second = await pending("/items");
    expect(second).not.toBe(first);
    first.resolve("stale");
    second.resolve("current");
    await expect(next).resolves.toBe("current");
  });

  it("ignores an abandoned response that arrives late", async () => {
    const { data, answerVersion, pending, count, advance } = harness();
    const leaving = new AbortController();
    const abandoned = data.read("/items?q=old", leaving.signal);
    await answerVersion();
    const late = await pending("/items?q=old");
    leaving.abort();
    await expect(abandoned).rejects.toMatchObject({ name: "AbortError" });
    late.resolve("old rows");
    await Promise.resolve();
    advance(1);
    const revisit = data.read("/items?q=old", live());
    await vi.waitFor(() => expect(count("/items?q=old")).toBe(2));
    (await pending("/items?q=old")).resolve("current rows");
    await expect(revisit).resolves.toBe("current rows");
  });

  it("evicts the least recently used page beyond its bound", async () => {
    const { data, answerVersion, pending, count } = harness({ maxEntries: 2 });
    const load = async (path: string) => {
      const read = data.read(path, live());
      (await pending(path)).resolve(path);
      await read;
    };
    const first = data.read("/a", live());
    await answerVersion();
    (await pending("/a")).resolve("/a");
    await first;
    await load("/b");
    await data.read("/a", live());
    await load("/c");
    await data.read("/a", live());
    expect(count("/a")).toBe(1);
    void data.read("/b", live());
    await vi.waitFor(() => expect(count("/b")).toBe(2));
  });
});

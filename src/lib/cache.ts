/** Small memory-only cache; never persists identities or private documents. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly capacity = 100,
    private readonly now = Date.now,
  ) {}
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key: string, value: T): void {
    this.entries.delete(key);
    if (this.entries.size >= this.capacity) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
  }
  clear(): void {
    this.entries.clear();
  }
}

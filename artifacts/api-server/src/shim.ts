// SQLite returns TEXT for datetime columns, but existing code assumes Date objects.
// This runtime shim allows .toISOString() on strings (returns the string unchanged).
if (!String.prototype.toISOString) {
  Object.defineProperty(String.prototype, "toISOString", {
    value: function toISOString(this: string) {
      return this.valueOf();
    },
    writable: false,
    configurable: true,
  });
}

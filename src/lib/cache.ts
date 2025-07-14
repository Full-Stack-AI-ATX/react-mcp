/**
 * A simple, in-memory cache.
 *
 * This is a singleton, so it can be used across the app.
 * USAGE: cache.get('key'), cache.set('key', value), cache.has('key'), cache.remove('key')
 */
const cache = new Map<string, any>();

const get = <T>(key: string): T | undefined => {
  return cache.get(key);
};

const set = <T>(key: string, value: T): void => {
  cache.set(key, value);
};

const has = (key: string): boolean => {
  return cache.has(key);
};

const remove = (key: string): void => {
  cache.delete(key);
};


export default { get, set, has, remove };

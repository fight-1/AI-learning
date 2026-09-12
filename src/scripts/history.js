// 阅读足迹：记录访问过的文章（用于「最近浏览」与「系列已读进度」）。
// 纯 localStorage，零后端；访问过即视为已读。
const KEY = 'visited';
const MAX = 30;

export function getVisited() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export function markVisited(entry) {
  if (!entry || !entry.id) return;
  const list = getVisited().filter((x) => x.id !== entry.id);
  list.unshift({ id: entry.id, title: entry.title || entry.id, url: entry.url || '', ts: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (e) {}
}

export function isVisited(id) {
  return getVisited().some((x) => x.id === id);
}

export function visitedIds() {
  return new Set(getVisited().map((x) => x.id));
}

export function clearVisited() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}

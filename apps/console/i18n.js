import en from './locales/en.js';
import zhCN from './locales/zh-CN.js';

export const catalogs = Object.freeze({ en, 'zh-CN': zhCN });
export const supportedLocales = Object.freeze(['en', 'zh-CN']);
export const localeOptions = Object.freeze([{value:'en',label:'English'},{value:'zh-CN',label:'简体中文'}]);
export const preferenceKey = 'hexagon.console.locale';
export function resolveLocale(saved, languages = []) {
  if (supportedLocales.includes(saved)) return saved;
  for (const language of languages) {
    const tag = String(language).replaceAll('_', '-').toLowerCase();
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
    if (tag === 'zh' || tag === 'zh-cn' || tag === 'zh-sg' || tag.startsWith('zh-hans')) return 'zh-CN';
  }
  return 'en';
}
function initialLocale() {
  let saved;
  try { saved = globalThis.localStorage?.getItem(preferenceKey); } catch { /* Storage may be blocked. */ }
  return resolveLocale(saved, globalThis.navigator?.languages || []);
}
let locale = initialLocale();
export function getLocale() { return locale; }
export function setLocale(next) {
  if (!supportedLocales.includes(next)) throw new RangeError('Unsupported locale');
  locale = next;
  try { globalThis.localStorage?.setItem(preferenceKey, next); } catch { /* Keep the in-memory choice. */ }
  if (typeof document !== 'undefined') {
    applyTranslations();
    document.dispatchEvent(new CustomEvent('localechange', { detail: { locale: next } }));
  }
}
export function translate(language, key, parameters = {}) {
  const message = catalogs[language]?.[key];
  // Missing messages are defects, never a silent fallback to another language.
  if (typeof message !== 'string') throw new Error(`Missing translation: ${language}/${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(parameters, name)) throw new Error(`Missing translation parameter: ${key}/${name}`);
    return String(parameters[name]);
  });
}
export function t(key, parameters) { return translate(locale, key, parameters); }
export class UiError extends Error {
  constructor(key, parameters = {}) { super(); this.key = key; this.parameters = parameters; }
  get message() { return t(this.key, Object.fromEntries(Object.entries(this.parameters).map(([key,value])=>[key,typeof value==='function'?value():value]))); }
}
export function formatNumber(value, options = {}) { return new Intl.NumberFormat(locale, options).format(value); }
export function formatBytes(value) { return formatNumber(value, { style: 'unit', unit: 'byte', unitDisplay: 'short' }); }
export function formatDate(value, timeOnly = false) {
  return new Intl.DateTimeFormat(locale, timeOnly ? { timeStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function formatList(values) { return new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(values.map(String)); }
export function applyTranslations(root = document) {
  if (root === document) { document.documentElement.lang = locale; document.documentElement.dir = 'ltr'; }
  for (const node of root.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const attribute of ['placeholder', 'aria-label']) {
    for (const node of root.querySelectorAll(`[data-i18n-${attribute}]`)) node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`)));
  }
  document.documentElement.removeAttribute('data-i18n-pending');
}
if (typeof document !== 'undefined') applyTranslations();

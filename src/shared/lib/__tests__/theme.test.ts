import { describe, expect, it, beforeEach } from 'vitest';
import { getThemePreference, applyTheme, setThemePreference, initTheme } from '../theme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('يعيد "system" كتفضيل افتراضي عند عدم وجود قيمة محفوظة', () => {
    expect(getThemePreference()).toBe('system');
  });

  it('يعيد "system" عند قيمة محفوظة غير صالحة', () => {
    window.localStorage.setItem('theme-preference', 'garbage');
    expect(getThemePreference()).toBe('system');
  });

  it('يقرأ القيمة المحفوظة الصالحة (light/dark)', () => {
    window.localStorage.setItem('theme-preference', 'dark');
    expect(getThemePreference()).toBe('dark');
  });

  it('applyTheme يضبط data-theme للقيم الصريحة', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applyTheme يزيل data-theme عند "system"', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('setThemePreference يحفظ التفضيل ويطبّقه فورًا', () => {
    setThemePreference('dark');
    expect(window.localStorage.getItem('theme-preference')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('initTheme يطبّق التفضيل المحفوظ مسبقًا عند بدء التطبيق', () => {
    window.localStorage.setItem('theme-preference', 'light');
    initTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

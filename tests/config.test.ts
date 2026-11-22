/**
 * Tests for `readConfig`: dereferencing the volatile configuration references
 * Cordis hands to `apply`.
 *
 * The regression this guards against is concrete: adding a field to `Config`
 * without wiring it through `readConfig` would silently read `undefined`
 * everywhere the plain snapshot is used.
 */

import { describe, expect, it } from 'vitest';
import { Config, type ConfigSource, readConfig } from '../src/host/config.js';

describe('readConfig', () => {
    it('resolves the default configuration into a live reference with get()', () => {
        const parsed = Config({});

        expect(typeof parsed.defaultPreset.get).toBe('function');
        expect(readConfig(parsed).defaultPreset).toBe('danger-full-access');
    });

    it('reads the reference again on every call, not a value captured once', () => {
        let current = 'a';
        const source: ConfigSource = { defaultPreset: { get: () => current } };

        expect(readConfig(source).defaultPreset).toBe('a');

        current = 'b';

        expect(readConfig(source).defaultPreset).toBe('b');
    });
});

/**
 * Tests for the glyph set the composer control draws.
 *
 * The glyphs are data, so the risk is a missing or mistyped entry rather than
 * rendering: every preset the design set covers must resolve, and a preset
 * outside it must fall back to no icon.
 */

import { describe, expect, it } from 'vitest';
import { menuGlyph, presetGlyph } from '../src/icons.js';
import { AUTO_REVIEW_PRESET, FULL_ACCESS_PRESET } from '../src/shared.js';

describe('presetGlyph', () => {
    it('draws every preset the design set covers', () => {
        for (const preset of [
            'read-only',
            'workspace-write',
            FULL_ACCESS_PRESET,
            AUTO_REVIEW_PRESET,
        ]) {
            expect(presetGlyph(preset)?.paths.length).toBeGreaterThan(0);
        }
    });

    it('returns no icon for a value outside the design set', () => {
        expect(presetGlyph('custom')).toBeUndefined();
    });
});

describe('menuGlyph', () => {
    it('exposes the trigger chevron', () => {
        expect(menuGlyph('chevron').paths[0]?.d).toContain('M4 6');
    });

    it('exposes the current-row check mark', () => {
        expect(menuGlyph('check').paths[0]?.d).toContain('M2.25 8.5');
    });
});

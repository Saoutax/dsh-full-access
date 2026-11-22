/**
 * Tests for the chip's copy and rows.
 *
 * The regression this guards against is the point of the plugin: no row may
 * carry a `confirmation` payload, because the popup shell renders the risk
 * dialog for any option that has one.
 */

import { describe, expect, it } from 'vitest';
import {
    chipLabel,
    displayPresetName,
    menuItems,
    permissionLabel,
} from '../src/client/presentation.js';
import {
    AUTO_REVIEW_PRESET,
    FULL_ACCESS_PRESET,
    type PermissionCatalog,
    type PresetOption,
} from '../src/shared.js';

/** Dictionary of the test locale; lookup falls back to the key itself. */
const DICT: Record<string, string> = {
    'preset.readOnly': 'Read Only',
    'preset.workspaceWrite': 'Workspace Write',
    'preset.fullAccess': 'Full access',
    'auto.label': 'Auto review',
    'auto.badge': 'EXP',
    'auto.description': 'Runs without a sandbox.',
};

/**
 * Dictionary lookup, as the locale service binds it.
 * @param key - message key.
 * @returns the test copy.
 */
const t = (key: string): string => DICT[key] ?? key;

/**
 * Build one catalog entry.
 * @param value - preset machine value.
 * @param name - Host-supplied name, the key when omitted.
 * @param description - Host-supplied description.
 * @returns the catalog entry.
 */
const option = (value: string, name = value, description?: string): PresetOption => {
    return { value, name, ...(description === undefined ? {} : { description }) };
};

/**
 * Build one catalog.
 * @param options - selectable presets.
 * @param defaultPreset - effective default of the composition.
 * @returns the catalog.
 */
const catalog = (
    options: readonly PresetOption[],
    defaultPreset = FULL_ACCESS_PRESET,
): PermissionCatalog => {
    return { options, defaultOptions: options, defaultPreset };
};

describe('displayPresetName', () => {
    it('renders a conventional kebab key in title case', () => {
        expect(displayPresetName('danger-full-access')).toBe('Danger Full Access');
    });

    it('leaves a human label untouched', () => {
        expect(displayPresetName('Claude Mode')).toBe('Claude Mode');
    });
});

describe('permissionLabel', () => {
    it('uses the product label when the Host only repeats the key', () => {
        expect(permissionLabel(option(FULL_ACCESS_PRESET), t)).toBe('Full access');
    });

    it('uses the localized product label instead of the shipped English fallback', () => {
        expect(permissionLabel(option('read-only', 'Read Only'), t)).toBe('Read Only');
    });

    it('keeps a host-supplied label', () => {
        expect(permissionLabel(option('partner-mode', 'Totally Open'), t)).toBe('Totally Open');
    });

    it('localizes the Auto review preset from this plugin', () => {
        expect(permissionLabel(option(AUTO_REVIEW_PRESET, 'auto'), t)).toBe('Auto review');
    });
});

describe('menuItems', () => {
    it('marks the current preset and keeps catalog order', () => {
        const items = menuItems(
            catalog([option('read-only'), option('workspace-write'), option(FULL_ACCESS_PRESET)]),
            'workspace-write',
            t,
        );
        expect(items.map(item => item.id)).toEqual([
            'read-only',
            'workspace-write',
            FULL_ACCESS_PRESET,
        ]);
        expect(items.filter(item => item.active).map(item => item.id)).toEqual(['workspace-write']);
    });

    it('adds the experimental badge and copy only to Auto review', () => {
        const items = menuItems(
            catalog([option(AUTO_REVIEW_PRESET, 'auto'), option(FULL_ACCESS_PRESET)]),
            'auto',
            t,
        );
        expect(items[0]).toMatchObject({ badge: 'EXP', detail: 'Runs without a sandbox.' });
        expect(items[1]?.badge).toBeUndefined();
    });

    it('passes a host-supplied description through', () => {
        const entries = catalog([
            option('workspace-write', 'workspace-write', 'Edits stay inside the workspace.'),
        ]);
        const items = menuItems(entries, 'workspace-write', t);
        expect(items[0]?.detail).toBe('Edits stay inside the workspace.');
    });

    it('never emits a confirmation payload', () => {
        const items = menuItems(
            catalog([option(FULL_ACCESS_PRESET), option(AUTO_REVIEW_PRESET, 'auto')]),
            FULL_ACCESS_PRESET,
            t,
        );
        for (const item of items) {
            expect('confirmation' in item).toBe(false);
        }
    });
});

describe('chipLabel', () => {
    it('describes the current preset from the catalog', () => {
        expect(chipLabel(catalog([option('auto')]), AUTO_REVIEW_PRESET, t)).toEqual({
            label: 'Auto review',
            description: 'Runs without a sandbox.',
        });
    });

    it('falls back to the display name for a withdrawn value', () => {
        expect(chipLabel(catalog([option('read-only')]), 'custom', t)).toEqual({ label: 'Custom' });
    });
});

/**
 * Copy and menu rows of the composer permission chip.
 *
 * Pure functions, kept out of the component so the rules are readable and
 * testable: which preset gets a product label, which one carries the `EXP`
 * badge, and which row is the current value. Nothing here renders or fetches.
 *
 * @module @saoutax/dsh-full-access/client/presentation
 */

import {
    AUTO_REVIEW_PRESET,
    FULL_ACCESS_PRESET,
    type PermissionCatalog,
    type PresetOption,
} from '../shared.js';

/** Dictionary key of a built-in product label. */
type BuiltinLabelKey = 'preset.readOnly' | 'preset.workspaceWrite' | 'preset.fullAccess';

/** One row of the chip's popup. */
interface PermissionMenuItem {
    /** Preset machine value, also the row key. */
    readonly id: string;
    /** Localized product label or the preset's display name. */
    readonly label: string;
    /** One sentence about the preset, when the Host or this plugin supplies one. */
    readonly detail?: string;
    /** Short badge rendered next to the label, used by the experimental preset. */
    readonly badge?: string;
    /** Whether this row is the Session's current value. */
    readonly active: boolean;
}

/** What the closed chip shows for the current value. */
interface ChipLabel {
    /** Visible name of the current mode. */
    readonly label: string;
    /** Tooltip text, when the catalog describes the mode. */
    readonly description?: string;
}

/** Translate function bound to this plugin's dictionary namespace. */
type Translate = (key: string, params?: Record<string, unknown>) => string;

/** Built-in preset values and the product label each one renders. */
const PRESET_LABEL_KEYS: ReadonlyMap<string, BuiltinLabelKey> = new Map([
    ['read-only', 'preset.readOnly'],
    ['workspace-write', 'preset.workspaceWrite'],
    [FULL_ACCESS_PRESET, 'preset.fullAccess'],
]);

/** English product labels, the fallback when a Host supplies no translated name. */
const FALLBACK_LABELS: Record<BuiltinLabelKey, string> = {
    'preset.readOnly': 'Read Only',
    'preset.workspaceWrite': 'Workspace Write',
    'preset.fullAccess': 'Full access',
};

/**
 * Convert a conventional kebab-case preset key into title case.
 * @param name - Host-supplied preset name or key.
 * @returns the title-cased key, or a non-kebab name unchanged.
 */
const displayPresetName = (name: string): string => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        return name;
    }
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Render one preset under its product label.
 *
 * A configured preset keeps the Host's own label unless that label is just the
 * preset key or the shipped English product name; in those two cases the
 * active locale's product label is used instead.
 *
 * @param option - catalog entry to label.
 * @param t - dictionary lookup of this plugin.
 * @returns the localized product label or the preset's display name.
 */
const permissionLabel = (option: PresetOption, t: Translate): string => {
    if (option.value === AUTO_REVIEW_PRESET) {
        return t('auto.label');
    }
    const key = PRESET_LABEL_KEYS.get(option.value);
    if (
        key !== undefined &&
        (option.name === option.value || option.name === FALLBACK_LABELS[key])
    ) {
        return t(key);
    }
    return displayPresetName(option.name);
};

/**
 * Resolve the one-sentence description of a preset.
 * @param option - catalog entry to describe.
 * @param t - dictionary lookup of this plugin.
 * @returns the localized Auto copy, the Host description, or undefined.
 */
const permissionDetail = (option: PresetOption, t: Translate): string | undefined => {
    return option.value === AUTO_REVIEW_PRESET ? t('auto.description') : option.description;
};

/**
 * Resolve the short badge of a preset.
 * @param option - catalog entry to badge.
 * @param t - dictionary lookup of this plugin.
 * @returns the experimental badge for Auto review, undefined otherwise.
 */
const permissionBadge = (option: PresetOption, t: Translate): string | undefined => {
    return option.value === AUTO_REVIEW_PRESET ? t('auto.badge') : undefined;
};

/**
 * Build the popup rows of the chip.
 * @param catalog - complete process catalog.
 * @param currentValue - the Session's effective preset.
 * @param t - dictionary lookup of this plugin.
 * @returns one row per selectable preset, in catalog order.
 */
const menuItems = (
    catalog: PermissionCatalog,
    currentValue: string,
    t: Translate,
): PermissionMenuItem[] => {
    return catalog.options.map(option => {
        const row = {
            id: option.value,
            label: permissionLabel(option, t),
            active: option.value === currentValue,
        };
        const detail = permissionDetail(option, t);
        const badge = permissionBadge(option, t);
        return {
            ...row,
            ...(detail === undefined ? {} : { detail }),
            ...(badge === undefined ? {} : { badge }),
        };
    });
};

/**
 * Resolve what the closed chip shows.
 *
 * A value the catalog still lists keeps its catalog label; a withdrawn value
 * and the derived `custom` state render their display name, so the chip never
 * shows an empty control.
 *
 * @param catalog - complete process catalog.
 * @param currentValue - the Session's effective preset.
 * @param t - dictionary lookup of this plugin.
 * @returns the visible label and optional tooltip of the current mode.
 */
const chipLabel = (catalog: PermissionCatalog, currentValue: string, t: Translate): ChipLabel => {
    const option = catalog.options.find(candidate => candidate.value === currentValue);
    if (option === undefined) {
        return { label: displayPresetName(currentValue) };
    }
    const description = permissionDetail(option, t);
    return {
        label: permissionLabel(option, t),
        ...(description === undefined ? {} : { description }),
    };
};

/** The popup row shape, the chip label shape, and the three label helpers. */
export type { PermissionMenuItem, ChipLabel, Translate, BuiltinLabelKey };
export {
    displayPresetName,
    permissionLabel,
    permissionDetail,
    permissionBadge,
    menuItems,
    chipLabel,
};

/**
 * Values shared by both halves of the plugin.
 *
 * Dependency-free on purpose: the Host bundle and the browser bundle both
 * import this module, and neither may pull a runtime import across the wire
 * boundary.
 *
 * @module @saoutax/dsh-full-access/shared
 */

/** Preset that grants full filesystem access and skips approval prompts. */
const FULL_ACCESS_PRESET = 'danger-full-access';

/** Preset that runs without a sandbox after a per-call model review. */
const AUTO_REVIEW_PRESET = 'auto';

/** Preset this plugin pins into freshly created sessions unless configured otherwise. */
const DEFAULT_PRESET = FULL_ACCESS_PRESET;

/** Host command that switches one Session's permission preset. */
const PERMISSION_COMMAND = 'permission';

/** One preset as the Host catalog publishes it. */
interface PresetOption {
    /** Stable machine value: a configured preset key, `auto`, or derived `custom`. */
    readonly value: string;
    /** Display label supplied by the Host, or the raw preset key. */
    readonly name: string;
    /** One user-facing sentence about the preset, when the Host configures one. */
    readonly description?: string;
}

/** Complete process-level catalog the Host serves to permission surfaces. */
interface PermissionCatalog {
    /** Every selectable preset, in contribution order. */
    readonly options: readonly PresetOption[];
    /** Configured presets eligible as defaults for future sessions. */
    readonly defaultOptions: readonly PresetOption[];
    /** Effective default preset of the composition. */
    readonly defaultPreset: string;
}

/** Current permission selection of one Session, as the projection publishes it. */
interface PermissionSelection {
    /** Effective current value: a configured preset key, `auto`, or `custom`. */
    readonly currentValue: string;
}

/**
 * Build the command line that switches a Session to one preset.
 *
 * Both the chip and the shipped surfaces go through this command, so the
 * Session records the same durable events whichever surface is used.
 * @param preset - preset machine value.
 * @returns the exact command line the Host command parser accepts.
 */
const permissionCommandLine = (preset: string): string => `/${PERMISSION_COMMAND} ${preset}`;

/** Catalog and selection shapes shared by both halves; the preset constants. */
export type { PresetOption, PermissionCatalog, PermissionSelection };
export {
    FULL_ACCESS_PRESET,
    AUTO_REVIEW_PRESET,
    DEFAULT_PRESET,
    PERMISSION_COMMAND,
    permissionCommandLine,
};

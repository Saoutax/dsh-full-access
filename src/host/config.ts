/**
 * Plugin configuration exposed to the Host.
 *
 * `defaultPreset` is volatile: the Host hands the plugin a live reference with
 * `get()`, so a settings or composition reload is visible to every later Agent
 * creation without restarting the plugin. `readConfig` is the single place
 * that dereferences it; code elsewhere must not call `get()` on its own.
 *
 * @module @saoutax/dsh-full-access/host/config
 */

import z from '@deepseek-ai/schemastery';
import { DEFAULT_PRESET } from '../shared.js';

/** Runtime shape of one volatile field: a reference that answers the current value. */
interface VolatileLike<T> {
    /** Read the value in effect right now. */
    get(): T;
}

/** The slice of the Host-supplied configuration this plugin reads. */
interface ConfigSource {
    /** Live reference to the preset pinned into freshly created Sessions. */
    readonly defaultPreset: VolatileLike<string>;
}

const Config = z.object({
    /**
     * Preset every freshly created Session starts with.
     *
     * Change `config.defaultPreset` on this plugin's row in `cordis.patch.yml`.
     * The value has to be one of the presets the deployment publishes; when it
     * is not, sessions keep the composed default and the Host logs a warning.
     */
    defaultPreset: z.string().default(DEFAULT_PRESET).volatile(),
});

/**
 * Dereference the live configuration.
 * @param source - the configuration references the Host passed to `apply`.
 * @returns one plain snapshot of the current values.
 */
const readConfig = (source: ConfigSource): { readonly defaultPreset: string } => ({
    defaultPreset: source.defaultPreset.get(),
});

export type { VolatileLike, ConfigSource };
export { Config, readConfig };

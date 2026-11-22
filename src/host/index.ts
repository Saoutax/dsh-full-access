/**
 * Host half of the full-access plugin.
 *
 * This entry pins one preset onto every freshly created Agent: it listens for
 * `agent/created` after the permission service has applied its own default and
 * replaces that value when it differs from the configured one. Existing
 * sessions, resumed sessions, and seeded forks keep whatever they already had.
 *
 * @module @saoutax/dsh-full-access
 */

import type { Context } from '@deepseek-ai/cordis';
import { Config, readConfig, type ConfigSource } from './config.js';
import { shouldPin } from './policy.js';

/** Cordis diagnostics read the plugin's own name. */
const name = 'full-access';

/** The permission service this plugin writes through. */
const inject = ['permissionPresets'];

/** One Session as the runtime presents it to `agent/created` listeners. */
interface AmbientSession {
    readonly header: { readonly isSeeded: boolean };
}

/** Payload of the creation event this plugin observes. */
interface AgentCreatedPayload {
    readonly agent: { readonly session: AmbientSession };
    readonly source: string;
}

/** The permission service face this plugin uses. */
interface PermissionPresetService {
    readonly names: readonly string[];
    current(session: AmbientSession): string;
    set(session: AmbientSession, preset: string): void;
}

declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The composed permission service; declared here because this plugin is its only typed consumer. */
        readonly permissionPresets: PermissionPresetService;
    }
    interface Events {
        /** A live Agent is ready for per-agent initialization. */
        'agent/created'(payload: AgentCreatedPayload): void;
    }
}

/**
 * Render one error for a log line.
 * @param error - the thrown value.
 * @returns its message.
 */
const describe = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/**
 * Apply the plugin: pin the configured preset onto newly created Agents.
 * @param ctx - owning Host context.
 * @param config - live configuration references.
 */
const apply = (ctx: Context, config: ConfigSource): void => {
    const service = ctx.permissionPresets;

    // Warn once at activation so a misconfigured preset is visible in the Host
    // log instead of silently doing nothing on every creation.
    if (!service.names.includes(readConfig(config).defaultPreset)) {
        ctx.logger.warn(
            `full-access: preset "${readConfig(config).defaultPreset}" is not offered by this deployment; new sessions keep the composed default`,
        );
    }

    ctx.effect(
        () =>
            ctx.on('agent/created', ({ agent, source }: AgentCreatedPayload) => {
                const desired = readConfig(config).defaultPreset;
                let current: string;
                try {
                    current = service.current(agent.session);
                } catch (error) {
                    ctx.logger.warn(
                        `full-access: could not read the session permission: ${describe(error)}`,
                    );
                    return;
                }
                const pin = shouldPin({
                    source,
                    seeded: agent.session.header.isSeeded,
                    desired,
                    available: service.names,
                    current,
                });
                if (!pin) {
                    return;
                }
                try {
                    service.set(agent.session, desired);
                } catch (error) {
                    ctx.logger.warn(`full-access: could not pin "${desired}": ${describe(error)}`);
                }
            }),
        'full-access: new-session default',
    );
};

/** The manifest facts Cordis reads from a plugin entry: name, inject, Config, apply. */
export { name, inject, Config, apply };

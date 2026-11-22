/**
 * Browser half of the full-access plugin.
 *
 * Registers one composer control: a permission chip that switches the Session's
 * preset through the Host command. Because it is a normal slot registration at
 * a lower priority than the shipped chip, the shipped surfaces stay loaded and
 * only this control changes.
 *
 * @module @saoutax/dsh-full-access/client
 */

import { permissionCommandLine } from '../shared.js';
import { PermissionCatalogDirectory } from './catalog.js';
import type { ClientContext } from './contracts.js';
import { DICTS, LOCALE_NS } from './locale.js';
import { PermissionSelect } from './select.js';
import { registerStyles } from './styles.js';
import stylesCss from './styles.css';

/** Slot of the composer's current-session permission control. */
const CHIP_SLOT = 'conversation.input.permission';

/**
 * Priority of this chip inside that single slot.
 *
 * A single slot renders the lowest-priority registration, and the shipped chip
 * registers at 0, so this must stay below it. Registering at the same priority
 * would throw instead of shadowing.
 */
const CHIP_PRIORITY = -1;

/**
 * Build the plugin object the Client module factory returns.
 * @returns the Cordis client plugin.
 */
const createClientPlugin = (): {
    name: string;
    inject: string[];
    apply: (ctx: ClientContext) => void;
} => {
    return {
        name: 'full-access-client',
        inject: ['slots', 'locale', 'sessions', 'remote', 'remote.permissionPresets'],
        apply: (ctx: ClientContext): void => {
            registerStyles(ctx, stylesCss);
            ctx.effect(() => ctx.locale.register(LOCALE_NS, DICTS), 'full-access: dictionaries');

            const catalog = new PermissionCatalogDirectory(ctx);
            ctx.effect(
                () => () => {
                    catalog.dispose();
                },
                'full-access: process catalog',
            );

            const submit = async (sessionId: string, preset: string): Promise<boolean> => {
                const live = ctx.sessions.binding(sessionId)?.session;
                if (live === undefined) {
                    return false;
                }
                const answer = await live.command(permissionCommandLine(preset));
                return answer.ok && answer.value?.matched === true;
            };

            ctx.slots.inject(CHIP_SLOT, () =>
                ctx.slots.register(
                    {
                        name: CHIP_SLOT,
                        priority: CHIP_PRIORITY,
                        locale: LOCALE_NS,
                        inject: (sessionId: string) => ({
                            hooks: {
                                permissionCatalog: catalog.store,
                                permissionInvalidations: catalog.invalidations,
                            },
                            select: (preset: string) => submit(sessionId, preset),
                        }),
                    },
                    PermissionSelect,
                ),
            );
        },
    };
};

/** The module factory the bundle wrapper registers. */
export { createClientPlugin };

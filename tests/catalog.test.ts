/**
 * Tests for the process-level permission catalog reader.
 *
 * The cases pin the behaviour that keeps two permission surfaces consistent:
 * one complete value per read, invalidation before a replacement read, and no
 * stale answer from another connection generation.
 */

import { describe, expect, it } from 'vitest';
import { PermissionCatalogDirectory } from '../src/client/catalog.js';
import type { ClientContext, ConnectionGeneration, RemoteAnswer } from '../src/client/contracts.js';
import type { PermissionCatalog } from '../src/shared.js';

/** Settle one pending catalog read. */
type Answer = (value: RemoteAnswer<PermissionCatalog>) => void;

/**
 * Build a catalog that is easy to tell apart from another one.
 * @param marker - value used for the single option and the default.
 * @returns the catalog.
 */
const catalogOf = (marker: string): PermissionCatalog => ({
    options: [{ value: marker, name: marker }],
    defaultOptions: [],
    defaultPreset: marker,
});

/**
 * Build one successful answer.
 * @param value - the catalog the Host returned.
 * @returns the answer envelope.
 */
const ok = (value: PermissionCatalog): RemoteAnswer<PermissionCatalog> => ({ ok: true, value });

/**
 * Let pending microtasks and timers settle.
 * @returns a promise that resolves after the current task queue drains.
 */
const flush = (): Promise<void> =>
    new Promise<void>(resolve => {
        setTimeout(resolve, 0);
    });

/** The fake context and the handles a test needs to drive the reader. */
interface Harness {
    readonly directory: PermissionCatalogDirectory;
    /** How many reads are waiting for an answer. */
    pendingReads(): number;
    /** Answer the oldest pending read. */
    answer(value: RemoteAnswer<PermissionCatalog>): void;
    /** Simulate a Host catalog-changed notification. */
    notifyCatalogChanged(): void;
    /** Simulate a connection generation change. */
    switchGeneration(next: ConnectionGeneration | undefined): void;
}

/**
 * Compose a directory over a fake Client context.
 * @returns the directory plus the handles that drive it.
 */
const createHarness = (): Harness => {
    const catalogListeners: (() => void)[] = [];
    const generationListeners: (() => void)[] = [];
    const answers: Answer[] = [];
    let generation: ConnectionGeneration | undefined = { id: 'g1' };

    const remote = {
        permissionPresets: {
            catalog: () =>
                new Promise<RemoteAnswer<PermissionCatalog>>(resolve => {
                    answers.push(resolve);
                }),
        },
        $on: (_event: string, listener: () => void) => {
            catalogListeners.push(listener);
            return () => {
                const index = catalogListeners.indexOf(listener);
                if (index >= 0) {
                    catalogListeners.splice(index, 1);
                }
            };
        },
    };

    const connection = {
        generation: {
            getSnapshot: () => generation,
            subscribe: (listener: () => void) => {
                generationListeners.push(listener);
                return () => {
                    const index = generationListeners.indexOf(listener);
                    if (index >= 0) {
                        generationListeners.splice(index, 1);
                    }
                };
            },
        },
    };

    const ctx: ClientContext = {
        remote,
        slots: {
            inject: () => () => {
                // The directory never touches slots.
            },
            register: () => () => {
                // The directory never touches slots.
            },
        },
        locale: {
            register: () => () => {
                // The directory never touches locale dictionaries.
            },
            bind: () => (key: string) => key,
        },
        sessions: { binding: () => undefined },
        effect: () => () => {
            // The directory owns its own subscriptions.
        },
        get: (name: string) => (name === 'connection' ? connection : undefined),
    };

    const directory = new PermissionCatalogDirectory(ctx);

    return {
        directory,
        pendingReads: () => answers.length,
        answer: value => {
            const resolve = answers.shift();
            if (resolve === undefined) {
                throw new Error('no pending catalog read');
            }
            resolve(value);
        },
        notifyCatalogChanged: () => {
            for (const listener of catalogListeners) {
                listener();
            }
        },
        switchGeneration: next => {
            generation = next;
            for (const listener of generationListeners) {
                listener();
            }
        },
    };
};

describe('PermissionCatalogDirectory', () => {
    it('reads and publishes one complete catalog', async () => {
        const harness = createHarness();
        expect(harness.directory.store.getSnapshot().value).toBeNull();
        expect(harness.pendingReads()).toBe(1);

        const loading = harness.directory.load();
        harness.answer(ok(catalogOf('read-only')));

        await expect(loading).resolves.toEqual(catalogOf('read-only'));
        expect(harness.directory.store.getSnapshot().value).toEqual(catalogOf('read-only'));
        expect(harness.pendingReads()).toBe(0);
    });

    it('re-reads after a catalog notification and ticks the invalidation', async () => {
        const harness = createHarness();
        const loading = harness.directory.load();
        harness.answer(ok(catalogOf('read-only')));
        await expect(loading).resolves.toEqual(catalogOf('read-only'));

        const before = harness.directory.invalidations.getSnapshot().count;
        harness.notifyCatalogChanged();
        expect(harness.directory.invalidations.getSnapshot().count).toBe(before + 1);
        expect(harness.pendingReads()).toBe(1);

        harness.answer(ok(catalogOf('auto')));
        await flush();
        expect(harness.directory.store.getSnapshot().value).toEqual(catalogOf('auto'));
        expect(harness.pendingReads()).toBe(0);
    });

    it('clears the old value on a generation switch before reading the new one', async () => {
        const harness = createHarness();
        const loading = harness.directory.load();
        harness.answer(ok(catalogOf('read-only')));
        await expect(loading).resolves.toEqual(catalogOf('read-only'));
        expect(harness.directory.store.getSnapshot().value).toEqual(catalogOf('read-only'));

        harness.switchGeneration({ id: 'g2' });
        expect(harness.directory.store.getSnapshot().value).toBeNull();
        expect(harness.pendingReads()).toBe(1);

        harness.answer(ok(catalogOf('workspace-write')));
        await flush();
        expect(harness.directory.store.getSnapshot().value).toEqual(catalogOf('workspace-write'));
    });

    it('rejects the load and keeps the value empty when the Remote fails', async () => {
        const harness = createHarness();
        const loading = harness.directory.load();
        const rejection = expect(loading).rejects.toThrow('internal: boom');

        harness.answer({ ok: false, error: { code: 'internal', message: 'boom' } });
        await rejection;

        expect(harness.directory.store.getSnapshot().value).toBeNull();
        expect(harness.pendingReads()).toBe(0);
    });

    it('ignores late settlements after disposal and refuses to load again', async () => {
        const harness = createHarness();
        const loading = harness.directory.load();
        const rejection = expect(loading).rejects.toThrow('disposed');

        harness.directory.dispose();
        harness.answer(ok(catalogOf('read-only')));
        await flush();
        await rejection;

        expect(harness.directory.store.getSnapshot().value).toBeNull();
        await expect(harness.directory.load()).rejects.toThrow('disposed');
    });
});

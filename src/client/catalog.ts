/**
 * One read path for the process-level permission catalog.
 *
 * Every permission surface renders the same snapshot from here, so two surfaces
 * can never show different preset lists. The directory follows the connection
 * generation: after a reconnect the previous Host's answer must be dropped, or
 * the interface would keep showing another Host's configuration.
 *
 * @module @saoutax/dsh-full-access/client/catalog
 */

import type { PermissionCatalog } from '../shared.js';
import type { ClientContext, ConnectionGeneration, ObservableSnapshot } from './contracts.js';
import { createStore, type SnapshotStore } from './store.js';

/** Catalog snapshot; stays null until the Host answers with a complete catalog. */
interface CatalogState {
    readonly value: PermissionCatalog | null;
}

/** Invalidation counter; incremented whenever displayed options must be dropped. */
interface InvalidationState {
    readonly count: number;
}

/** The only part of the connection service this directory reads. */
interface ConnectionLike {
    readonly generation: ObservableSnapshot<ConnectionGeneration | undefined>;
}

/**
 * Narrow an unknown value to a plain object.
 * @param value - candidate value.
 * @returns whether the value is a non-null object.
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

/**
 * Narrow the optional connection service out of the generic context lookup.
 * @param value - the value `ctx.get('connection')` returned.
 * @returns whether the value carries a generation snapshot.
 */
const isConnectionLike = (value: unknown): value is ConnectionLike => {
    if (!isObject(value)) {
        return false;
    }
    const generation = value.generation;
    return (
        isObject(generation) &&
        typeof generation.getSnapshot === 'function' &&
        typeof generation.subscribe === 'function'
    );
};

/** Generation id used when the deployment composes no connection service. */
const STATIC_GENERATION_ID = 'static';

/** Fresh failure for a read that has not produced a complete catalog yet. */
const emptyCatalogError = (): Error => new Error('permission catalog has no complete value');

/**
 * Catalog reader shared by the whole browser process.
 *
 * Within one generation only the newest read may publish, and invalidation,
 * generation switches, and disposal revoke every earlier result, so a returned
 * value always belongs to the current connection.
 */
class PermissionCatalogDirectory {
    /** Complete catalog; permission surfaces subscribe it for their option lists. */
    readonly store: SnapshotStore<CatalogState> = createStore<CatalogState>({ value: null });

    /** One tick per invalidation, published before the replacement read starts. */
    readonly invalidations: SnapshotStore<InvalidationState> = createStore<InvalidationState>({
        count: 0,
    });

    private readonly ctx: ClientContext;

    private readonly connection: ConnectionLike | undefined;

    private readonly stopCatalog: () => void;

    private readonly stopGeneration: (() => void) | undefined;

    private generationId: string | undefined;

    private initialized = false;

    private epoch = 0;

    private pending: Promise<void> | undefined;

    private failure = emptyCatalogError();

    private disposed = false;

    /**
     * Subscribe to both invalidation sources before the first read, closing the
     * install/read race.
     * @param ctx - root Client context carrying Remote and the optional connection service.
     */
    constructor(ctx: ClientContext) {
        this.ctx = ctx;
        const connection = ctx.get('connection');
        this.connection = isConnectionLike(connection) ? connection : undefined;
        this.stopCatalog = ctx.remote.$on('permission-presets/catalog-changed', () => {
            this.invalidate();
            this.refresh();
        });
        this.stopGeneration = this.connection?.generation.subscribe(() => {
            this.syncGeneration();
        });
        this.syncGeneration();
    }

    /** Publish one invalidation so displayed options are dropped before the replacement read settles. */
    invalidate(): void {
        this.invalidations.set({ count: this.invalidations.getSnapshot().count + 1 });
    }

    /** Re-read for the current generation; a changed generation goes through `syncGeneration`. */
    refresh(): void {
        if (this.disposed) {
            return;
        }
        const generationId = this.currentGenerationId();
        if (generationId === undefined) {
            return;
        }
        if (generationId !== this.generationId) {
            this.syncGeneration();
            return;
        }
        this.startRead(generationId);
    }

    /**
     * Wait for a complete catalog of the current generation.
     *
     * An active read settles first instead of being reused, so a previous
     * generation's answer can never be mistaken for the current one.
     * @returns the current Host generation's complete permission catalog.
     */
    async load(): Promise<PermissionCatalog> {
        if (this.pending === undefined && this.store.getSnapshot().value === null) {
            this.refresh();
        }
        while (!this.disposed) {
            const generationId = this.currentGenerationId();
            if (generationId === undefined) {
                throw new Error('permission catalog has no active Host connection');
            }
            if (generationId !== this.generationId) {
                this.syncGeneration();
            }
            const pending = this.pending;
            if (pending !== undefined) {
                await pending;
                continue;
            }
            const state = this.store.getSnapshot();
            if (state.value !== null) {
                return state.value;
            }
            throw this.failure;
        }
        throw new Error('permission catalog directory is disposed');
    }

    /** Stop both subscriptions and revoke every late settlement's write access. */
    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.epoch += 1;
        this.pending = undefined;
        this.stopGeneration?.();
        this.stopCatalog();
    }

    /** Clear the old value on a generation switch, then read for the new one. */
    private syncGeneration(): void {
        if (this.disposed) {
            return;
        }
        const generationId = this.currentGenerationId();
        if (this.initialized && generationId === this.generationId) {
            return;
        }
        if (this.initialized) {
            this.invalidate();
        }
        this.initialized = true;
        this.generationId = generationId;
        this.epoch += 1;
        this.pending = undefined;
        this.failure = emptyCatalogError();
        this.store.set({ value: null });
        if (generationId !== undefined) {
            this.startRead(generationId);
        }
    }

    /** Start one independent read; the newest epoch in the same generation wins. */
    private startRead(generationId: string): void {
        const epoch = (this.epoch += 1);
        this.failure = emptyCatalogError();
        const operation = this.ctx.remote.permissionPresets
            .catalog()
            .then(result => {
                if (!result.ok) {
                    throw new Error(`${result.error?.code}: ${result.error?.message}`);
                }
                if (result.value === undefined) {
                    throw new Error('permission catalog answer has no value');
                }
                if (!this.accepts(epoch, generationId)) {
                    return;
                }
                this.store.set({ value: result.value });
            })
            .catch((error: unknown) => {
                if (!this.accepts(epoch, generationId)) {
                    return;
                }
                this.failure = error instanceof Error ? error : new Error(String(error));
                this.store.set({ value: null });
            })
            .finally(() => {
                if (this.pending === operation) {
                    this.pending = undefined;
                }
            });
        this.pending = operation;
    }

    /** Fence a settlement by disposal, read epoch, recorded generation, and the live connection. */
    private accepts(epoch: number, generationId: string): boolean {
        return (
            !this.disposed &&
            epoch === this.epoch &&
            generationId === this.generationId &&
            this.currentGenerationId() === generationId
        );
    }

    /** Use a fixed generation without a connection service, else read the live one. */
    private currentGenerationId(): string | undefined {
        if (this.connection === undefined) {
            return STATIC_GENERATION_ID;
        }
        return this.connection.generation.getSnapshot()?.id;
    }
}

export type { CatalogState, InvalidationState };
export { PermissionCatalogDirectory };

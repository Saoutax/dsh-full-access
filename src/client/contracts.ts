/**
 * Structural types of the browser half.
 *
 * The plugin receives React from the page's module table and the Client
 * context from Cordis, so both are shapes here, never imported runtime
 * symbols. Only the shapes this plugin actually touches are declared.
 *
 * @module @saoutax/dsh-full-access/client/contracts
 */

import type { PermissionCatalog, PermissionSelection } from '../shared.js';

/** One answer the Remote channel returns. */
interface RemoteAnswer<T> {
    readonly ok: boolean;
    readonly value?: T;
    readonly error?: { readonly code: string; readonly message: string };
}

/** Observable snapshot the slot renderer subscribes to. */
interface ObservableSnapshot<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
}

/** The connection generation a catalog read belongs to. */
interface ConnectionGeneration {
    readonly id?: string;
}

/** The Remote namespaces and notifications this plugin uses. */
interface RemoteLike {
    readonly permissionPresets: {
        catalog(): Promise<RemoteAnswer<PermissionCatalog>>;
    };
    /** Subscribe to one process-level Remote notification. */
    $on(event: string, listener: () => void): () => void;
}

/** One Session's live command entry point. */
interface LiveSessionLike {
    command(line: string): Promise<RemoteAnswer<{ readonly matched: boolean }>>;
}

/** Session bindings the composer surfaces resolve through. */
interface SessionsLike {
    binding(id: string): { readonly session: LiveSessionLike } | undefined;
}

/** Selector hook the slot supplies for one injected snapshot store. */
type SelectorHook<T> = <R>(selector: (value: T) => R) => R;

/** Snapshot of one catalog invalidation counter. */
interface CatalogInvalidationState {
    /** Number of invalidations published so far. */
    readonly count: number;
}

/** Props of the composer permission control, minus the slot's own extras. */
interface PermissionSelectProps {
    /** Whether the composer currently refuses interaction. */
    readonly locked: boolean;
    /** Submit one preset for the owning Session. */
    readonly select: (preset: string) => Promise<boolean>;
    /** Read the process catalog shared by every permission surface. */
    readonly usePermissionCatalog: SelectorHook<{ readonly value: PermissionCatalog | null }>;
    /** Read the invalidation counter published before a catalog replacement read. */
    readonly usePermissionInvalidations: SelectorHook<CatalogInvalidationState>;
    /** Read the Session's current permission selection. */
    readonly useProjection: (key: 'permissions') => PermissionSelection | undefined;
    /** Translate one key of this plugin's dictionary namespace. */
    readonly t: (key: string, params?: Record<string, unknown>) => string;
}

/** Client context surface this plugin relies on. */
interface ClientContext {
    /** Slot registry and per-declaration injection. */
    readonly slots: {
        inject(key: string, callback: () => (() => void) | Iterable<() => void>): () => void;
        register(options: Record<string, unknown>, component: unknown): () => void;
    };
    /** Locale registry and lookup. */
    readonly locale: {
        register(ns: string, dicts: Record<string, Record<string, string>>): () => void;
        bind(ns: string): (key: string, params?: Record<string, unknown>) => string;
    };
    /** Session bindings used to submit a command. */
    readonly sessions: SessionsLike;
    /** Remote channel of this client. */
    readonly remote: RemoteLike;
    /** Optional services resolved by name. */
    get(name: string): unknown;
    /** Run one cleanup-owned effect for the plugin fiber lifetime. */
    effect(callback: () => (() => void) | void, label?: string): () => void;
}

/** Locale dictionary of one language, keyed by message key. */
type LocaleDict = Record<string, string>;

/** Permission control props, the connection generation, and the context face. */
export type {
    RemoteAnswer,
    ObservableSnapshot,
    ConnectionGeneration,
    RemoteLike,
    LiveSessionLike,
    SessionsLike,
    SelectorHook,
    CatalogInvalidationState,
    PermissionSelectProps,
    ClientContext,
    LocaleDict,
};

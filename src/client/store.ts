/**
 * Minimal snapshot store.
 *
 * The slot renderer binds injected hooks to an observable snapshot, so the
 * plugin needs one stable object per value: `getSnapshot` answers the current
 * reference and every publication replaces it. This is the whole contract -
 * no middleware, persistence, or diffing.
 *
 * @module @saoutax/dsh-full-access/client/store
 */

/** Observable snapshot plus the two write verbs the plugin uses. */
interface SnapshotStore<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
    /** Publish a replacement value. */
    set(next: T): void;
    /** Publish the result of a reducer over the current value. */
    update(reducer: (current: T) => T): void;
}

/**
 * Create one store with an initial value.
 * @param initial - the first snapshot.
 * @returns the store.
 */
const createStore = <T>(initial: T): SnapshotStore<T> => {
    let value = initial;
    const listeners = new Set<() => void>();
    const publish = (next: T): void => {
        if (Object.is(next, value)) {
            return;
        }
        value = next;
        for (const listener of listeners) {
            listener();
        }
    };
    return {
        getSnapshot: () => value,
        subscribe: listener => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        set: publish,
        update: reducer => {
            publish(reducer(value));
        },
    };
};

/** The store face; one factory. */
export type { SnapshotStore };
export { createStore };

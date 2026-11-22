/**
 * Decision rule for pinning a preset onto a freshly created Session.
 *
 * Kept pure and free of Harness imports so the rule reads on its own and is
 * tested without a Cordis context: the caller supplies everything the rule
 * needs to know about the Session it is handling.
 *
 * @module @saoutax/dsh-full-access/host/policy
 */

/** Sources that announce a genuinely new conversation rather than a derived one. */
const INITIAL_SOURCES: readonly string[] = ['startup', 'clear'];

/** Everything the decision needs about one created Session. */
interface PinDecision {
    /** Source the creation reported: `startup`, `resume`, `clear`, or `compact`. */
    readonly source: string;
    /** Whether the Session continues another conversation's state (fork or seeded restore). */
    readonly seeded: boolean;
    /** Preset this plugin wants the Session to use. */
    readonly desired: string;
    /** Presets the deployment currently offers. */
    readonly available: readonly string[];
    /** Preset the Session is in right now. */
    readonly current: string;
}

/**
 * Decide whether one permission switch is worth writing.
 *
 * - Only a new conversation resets permissions; `resume` and `compact` continue
 *   a conversation that already carries its own choice.
 * - A seeded Session inherits the permission of the conversation it came from,
 *   and that inherited choice outranks this plugin's default.
 * - The target has to be offered by this deployment, otherwise the Host would
 *   refuse it and leave the Session with an invalid value.
 * - An already matching Session gets no event, so the log stays free of
 *   no-op selections.
 *
 * @param input - what the caller knows about the created Session.
 * @returns whether the caller should switch this Session's preset.
 */
const shouldPin = (input: PinDecision): boolean =>
    !input.seeded &&
    INITIAL_SOURCES.includes(input.source) &&
    input.available.includes(input.desired) &&
    input.current !== input.desired;

export type { PinDecision };
export { INITIAL_SOURCES, shouldPin };

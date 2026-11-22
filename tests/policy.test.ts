/**
 * Tests for `shouldPin`: the full decision table of the new-session default.
 *
 * Each case names the reason the rule must or must not write a switch, so a
 * later change to the rule shows up as a readable failure instead of a silent
 * permission change.
 */

import { describe, expect, it } from 'vitest';
import { INITIAL_SOURCES, type PinDecision, shouldPin } from '../src/host/policy.js';

const base: PinDecision = {
    source: 'startup',
    seeded: false,
    desired: 'danger-full-access',
    available: ['auto', 'danger-full-access'],
    current: 'auto',
};

describe('shouldPin', () => {
    it('switches a freshly started session', () => {
        expect(shouldPin(base)).toBe(true);
    });

    it('switches a cleared session, which also starts a new conversation', () => {
        expect(shouldPin({ ...base, source: 'clear' })).toBe(true);
    });

    it('keeps the permission a seeded session inherited', () => {
        expect(shouldPin({ ...base, seeded: true })).toBe(false);
    });

    it('keeps a resumed session untouched', () => {
        expect(shouldPin({ ...base, source: 'resume' })).toBe(false);
    });

    it('keeps a compacted session untouched', () => {
        expect(shouldPin({ ...base, source: 'compact' })).toBe(false);
    });

    it('treats an unknown source as a derived conversation', () => {
        expect(shouldPin({ ...base, source: 'unknown' })).toBe(false);
    });

    it('skips a target the deployment does not offer', () => {
        expect(shouldPin({ ...base, desired: 'plan-only' })).toBe(false);
    });

    it('skips a session already in the target preset', () => {
        expect(shouldPin({ ...base, current: 'danger-full-access' })).toBe(false);
    });

    it('skips a deployment with no presets at all', () => {
        expect(shouldPin({ ...base, available: [] })).toBe(false);
    });

    it('recognizes only startup and clear as new conversations', () => {
        expect(INITIAL_SOURCES).toEqual(['startup', 'clear']);
    });
});

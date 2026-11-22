/*
 * Styles of the composer permission chip.
 *
 * Copied from the shipped chip's rules so the control looks like the one it
 * replaces, with the plugin's own class prefix. Every color goes through the
 * host theme tokens, so light/dark switching needs no extra work. Radii and
 * shadow stay literal: they are geometry, not theme, and the shipped control
 * uses the same values.
 *
 * The rules live in a real stylesheet, imported as text and injected as one
 * `<style>` tag at activation, so the source stays editable as CSS.
 */

/** Register the stylesheet on the client context. */
export const registerStyles = (
    ctx: { effect(callback: () => (() => void) | void, label?: string): () => void },
    css: string,
): void => {
    ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = 'full-access';
        tag.dataset.pluginCss = 'full-access/chip.css';
        tag.textContent = css;
        document.head.append(tag);
        return () => {
            tag.remove();
        };
    }, 'full-access: stylesheet');
};

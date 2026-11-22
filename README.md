# @saoutax/dsh-full-access

English | [简体中文](README.zh.md)

A DeepSeek Harness plugin with two jobs: every new session starts in **Full access**, and the composer's permission chip switches modes without the extra risk confirmation.

> [!CAUTION]
> Confirm you understand what you are doing before installing. This plugin starts new sessions in Full access and removes the risk confirmation from the composer switch.
>
> Full access runs without a sandbox and does not ask for approval per action: the model can read and write any file the current OS account can reach, run commands, and affect this machine and its network. Accidental deletion, unwanted edits, or data leaving the machine can happen in this mode, and are not always reversible. Back up first, keep important data under version control, or run in an isolated environment. Not recommended for complete beginners; do not enable it while you are unsure what these risks mean. Disabling the plugin restores the shipped default permission and confirmation flow.

## What it changes

- **New-session default.** When an Agent is created for a new conversation, the plugin pins the configured preset (default `danger-full-access`) onto that session. Resumed sessions, compacted sessions, and seeded forks keep the permission they inherited.
- **Composer chip without confirmation.** The permission chip in the composer toolbar is replaced by this plugin's own control. Choosing Full access or Auto review switches immediately; the shipped risk dialog never opens.

## What it leaves alone

- The `/permission` slash panel and the General-settings "default permission" row stay exactly as shipped. Selecting Full access or Auto review there still asks for acknowledgement, and typing `/permission <preset>` still switches directly (the Host runs the argued form without a gate).
- The General-settings default does **not** drive this plugin. Change the plugin's own `defaultPreset` instead, or disable the plugin to get the shipped default back.

## Installation

The package is published on npm. Install it with the DSH CLI:

```sh
dsh plugin --profile web add @saoutax/dsh-full-access
```

The Plugin Manager also installs a bundle from a directory or a packed `.tgz`, which is useful for offline installs and local development.

After installation the plugin runs immediately; the Web page reloads its client graph and the composer chip appears in place of the shipped one.

## Compatibility and maintenance

The plugin registers one extra entry in the existing `conversation.input.permission` slot at a lower priority than the shipped chip; a single slot renders the lowest priority, so the two never render together and disabling this plugin restores the shipped chip. The rest is plain use of public surfaces:

- the slot name and its props (`locked`, `useProjection`, injected `select`);
- the `permission-presets` catalog Remote and its catalog-changed notification;
- the Host `/permission <preset>` command;
- the `agent/created` event and the `permissionPresets` service (`names`, `current`, `set`).

Verified against DSH `0.2.2-rc.1`. A future Harness that changes one of those surfaces needs a matching change here; the client bundle fails loudly (slot entry error in the page console) rather than silently doing nothing.

## Development

```sh
pnpm install
pnpm run build     # build both halves and refresh icon.svg
pnpm run check     # oxfmt + type-aware oxlint + tsc + vitest + build
pnpm run fmt       # format
pnpm run lint      # syntax lint
```

- `src/host/` builds to `lib/index.js` (ESM). Harness packages stay external and resolve from the dsh installation.
- `src/client/` builds to `lib/client.js`, wrapped as a `window.__ModuleLoader__.load({ id, factory })` registration. React and ReactDOM come from the page's module table; the chip glyphs are inlined from the shipped design set.

## Releases

Every push to `main` runs CI. On `main`, [release-please](https://github.com/googleapis/release-please) keeps one release PR open with the next version and the CHANGELOG entry. Merging that PR creates the tag and the GitHub Release, attaches the packed `.tgz`, and publishes that exact tag to npm.

## Icons

The chip and menu glyphs reproduce the icon set that ships with DeepSeek Harness (MIT), so the control looks like the one it replaces. The plugin's own `icon.svg` is generated at build time from [Lucide](https://lucide.dev) icon data (`unlock-keyhole`); Lucide is licensed under the [ISC License](https://lucide.dev/license) and is used only by the build, never bundled into the client half.

## License

The plugin's own code is MIT. The bundled Lucide artwork is ISC (see above).

/**
 * Composer permission chip.
 *
 * Occupies the same slot as the shipped chip and shows the Session's current
 * mode. Choosing another preset submits the Host command directly, so the two
 * risk dialogs the shipped chip opened for Full access and Auto review never
 * appear.
 *
 * The chip, its menu rows, and the popup surface reproduce the shipped control:
 * the same glyph set, the same 34px menu row, and the same menu material. The
 * popup is portaled to `document.body` because the docked composer clips fixed
 * overlays; it closes on a pick, an outside pointerdown, Escape, Tab, a composer
 * lock, or a catalog invalidation.
 *
 * @module @saoutax/dsh-full-access/client/select
 */

import {
    type KeyboardEvent as ReactKeyboardEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { menuGlyph, presetGlyph, type Glyph } from '../icons.js';
import type { PermissionSelectProps } from './contracts.js';
import { chipLabel, menuItems } from './presentation.js';

/** Gap between the trigger and the popup, and the popup's smallest width. */
const POPUP_GAP = 8;
const POPUP_MIN_WIDTH = 144;
const POPUP_MAX_HEIGHT = 360;

/** Fixed placement of the popup, measured from the trigger. */
interface PopupBox {
    readonly left: number;
    readonly bottom: number;
    readonly minWidth: number;
    readonly maxHeight: number;
}

/**
 * Draw one glyph on its 16×16 grid, sized for the composer toolbar.
 * @param props - the glyph to draw.
 * @returns the inline SVG.
 */
const Glyph = ({ glyph }: { readonly glyph: Glyph }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        strokeWidth={1}
        aria-hidden="true"
        focusable="false"
    >
        {glyph.paths.map((path, index) => (
            <path key={`p${String(index)}`} {...path} />
        ))}
    </svg>
);

/** Chevron of the trigger. */
const Chevron = () => <Glyph glyph={menuGlyph('chevron')} />;

/** Check mark of the current row. */
const Check = () => <Glyph glyph={menuGlyph('check')} />;

/**
 * Draw one preset's icon.
 * @param props - the preset machine value.
 * @returns the icon, or null for a preset without one.
 */
const PresetIcon = ({ preset }: { readonly preset: string }) => {
    const glyph = presetGlyph(preset);
    if (glyph === undefined) {
        return null;
    }
    return <Glyph glyph={glyph} />;
};

/**
 * Measure the popup above the trigger.
 * @param anchor - the trigger element.
 * @returns the fixed placement to render.
 */
const measurePopup = (anchor: HTMLElement): PopupBox => {
    const rect = anchor.getBoundingClientRect();
    return {
        left: Math.max(
            POPUP_GAP,
            Math.min(rect.left, window.innerWidth - POPUP_GAP - POPUP_MIN_WIDTH),
        ),
        bottom: Math.max(POPUP_GAP, window.innerHeight - rect.top + 4),
        minWidth: Math.max(rect.width, POPUP_MIN_WIDTH),
        maxHeight: Math.min(POPUP_MAX_HEIGHT, Math.max(120, rect.top - POPUP_GAP * 2)),
    };
};

/**
 * Render the composer permission chip.
 * @param props - slot props plus this plugin's injected hooks and actions.
 * @returns the chip, or null while the Session or catalog is unavailable.
 */
const PermissionSelect = ({
    locked,
    select,
    usePermissionCatalog,
    usePermissionInvalidations,
    useProjection,
    t,
}: PermissionSelectProps) => {
    const selection = useProjection('permissions');
    const catalog = usePermissionCatalog(state => state.value);
    const invalidations = usePermissionInvalidations(state => state.count);

    const [open, setOpen] = useState(false);
    const [pick, setPick] = useState<string | null>(null);
    const [highlight, setHighlight] = useState(0);
    const [box, setBox] = useState<PopupBox | null>(null);
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);

    const currentValue =
        pick !== null && (catalog?.options.some(option => option.value === pick) ?? false)
            ? pick
            : (selection?.currentValue ?? '');

    const close = useCallback((returnFocus: boolean): void => {
        setOpen(false);
        setBox(null);
        if (returnFocus) {
            anchorRef.current?.focus();
        }
    }, []);

    useEffect(() => {
        setOpen(false);
        setBox(null);
        setPick(null);
    }, [invalidations]);

    useEffect(() => {
        if (locked) {
            setOpen(false);
            setBox(null);
        }
    }, [locked]);

    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        if (!open || anchor === null) {
            return () => {
                // Nothing to clean up before the popup has a position.
            };
        }
        const update = (): void => {
            setBox(measurePopup(anchor));
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open]);

    useEffect(() => {
        if (open) {
            popupRef.current?.focus();
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return () => {
                // No listener is installed while the popup is closed.
            };
        }
        const onPointerDown = (event: PointerEvent): void => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }
            if (anchorRef.current?.contains(target) === true) {
                return;
            }
            if (popupRef.current?.contains(target) === true) {
                return;
            }
            setOpen(false);
            setBox(null);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [open]);

    const submit = async (preset: string): Promise<void> => {
        try {
            await select(preset);
        } catch (error) {
            console.error('full-access: switching the permission preset failed', error);
        } finally {
            setPick(null);
        }
    };

    if (selection === undefined || catalog === null) {
        return null;
    }

    const items = menuItems(catalog, currentValue, t);
    const label = chipLabel(catalog, currentValue, t);
    const busy = pick !== null;
    const choose = (preset: string): void => {
        close(false);
        if (preset === currentValue) {
            return;
        }
        setPick(preset);
        void submit(preset);
    };
    const openPopup = (): void => {
        const index = items.findIndex(item => item.id === currentValue);
        setHighlight(index < 0 ? 0 : index);
        setOpen(true);
    };
    const onPopupKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
            return;
        }
        if (event.key === 'Tab') {
            close(false);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight(current => {
                if (items.length === 0) {
                    return 0;
                }
                const step = event.key === 'ArrowDown' ? 1 : -1;
                return (current + step + items.length) % items.length;
            });
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            const target = items[highlight];
            if (target !== undefined) {
                event.preventDefault();
                choose(target.id);
            }
        }
    };

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className="dshFullAccess_trigger"
                aria-label={t('chip.aria', { name: label.label })}
                aria-haspopup="menu"
                aria-expanded={open}
                title={label.description ?? t('chip.hint')}
                disabled={locked || busy}
                onClick={() => {
                    if (open) {
                        close(false);
                        return;
                    }
                    openPopup();
                }}
            >
                <span className="dshFullAccess_triggerIcon">
                    <PresetIcon preset={currentValue} />
                </span>
                <span className="dshFullAccess_triggerLabel">{label.label}</span>
                <span
                    className={`dshFullAccess_chevron${open ? ' dshFullAccess_chevronOpen' : ''}`}
                >
                    <Chevron />
                </span>
            </button>
            {open &&
                box !== null &&
                createPortal(
                    <div
                        ref={popupRef}
                        role="menu"
                        aria-label={t('menu.label')}
                        tabIndex={-1}
                        className="dshFullAccess_popup"
                        style={{
                            left: box.left,
                            bottom: box.bottom,
                            minWidth: box.minWidth,
                            maxHeight: box.maxHeight,
                        }}
                        onKeyDown={onPopupKeyDown}
                    >
                        {items.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={item.active}
                                tabIndex={-1}
                                title={item.detail}
                                className={[
                                    'dshFullAccess_option',
                                    index === highlight ? 'dshFullAccess_optionHighlight' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onPointerMove={() => {
                                    setHighlight(index);
                                }}
                                onClick={() => {
                                    choose(item.id);
                                }}
                            >
                                <span className="dshFullAccess_optionIcon">
                                    <PresetIcon preset={item.id} />
                                </span>
                                <span className="dshFullAccess_optionLabel">
                                    <span className="dshFullAccess_optionLabelText">
                                        {item.label}
                                    </span>
                                    {item.badge === undefined ? null : (
                                        <span className="dshFullAccess_optionBadge">
                                            {item.badge}
                                        </span>
                                    )}
                                </span>
                                {item.active ? (
                                    <span className="dshFullAccess_optionCheck">
                                        <Check />
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
};

/** The composer permission chip. */
export { PermissionSelect };

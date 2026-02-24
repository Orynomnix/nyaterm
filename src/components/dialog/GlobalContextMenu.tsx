import { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";

export default function GlobalContextMenu() {
    const { contextMenu, hideContextMenu } = useApp();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                hideContextMenu();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                hideContextMenu();
            }
        };

        if (contextMenu) {
            window.addEventListener("click", handleClick, true);
            window.addEventListener("contextmenu", handleClick, true);
            window.addEventListener("keydown", handleKeyDown, true);
        }

        return () => {
            window.removeEventListener("click", handleClick, true);
            window.removeEventListener("contextmenu", handleClick, true);
            window.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [contextMenu, hideContextMenu]);

    if (!contextMenu) return null;

    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = contextMenu.items.length * 36;

    let { x, y } = contextMenu;
    if (x + menuWidth > maxW) x = maxW - menuWidth - 10;
    if (y + menuHeight > maxH) y = maxH - menuHeight - 10;

    return (
        <div
            ref={menuRef}
            className="bg-popover text-popover-foreground fixed z-[10000] min-w-[180px] overflow-hidden rounded-md border p-1 shadow-md animate-in fade-in-0 zoom-in-95"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {contextMenu.items.map((item, idx) => {
                if (item.divider) {
                    return <div key={`div-${idx}`} className="bg-border -mx-1 my-1 h-px" />;
                }

                return (
                    <div
                        key={`item-${idx}`}
                        className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        style={{ color: item.color || undefined }}
                        onClick={(e) => {
                            e.stopPropagation();
                            hideContextMenu();
                            item.onClick();
                        }}
                    >
                        {item.icon && <span className="material-icons text-[14px] text-muted-foreground">{item.icon}</span>}
                        {item.label}
                    </div>
                );
            })}
        </div>
    );
}

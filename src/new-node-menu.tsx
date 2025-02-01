import { NewNodeMenuPos } from "./NewNodeMenu";



export const NEW_NODE_MENU_WIDTH = 250;
export const NEW_NODE_MENU_HEIGHT = 320;

export const calcNewNodeMenuPos = (
    e: React.MouseEvent | MouseEvent,
    bounds: DOMRect,
): NewNodeMenuPos => {
    // Set just one property per dimension. The menu defaults to opening to the right bottom of
    // the mouse, but if that would it to overflow, we position it differently.
    return ({
        css: {
            ...(e.clientY < bounds.height - NEW_NODE_MENU_HEIGHT || e.clientY < NEW_NODE_MENU_HEIGHT)
                ? { top: e.clientY }
                : { bottom: bounds.bottom - e.clientY },
            ...e.clientX < bounds.width - NEW_NODE_MENU_WIDTH
                ? { left: e.clientX }
                : { right: bounds.right - e.clientX },
        },
        mouse: {
            x: e.clientX,
            y: e.clientY,
        },
    });
};

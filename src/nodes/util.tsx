import { match, nodeColor } from "../util";
import SplitterIcon from "../icons/splitter.svg?react";
import MergerIcon from "../icons/merger.svg?react";


export const handleCss = {
    width: 8,
    height: 8,
    background: "white",
    border: "2px solid #777",

    "&.connectingto": {
        background: "#c0392b",
        "&.valid": {
            background: "#2ecc71",
        },
    },

    // Increase clickable area
    "&::after": {
        content: "''",
        position: "absolute",
        inset: -7,
        borderRadius: "50%",
    },
} as const;

export const rateCss = {
    fontFamily: "Hubot Sans",
    fontWeight: "bold",
} as const;

export const totalRateCss = {
    ...rateCss,
    background: "rgba(255, 255, 255, 0.8)",
    color: "#30336b",
    padding: "1px 2px",
};

export const settingsPopoverCss = {
    background: "white",
    borderRadius: 4,
    border: "1px solid #aaa",
    boxShadow: "0 0 8px rgba(0, 0, 0, 0.4)",
    padding: 4,
};

type CombinerNodeProps = React.PropsWithChildren<{
    kind: "splitter" | "merger";
    selected: boolean;
}>;

export const CombinerNode = ({ children, selected, kind }: CombinerNodeProps) => {
    const { normal, hover } = nodeColor(kind);
    
    return (
    
        <div css={{
            width: 25,
            height: 25,
            "&:hover > div:first-of-kind": {
                background: hover,
            },
        }}>
            <div css={{
                position: "absolute",
                inset: -2,
                background: normal,
                borderRadius: 12,
                ...selected && {
                    background: hover,
                    outline: "2px solid #efc74f",
                },
            }}>
                {children}
            </div>
            <div css={{ 
                position: "relative",
                fontSize: 20,
                lineHeight: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                {match(kind, {
                    splitter: () => <SplitterIcon />,
                    merger: () => <MergerIcon />,
                })}
            </div>
        </div>
    );
};

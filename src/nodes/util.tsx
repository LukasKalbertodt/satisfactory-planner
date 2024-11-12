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
    fontSize: 10,
} as const;

export const totalRateCss = {
    ...rateCss,
    background: "rgba(255, 255, 255, 0.7)",
    padding: "1px 2px",
    whiteSpace: "nowrap",
} as const;

export const settingsPopoverCss = {
    background: "white",
    borderRadius: 4,
    border: "1px solid #aaa",
    boxShadow: "0 0 8px rgba(0, 0, 0, 0.4)",
    padding: 4,
};

type RateDiffProps = {
    expected: number | undefined;
    actual: number;
};

export const RateDiff = ({ expected, actual }: RateDiffProps) => {
    if (expected === undefined) {
        return null;
    }

    const diff = actual - expected;
    const [label, color] = (() => {
        if (diff === 0) {
            return ["±0", "#27ae60"];
        } else if (diff > 0) {
            return [`+${diff.toString().slice(0, 6)}`, "#2481bf"];
        } else {
            return [`-${(-diff).toString().slice(0, 6)}`, "#ec1818"];
        }
    })();

    return <span css={{ color }}>{` (${label})`}</span>;
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

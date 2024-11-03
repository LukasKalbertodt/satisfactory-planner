import { LuInfo, LuShare2 } from "react-icons/lu";


export const Header = () => {
    const overlayCss = {
        position: "absolute",
        zIndex: 100,
        height: 40,
        background: "#2980b9",
    } as const;

    return <>
        <h1 css={{
            ...overlayCss,
            left: 0,
            margin: 0,
            borderBottomRightRadius: 4,
            fontSize: 22,
            padding: "2px 16px",
        }}>Satisfactory Planner</h1>
        
        <nav css={{
            ...overlayCss,
            right: 0,
            borderBottomLeftRadius: 4,
        }}>
            <Menu />
        </nav>
    </>;
};

const Menu = () => {
    return (
        <ul css={{
            height: "100%",
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            gap: 8,
        }}>
            <ShareButton />
            <InfoButton />
        </ul>
    );
};

type MenuEntryProps = {
    label: string;
    icon: JSX.Element
} & JSX.IntrinsicElements["li"];

const MenuEntry = ({ label, icon, ...rest }: MenuEntryProps) => (
    <li {...rest} css={{
        height: "100%",
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 12px",
        cursor: "pointer",
        ":hover": {
            background: "#ffffff44"
        },
    }}>
        {icon}
        {label}
    </li>
);

const ShareButton = () => {
    return <MenuEntry label="Share" icon={<LuShare2 />} />;
};

const InfoButton = () => {
    return <MenuEntry 
        label="About" 
        icon={<LuInfo />} 
        onClick={() => alert("TODO")}
    />
};

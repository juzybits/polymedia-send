import { ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const Button: React.FC<{
    children: ReactNode,
    className?: string,
    disabled?: boolean,
    onClick?: React.MouseEventHandler,
}> = ({
    children,
    className = "btn",
    disabled = undefined,
    onClick = undefined,
}) =>
{
    const { inProgress } = useOutletContext<AppContext>();

    const isDisabled = typeof disabled === "boolean" ? disabled : inProgress;

    return <button
        className={className}
        disabled={isDisabled}
        onClick={event => { !isDisabled && onClick && onClick(event) }}
    >{children}</button>
}

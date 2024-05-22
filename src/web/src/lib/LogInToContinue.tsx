import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";
import { Button } from "./Button";

export const LogInToContinue: React.FC = () =>
{
    const { openConnectModal } = useOutletContext<AppContext>();
    return <div>
        <p>Log in with your Sui wallet to continue.</p>
        <Button onClick={openConnectModal}>LOG IN</Button>
    </div>;
};

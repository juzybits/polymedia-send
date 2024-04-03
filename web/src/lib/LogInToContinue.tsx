import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const LogInToContinue: React.FC = () =>
{
    const { openConnectModal } = useOutletContext<AppContext>();
    return <div>
        <p>Log in with your Sui wallet to continue.</p>
        <button onClick={openConnectModal} className='btn'>LOG IN</button>
    </div>;
}

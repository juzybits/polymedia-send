import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <div id='page-home' className='page'>
        <h1>Send and receive any Sui asset</h1>
        <div className='content'>
            <div>
                <p>
                Sui zkSend lets you share a link to send any Sui coin or object.
                </p>
            </div>
            <div>
                <Link to='/send' className='btn'>
                    SEND ASSETS
                </Link>
            </div>
        </div>
    </div>;
}

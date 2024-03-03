import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <div id='page-home' className='page'>
        <h1>Polymedia zkSend</h1>
        <div className='content'>
            <div>
                Share a link to send any Sui coin or object.
            </div>
            <div>
                <Link to='/send'>Send now</Link>
            </div>
        </div>
    </div>;
}

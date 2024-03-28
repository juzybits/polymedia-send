import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <div id='page-home' >
        <h1>Polymedia zkSend</h1>

        <h2>Send any Sui coin simply by sharing a link</h2>

        <h3>Get started:</h3>

        <div className='btn-group' style={{justifyContent: 'center'}}>
            <Link to='/send' className='btn'>Create link</Link>
            <Link to='/bulk' className='btn'>Bulk create</Link>
        </div>

        <h3>How does it work?</h3>
        <p>The sender adds coins to a zkSend link, and then shares the link with the recipient via email, direct message, or any other channel.</p>
        <p>The recipient visits the link and clicks a button to claim the assets, without signing a transaction, or even connecting their wallet, in a non-custodial manner.</p>
    </div>;
}

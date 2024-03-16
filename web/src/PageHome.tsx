export const PageHome: React.FC = () =>
{
    return <div id='page-home' className='page'>
        <h1>Home</h1>
        <h2>Send Sui assets simply by sharing a link</h2>

        <h3>How it works, at a high level:</h3>
        <p>⤴️ The sender adds any coins or assets to a zkSend link, then shares the link with the recipient via email / DM / etc.</p>

        <p>⤵️ The recipient visits the link and clicks a button to claim the assets, without signing a transaction, or even connecting their wallet, in a non-custodial manner.</p>

        <h3>What the app does under the hood:</h3>

        <p>⤴️ The sender:</p>
        <p>
            - Creates a one-off Sui keypair for the zkSend link.<br/>
            - Sends the assets to the keypair's public address, plus a tiny bit of SUI to pay for the claim txn fees.<br/>
            - Generates a link back to the webapp such that the URL includes the keypair's private key.
        </p>

        <p>⤵️ The recipient:</p>
        <p>
            - Reconstructs the one-off keypair from the private key found in the URL.<br/>
            - Looks for assets under that public address, and shows them to the user.<br/>
            - Sends the assets to an address provided by the user by executing a txn from the keypair.<br/>
            - Any remaining SUI on the keypair is returned to the creator of the link.
        </p>
    </div>;
}

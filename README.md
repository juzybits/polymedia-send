# Polymedia Send

Send any coin with Sui zkSend, and create zkSend links in bulk.

![Polymedia Send](./src/web/public/img/open-graph.webp)

## How it works, from the user perspective

📤 The sender adds coins to a zkSend link, then shares the link with the recipient via email / DM / etc.

📥 The recipient visits the link and clicks a button to claim the assets... without signing a transaction... or even connecting their wallet... and it's all non-custodial!

## How it works, under the hood

📤 Sender:<br/>
\- Creates a one-off Sui keypair for the zkSend link.<br/>
\- Sends the assets to the keypair's address, plus a tiny bit of SUI to pay for the claim tx fees.<br/>
\- Generates a link back to the webapp such that the URL includes the keypair's secret key.<br/>

📥 Recipient:<br/>
\- Reconstructs the one-off keypair from the secret key found in the URL.<br/>
\- Looks for assets under that public address, and shows them to the user.<br/>
\- Sends the assets to a user-chosen address by submitting a tx from the keypair.<br/>
\- Any remaining SUI in the keypair is returned to the creator of the link.<br/>

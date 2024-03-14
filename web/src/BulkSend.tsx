export const PageBulkSend: React.FC = () =>
{
    const createLinks = async () => {
    };

    return <>
    <div id='bulk-page' className='page'>
        <h1>Create claim links in bulk</h1>
            <button
                className='btn'
                onClick={createLinks}
                disabled={false}
            >CREATE LINKS</button>
        </div>
    </>;
};

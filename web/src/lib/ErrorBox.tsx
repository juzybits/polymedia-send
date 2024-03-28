export const ErrorBox: React.FC<{
    err: string|null,
}> = ({
    err,
}) =>
{
    if (!err) {
        return null;
    }
    return <div className='error-box'>
        <div>Something went wrong:</div>
        <div>{err}</div>
    </div>;
}

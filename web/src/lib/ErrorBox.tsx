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
        Something went wrong:<br/>{err}
    </div>;
}

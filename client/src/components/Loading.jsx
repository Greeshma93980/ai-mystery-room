export default function Loading({ label = 'Opening the case file' }) { return <div className="loading"><span className="loader"/><span>{label}<i className="ellipsis">...</i></span></div>; }

import { Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function Brand() { return <Link to="/" className="brand"><span className="brand-mark"><Fingerprint size={21}/></span><span>THE <b>CASEFILE</b></span></Link>; }

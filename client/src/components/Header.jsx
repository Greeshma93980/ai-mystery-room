import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
export default function Header() { return <header className="topbar wrap"><Brand/><nav><a href="/#how">How to play</a><Link className="nav-cta" to="/create">Open a case <span>↗</span></Link></nav></header>; }

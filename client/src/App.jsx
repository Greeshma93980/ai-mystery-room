import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import CasePage from './pages/Case.jsx';
import Result from './pages/Result.jsx';
export default function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/create" element={<Create/>}/><Route path="/case/:id" element={<CasePage/>}/><Route path="/case/:id/result" element={<Result/>}/><Route path="*" element={<Home/>}/></Routes>}

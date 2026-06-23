import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import './ComingSoon.css';

export default function ComingSoon() {
  const location = useLocation();

  return (
    <div className="coming-soon-wrap">
      <div className="coming-soon">
        <Construction size={36} />
        <h2>Chức năng đang được phát triển</h2>
        <p>{location.pathname}</p>
      </div>
    </div>
  );
}

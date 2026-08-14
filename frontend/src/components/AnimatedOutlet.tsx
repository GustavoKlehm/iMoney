import { useEffect, useRef, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import './PageTransition.css';

type Phase = 'idle' | 'out' | 'in';

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const outletRef = useRef(outlet);
  outletRef.current = outlet;

  const pendingLocation = useRef(location);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [displayOutlet, setDisplayOutlet] = useState(outlet);
  const [phase, setPhase] = useState<Phase>('idle');

  const isSameView = location.pathname === displayLocation.pathname;

  // Mantém o outlet sincronizado quando não há transição em andamento
  useEffect(() => {
    if (phase === 'idle' && isSameView) {
      setDisplayOutlet(outlet);
    }
  }, [outlet, isSameView, phase]);

  // Nova navegação: congela a tela visível e anima saída
  useEffect(() => {
    if (isSameView) return;

    pendingLocation.current = location;

    if (phase !== 'out') {
      setPhase('out');
    }
  }, [location, isSameView, phase]);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;

    if (phase === 'out') {
      const next = pendingLocation.current;
      setDisplayLocation(next);
      setDisplayOutlet(outletRef.current);
      setPhase('in');
      return;
    }

    if (phase === 'in') {
      setPhase('idle');
    }
  }

  const classNames = ['page-transition'];
  if (phase === 'out') classNames.push('page-transition--out');
  if (phase === 'in') classNames.push('page-transition--in');

  return (
    <div className={classNames.join(' ')} onAnimationEnd={handleAnimationEnd}>
      {displayOutlet}
    </div>
  );
}

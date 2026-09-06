import { NavLink } from 'react-router-dom';

const item = ({ isActive }: { isActive: boolean }) =>
  `flex-1 py-2 text-center text-xs font-semibold ${isActive ? 'text-brand-700' : 'text-stone-500'}`;

export default function MobileTabBar() {
  return (
    <nav className="lg:hidden sticky bottom-0 z-20 border-t bg-white/95 backdrop-blur flex safe-bottom">
      <NavLink to="/" end className={item}>
        Home
      </NavLink>
      <NavLink to="/get-templates" className={item}>
        Get
      </NavLink>
      <NavLink to="/build" className={item}>
        Build
      </NavLink>
      <NavLink to="/learn" className={item}>
        Learn
      </NavLink>
      <NavLink to="/cart" className={item}>
        Cart
      </NavLink>
    </nav>
  );
}

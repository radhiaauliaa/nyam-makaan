import { useAuth } from '../../../contexts/AuthContext';
import NavbarGuest from './NavbarGuest';
import NavbarUser from './NavbarUser';
import NavbarOwner from './NavbarOwner';
import NavbarAdmin from './NavbarAdmin';

export default function Navbar() {
  const { currentUser, userData } = useAuth();

  if (!currentUser) return <NavbarGuest />;
  if (userData?.role === 'admin') return <NavbarAdmin />;
  if (userData?.role === 'owner') return <NavbarOwner />;
  return <NavbarUser />;
}
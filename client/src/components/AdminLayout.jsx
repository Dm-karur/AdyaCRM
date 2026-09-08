import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, LogOut, ClipboardCheck, 
  Briefcase, Activity, Target, FileText, CheckSquare, Clock, UserCircle, Menu, X, Building2
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Leads', path: '/admin/crm', icon: <Users size={18} /> },
    { name: 'Pipeline', path: '/admin/pipeline', icon: <Activity size={18} /> },
    { name: 'Follow-ups', path: '/admin/follow-ups', icon: <Calendar size={18} /> },
    { name: 'Clients', path: '/admin/clients', icon: <Briefcase size={18} /> },
    { name: 'Reports', path: '/admin/reports', icon: <FileText size={18} /> },
    { name: 'Employees', path: '/admin/employees', icon: <UserCircle size={18} /> },
    { name: 'Branches', path: '/admin/branches', icon: <Building2 size={18} /> },
    { name: 'Attendance', path: '/admin/attendance', icon: <ClipboardCheck size={18} /> },
  ];

  let navItems = allNavItems;
  if (user?.role !== 'Admin') {
    if (user?.salaryType === 'Monthly') {
      navItems = allNavItems
        .filter(item => !['Reports', 'Employees', 'Branches'].includes(item.name))
        .map(item => item.name === 'Attendance' ? { ...item, path: '/history' } : item);
    } else if (user?.salaryType === 'Weekly') {
      navItems = allNavItems.filter(item => ['Dashboard', 'Attendance'].includes(item.name));
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white text-gray-800 p-4 flex justify-between items-center shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 hover:text-primary p-1">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base py-2 px-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-black shadow-lg shadow-primary/25 uppercase tracking-wide">{user?.role === 'Admin' ? 'AdminPanel' : 'CRM Dashboard'}</h1>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-primary transition-colors p-2">
          <LogOut size={20} />
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 pb-2 flex items-center gap-3">
          <h1 className="w-full text-center text-lg py-3 px-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-black shadow-lg shadow-primary/25 uppercase tracking-widest">{user?.role === 'Admin' ? 'AdminPanel' : 'CRM Dashboard'}</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `relative flex items-center gap-3 px-6 py-3 font-semibold transition-all ${
                    isActive 
                    ? 'text-primary bg-primary/5' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-primary" : "text-gray-400"}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                    {/* Active Right Dot indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary mr-4" />
                    )}
                    {/* Border for active item */}
                    {isActive && (
                      <div className="absolute inset-0 border border-primary rounded-r-3xl ml-4 -mr-0 pointer-events-none opacity-20" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Logout Area */}
        <div className="p-6">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-danger hover:bg-red-100 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider"
          >
            <LogOut size={16} /> Logout System
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        
        {/* Top User Profile (Desktop) */}
        <header className="hidden md:flex h-20 items-center justify-end px-8 border-b border-gray-100">
          <div className="flex items-center gap-3 pl-6">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-800">{user?.name}</div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">{user?.role}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
              <Users size={20} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-0 bg-white">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
export default AdminLayout;

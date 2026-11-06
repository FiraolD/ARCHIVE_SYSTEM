import React from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Logo } from '../Logo';
import { canSee } from './nav';
import type { AppTab, NavItem } from './nav';

interface SidebarProps {
  /** already filtered by the user's role */
  items: NavItem[];
  activeTab: AppTab;
  registrationTab: string;
  onNavigate: (tab: AppTab, sub?: string) => void;
  /** called on hover/focus so the page's code is downloaded before the click */
  onPrefetch?: (tab: AppTab) => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: { name: string; role: string };
  onLogout: () => void;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export const Sidebar: React.FC<SidebarProps> = ({
  items, activeTab, registrationTab, onNavigate, onPrefetch, collapsed, mobileOpen, onCloseMobile, user, onLogout,
}) => {
  // On phones the drawer is always full width; "collapsed" only applies from lg up.
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  const groups: { title: string; items: NavItem[] }[] = [];
  items.forEach((item) => {
    const g = groups.find((x) => x.title === item.group);
    if (g) g.items.push(item); else groups.push({ title: item.group, items: [item] });
  });

  return (
    <>
      {/* dark backdrop behind the mobile drawer */}
      <div
        aria-hidden
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-[#08112E]/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-white/5 bg-[#08112E] text-slate-300 transition-[transform,width] duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'}`}
      >
        {/* brand */}
        <div className={`flex h-16 shrink-0 items-center border-b border-white/5 px-4 ${collapsed ? 'lg:justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${hideWhenCollapsed}`}>
            <div className="rounded-lg bg-white px-2.5 py-1.5">
              <Logo className="h-8 w-auto max-w-[116px]" variant="light" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Arch<span className="font-light text-[#16B0DF]">ive</span>
            </span>
          </div>
          <div className={`hidden h-10 w-10 place-items-center rounded-lg bg-[#1E3C90] text-lg font-bold text-white ${collapsed ? 'lg:grid' : ''}`}>
            A
          </div>
        </div>

        {/* navigation */}
        <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title || 'top'}>
              {group.title && (
                <p className={`mb-1.5 px-3 text-xs font-medium text-slate-500 ${hideWhenCollapsed}`}>{group.title}</p>
              )}
              {group.title && collapsed && <div className="mx-3 mb-2 hidden border-t border-white/10 lg:block" />}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        onMouseEnter={() => onPrefetch?.(item.id)}
                        onFocus={() => onPrefetch?.(item.id)}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#16B0DF]" />}
                        <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-[#16B0DF]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className={`truncate ${hideWhenCollapsed}`}>{item.label}</span>
                        {item.subItems && (
                          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${active ? 'rotate-180' : ''} ${hideWhenCollapsed}`} />
                        )}
                      </button>

                      {/* sub pages (Registration) */}
                      {item.subItems && active && (
                        <ul className={`ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3 ${hideWhenCollapsed}`}>
                          {item.subItems
                            .filter((s) => canSee(s.roles, user.role))
                            .map((s) => {
                              const subActive = registrationTab === s.id;
                              return (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => onNavigate('registration', s.id)}
                                    aria-current={subActive ? 'page' : undefined}
                                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] ${
                                      subActive ? 'bg-[#16B0DF]/10 font-medium text-[#16B0DF]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <s.icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{s.label}</span>
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* signed-in user */}
        <div className="shrink-0 border-t border-white/5 p-3">
          <div className={`flex items-center gap-3 rounded-lg bg-white/5 p-2.5 ${collapsed ? 'lg:flex-col lg:bg-transparent lg:p-0' : ''}`}>
            <span
              title={collapsed ? `${user.name} (${user.role})` : undefined}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1E3C90] text-sm font-semibold text-white"
            >
              {initials(user.name)}
            </span>
            <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF]"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

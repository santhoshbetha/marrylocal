import { useState } from 'react';
import { Heart, Search as SearchIcon, UserSearch } from 'lucide-react';
import { SearchSection } from './SearchSection';
import { ShortlistSection } from './ShortlistSection';
import { SearchUser } from './SearchUser';
import { useAuthStore } from '@/store/authStore';

const TABS = [
  { id: 'search', label: 'Search', icon: SearchIcon },
  { id: 'shortlist', label: 'Shortlist', icon: Heart },
  { id: 'searchuser', label: 'Search User', icon: UserSearch },
];

function Search() {
  const [activeTab, setActiveTab] = useState('search');
  const currentUser = useAuthStore(state => state.currentUser);

  return (
    <div className="min-h-screen bg-background" data-testid="search-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-xs">
          <div className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition-all duration-200 sm:text-base ${
                    active
                      ? 'bg-amber-400 text-slate-900 dark:text-slate-900 shadow-xs'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'search' && <SearchSection />}
        {activeTab === 'shortlist' && <ShortlistSection />}
        {activeTab === 'searchuser' && <SearchUser />}

        {!currentUser && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sign in to load your personalized discovery feed.
          </p>
        )}
      </div>
    </div>
  );
}

export default Search;

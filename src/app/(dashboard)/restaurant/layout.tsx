import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantNav } from './RestaurantNav';

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Strict RLS equivalent check on the frontend layout level
  if (profile?.role !== 'admin' && profile?.role !== 'restaurant_staff') {
    redirect('/'); // Kick unauthorized users back to main dash
  }

  const showSubNav = profile?.role !== 'restaurant_staff';

  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
  const role = profile?.role || 'staff';

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Restaurant Specific Sub-Navigation - Hidden for restaurant_staff as parent layout handles it */}
      {showSubNav && (
        <div className="w-full md:w-64 shrink-0">
          <RestaurantNav
            initials={initials}
            displayName={displayName}
            role={role}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}


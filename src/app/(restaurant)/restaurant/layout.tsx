import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

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

  // Authorize users: Admin, Master, Restaurant Staff, Front Desk, Owner, Manager
  const allowedRoles = ['admin', 'restaurant_staff', 'master', 'front_desk', 'owner', 'manager'];
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    redirect('/'); // Kick unauthorized users back to main dash
  }

  // The Parent Layout (src/app/(restaurant)/layout.tsx) now handles the Navigation.
  // This inner layout now just acts as a security wrapper and content container.
  return (
    <div className="h-full">
      {children}
    </div>
  );
}

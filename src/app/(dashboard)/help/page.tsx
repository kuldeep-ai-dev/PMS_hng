import HelpGuide from '@/components/help/HelpGuide';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'User Guide | MediaGeny PMS',
    description: 'Comprehensive manual and troubleshooting guide for MediaGeny PMS staff.',
};

export default async function HelpPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    let role = 'staff';
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profile?.role) role = profile.role;
    } catch (err) {
        console.error('Error fetching role for help page:', err);
    }

    return (
        <div className="p-4 md:p-8">
            <HelpGuide userRole={role} />
        </div>
    );
}

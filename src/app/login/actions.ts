'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

async function verifyRecaptcha(token: string) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error("RECAPTCHA_SECRET_KEY is not defined in environment variables");
        return false;
    }

    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
        method: 'POST',
    });

    const data = await response.json();
    return data.success;
}

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const recaptchaToken = formData.get('g-recaptcha-response') as string

    if (!recaptchaToken) {
        return redirect('/login?message=Please complete the reCAPTCHA verification')
    }

    const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidRecaptcha) {
        return redirect('/login?message=reCAPTCHA verification failed. Please try again.')
    }

    const supabase = await createClient();

    const data = {
        email: email,
        password: password,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect('/login?message=Invalid login credentials. Please try again.');
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function logout() {
    const supabase = await createClient();

    // Get user id before signing out so we can log it
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
        // Manually record logout because Supabase doesn't trigger DB events for sign out
        // Use service role client to bypass RLS on staff_activity_logs (or the RPC we set up)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

        await supabaseAdmin.from('staff_activity_logs').insert({
            staff_id: user.id,
            action: 'logout',
            details: 'User logged out manually'
        });
    }

    await supabase.auth.signOut();
    redirect('/login');
}

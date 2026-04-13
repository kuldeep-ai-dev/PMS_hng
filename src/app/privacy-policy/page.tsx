import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Hotel New Ganga',
    description: 'Privacy Policy for Hotel New Ganga and HNGBusinessAPI WhatsApp services.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-10">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-sm text-slate-500">Hotel New Ganga &bull; Last updated: April 2026</p>
                </div>

                <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
                        <p>
                            Hotel New Ganga (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting the privacy of our guests and customers. This Privacy Policy explains how we collect, use, and protect personal information when you interact with our services, including our WhatsApp Business messaging service operated through our property management system (Geny PMS).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Contact Information:</strong> Name, mobile phone number, and email address provided during booking or restaurant service.</li>
                            <li><strong>Booking Details:</strong> Check-in/check-out dates, room preferences, and number of guests.</li>
                            <li><strong>Payment Information:</strong> Transaction amounts (we do not store card numbers).</li>
                            <li><strong>Communication Data:</strong> WhatsApp message delivery and read receipts through the Meta Cloud API.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To send booking confirmation, check-in, and checkout notifications via WhatsApp.</li>
                            <li>To send digital copies of restaurant bills and invoices.</li>
                            <li>To send promotional offers and hotel updates (marketing messages) via WhatsApp.</li>
                            <li>To improve our hotel services and customer experience.</li>
                            <li>To comply with legal obligations.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">4. WhatsApp Messaging</h2>
                        <p>
                            We use the Meta WhatsApp Business Cloud API to send transactional and promotional messages. By providing your phone number, you consent to receiving WhatsApp messages from Hotel New Ganga. You may opt out at any time by replying &ldquo;STOP&rdquo; to any message or contacting us directly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">5. Data Sharing</h2>
                        <p>
                            We do not sell or rent your personal information to third parties. We may share data with:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>Meta Platforms:</strong> For WhatsApp message delivery via the Business Cloud API.</li>
                            <li><strong>Service Providers:</strong> Cloud storage and infrastructure providers under strict data processing agreements.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Retention</h2>
                        <p>
                            We retain guest data for a maximum of 3 years from the last interaction for accounting and legal purposes. WhatsApp message logs are retained for 1 year.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">7. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your data.</li>
                            <li>Opt out of marketing communications at any time.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">8. Security</h2>
                        <p>
                            We implement industry-standard security measures including encrypted data transmission, secure cloud storage, and role-based access controls to protect your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">9. Contact Us</h2>
                        <p>
                            For any privacy-related questions or requests, please contact us:
                        </p>
                        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                            <p className="font-bold text-slate-900">Hotel New Ganga</p>
                            <p>Phone: +91 60027 26091</p>
                            <p>Website: <a href="https://genypms.hotelnewganga.in" className="text-blue-600 hover:underline">genypms.hotelnewganga.in</a></p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-3">10. Updates to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of significant changes via WhatsApp or by posting the updated policy on our website.
                        </p>
                    </section>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} Hotel New Ganga. All rights reserved.
                </div>
            </div>
        </div>
    );
}

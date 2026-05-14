import { BookingTapeChart } from '../admin/BookingTapeChart';

export default function BookingTimelinePage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Booking Timeline</h1>
                <p className="text-sm text-slate-500">View and manage room occupancy across the next 14 days.</p>
            </div>

            <BookingTapeChart />
        </div>
    );
}

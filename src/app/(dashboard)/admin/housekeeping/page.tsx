import { getHousekeepingLogs } from '@/app/actions/housekeeping';
import HousekeepingMonitorClient from './HousekeepingMonitorClient';

export const dynamic = 'force-dynamic';

export default async function HousekeepingLogPage() {
    const logs = await getHousekeepingLogs();

    return <HousekeepingMonitorClient initialLogs={logs as any} />;
}

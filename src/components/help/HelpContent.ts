export type HelpCategory = 'front-office' | 'restaurant' | 'inventory' | 'admin' | 'master' | 'general';

export interface HelpItem {
    id: string;
    title: string;
    description: string;
    category: HelpCategory;
    steps: string[];
    tips?: string[];
    roles: string[];
}

export const HELP_CONTENT: HelpItem[] = [
    // FRONT OFFICE
    {
        id: 'room-grid-basics',
        title: 'Mastering the Room Grid',
        category: 'front-office',
        roles: ['staff', 'admin', 'manager', 'owner', 'master'],
        description: 'The Room Grid is your central command center for all property operations. Each box represents a physical room and its real-time status.',
        steps: [
            'Green (Available): Room is ready for check-in.',
            'Blue (Occupied): Guest is currently in-house.',
            'Yellow (Dirty): Guest has checked out; housekeeping is required.',
            'Red (Maintenance/Blocked): Room is out-of-order or reserved for maintenance.',
            'Click any room to see specific guest details or quick actions like Check-in/Check-out.'
        ],
        tips: [
            'Use the "Auto-Refresh" toggle to keep the grid current without manual reloading.',
            'Hover over an occupied room to see the guest name and departure date instantly.'
        ]
    },
    {
        id: 'new-booking',
        title: 'Creating a New Reservation',
        category: 'front-office',
        roles: ['staff', 'admin', 'manager', 'owner'],
        description: 'Process walk-in or phone reservations efficiently.',
        steps: [
            'Click the "New Booking" button or a specific room in the grid.',
            'Enter Guest Name and Mobile Number (Lookup will run for repeat guests).',
            'Select Arrival and Departure dates.',
            'Assign a Room Category and specific Room Number.',
            'Record any Advance Payment and select the Payment Mode.',
            'Click "Confirm Booking" to finalize.'
        ],
        tips: [
            'Always verify mobile numbers for repeat guests to carry over their preferences automatically.',
            'Check the "Waitlist" if your preferred room category is full.'
        ]
    },
    {
        id: 'check-in-process',
        title: 'Guest Check-In Workflow',
        category: 'front-office',
        roles: ['staff', 'admin', 'manager', 'owner'],
        description: 'Transition a booking from "Reserved" to "In-House".',
        steps: [
            'Locate the booking in the Room Grid or Bookings list.',
            'Click "Check-In" to open the registration form.',
            'Verify Guest ID (UID/Passport) and record the details.',
            'Collect the balance advance as per policy.',
            'Hand over the key and click "Complete Check-In".'
        ]
    },
    {
        id: 'lost-and-found',
        title: 'Managing Lost & Found Items',
        category: 'front-office',
        roles: ['staff', 'admin', 'manager', 'owner'],
        description: 'Track items left behind by guests to ensure the highest service standards.',
        steps: [
            'Go to Operations > Lost & Found.',
            'Click "Add Item" and describe the object (e.g., "Silver Watch").',
            'Record the Room Number and Date found.',
            'When a guest claims it, click "Mark Claimed" and enter the claimant details.'
        ]
    },

    // RESTAURANT
    {
        id: 'pos-ordering',
        title: 'Taking Restaurant Orders (POS)',
        category: 'restaurant',
        roles: ['restaurant_staff', 'admin', 'manager', 'owner'],
        description: 'Fast and efficient order taking for dine-in or room service.',
        steps: [
            'Open the POS Terminal from the sidebar.',
            'Select the Section (Dining Area or Room Service).',
            'Pick a Table or enter the Guest Room Number.',
            'Tap menu items to add to cart; adjust quantities as needed.',
            'Add special instructions (e.g., "Less spicy") via the Item Notes.',
            'Click "Punch KOT" to send the order to the kitchen.'
        ],
        tips: [
            'Use the "Quick Search" if you have a large menu.',
            'For regular dine-in, you can merge multiple tables if a large group arrives.'
        ]
    },
    {
        id: 'kot-status',
        title: 'Tracking Order Progress',
        category: 'restaurant',
        roles: ['restaurant_staff', 'chef'],
        description: 'Monitor orders from the kitchen to the table.',
        steps: [
            'View the "Orders Board" for real-time status.',
            'Pending (Red): Newly received; needs acceptance.',
            'Preparing (Orange): Kitchen is working on it.',
            'Ready (Blue): Order is ready for pickup.',
            'Served (Green): Order has reached the guest.'
        ]
    },
    {
        id: 'restaurant-billing',
        title: 'Billing and Settlement',
        category: 'restaurant',
        roles: ['restaurant_staff', 'admin', 'manager', 'owner'],
        description: 'Closing the loop on a guest meal.',
        steps: [
            'Locate the table in the POS or Orders Board.',
            'Click "Billing" to generate the final amount inclusive of taxes.',
            'Select "Room Charge" if the guest wants to pay at checkout (Front Office).',
            'Select "Cash/UPI/Card" for direct settlement.',
            'Print the Final Bill for the guest.'
        ],
        tips: [
            'Use the "Split Bill" feature if guests at the same table want separate invoices.'
        ]
    },

    // INVENTORY
    {
        id: 'inventory-tracking',
        title: 'Stock Management basics',
        category: 'inventory',
        roles: ['admin', 'manager', 'owner'],
        description: 'Ensure you never run out of essential supplies.',
        steps: [
            'View "Inventory Overview" for real-time stock levels.',
            'Items highlighted in ORANGE are below their set Minimum Level.',
            'Use "Adjust Stock" for manual corrections (breakage/spillage).',
            'Update Purchase Orders when new stock arrives from vendors.'
        ]
    },

    // ADMIN
    {
        id: 'license-renewal',
        title: 'Renewing Your PMS License',
        category: 'admin',
        roles: ['admin', 'owner'],
        description: 'Keep your software active and updated.',
        steps: [
            'Go to Admin Hub > License Manager.',
            'Check the "Validity Left" on the dashboard.',
            'Click "Request Renewal" when expiry is near.',
            'Insert the Transaction ID and Mode of Payment after transferring funds to the provider.',
            'Wait for the Master administrator to approve your request.'
        ]
    },
    {
        id: 'user-management',
        title: 'Staff Roles and Access',
        category: 'admin',
        roles: ['admin', 'owner'],
        description: 'Control who can access what in your property.',
        steps: [
            'Staff: Access to Front Office and Restaurant only.',
            'Admin: Full control over settings, inventory, and staff management.',
            'Manager: Enhanced operational access with reporting capabilities.'
        ]
    },

    // MASTER
    {
        id: 'monitoring-logs',
        title: 'System Activity Monitoring',
        category: 'master',
        roles: ['master'],
        description: 'A 100% transparent audit trail of all software activity.',
        steps: [
            'Go to Master Control > System Logs.',
            'Use Search to find specific table mutations (e.g., "table:bookings").',
            'Compare "Before" and "After" JSON snapshots to troubleshoot data issues.',
            'Filter by Module or Event Type (INSERT, UPDATE, DELETE).'
        ]
    },
    {
        id: 'housekeeping-mgmt',
        title: 'Housekeeping & Room Status',
        category: 'front-office',
        roles: ['staff', 'cleaning_staff', 'admin'],
        description: 'Maintain the property by tracking room cleanliness in real-time.',
        steps: [
            'Locate a "Yellow" (Dirty) room on the grid.',
            'Click the room and select "Mark Clean" once the task is done.',
            'For maintenance issues, mark as "Out of Order" to prevent accidental booking.',
            'Housekeeping staff can use the "Cleaning List" view for a simplified task list.'
        ]
    },
    {
        id: 'qr-menu-setup',
        title: 'QR Menu & Table Setup',
        category: 'restaurant',
        roles: ['admin', 'manager'],
        description: 'Enable contactless ordering for your restaurant guests.',
        steps: [
            'Go to Restaurant > Tables & QR.',
            'Generate QR codes for each table number.',
            'Guests can scan the code to view the live menu on their smartphones.',
            'Orders placed via QR will appear instantly in the POS "Pending" tab.'
        ]
    },
    {
        id: 'revenue-reports',
        title: 'Daily Revenue & Audit',
        category: 'admin',
        roles: ['admin', 'manager', 'owner'],
        description: 'Understand your property performance with detailed financial snapshots.',
        steps: [
            'Go to Admin Hub > Financial Reports.',
            'Select "Daily Sales Report" to see total revenue across Front Desk and Restaurant.',
            'Use the "Settlement Summary" to tally cash, UPI, and Card payments.',
            'Run the "Night Audit" at the end of each business day to close accounts.'
        ]
    }
];

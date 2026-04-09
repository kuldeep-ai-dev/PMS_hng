import { getOrdersData } from './actions';
import OrdersClient from './OrdersClient';
import { redirect } from 'next/navigation';

export const revalidate = 20;

export default async function RestaurantOrdersPage() {
  const res = await getOrdersData();

  if (!res.success) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Error loading orders</h2>
        <p className="text-slate-500">{res.error}</p>
      </div>
    );
  }

  return <OrdersClient initialData={res.data} />;
}

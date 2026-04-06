import QRMenuWrapper from '@/components/qr-order/QRMenuWrapper';

export default async function QROrderTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params;
  return <QRMenuWrapper type="table" id={tableId} />;
}

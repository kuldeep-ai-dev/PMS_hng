import QRMenuWrapper from '@/components/qr-order/QRMenuWrapper';

export default async function QROrderRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <QRMenuWrapper type="room" id={roomId} />;
}

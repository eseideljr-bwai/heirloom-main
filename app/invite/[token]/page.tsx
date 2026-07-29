import InviteAcceptClient from './InviteAcceptClient';

export const dynamic = 'force-dynamic';

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  return <InviteAcceptClient token={params.token} />;
}

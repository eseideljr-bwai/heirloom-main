import { MarkOnboardingTask } from '../../../../lib/onboarding-context';
import ConversationView from './ConversationView';

export default function TalkPage() {
  return (
    <>
      <MarkOnboardingTask task="agent" />
      <ConversationView />
    </>
  );
}

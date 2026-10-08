import { PageHeading } from "@/components/studio-elements";
import { SavedRequests } from "@/components/saved-requests";
export default function RequestsPage() {
  return <div className="studio-container studio-container-narrow">
    <PageHeading eyebrow="YOUR REQUESTS" title="Every chapter, remembered." description="Your saved narration history, from the upload queue to the finished audiobook. Retries stay in the history too." />
    <SavedRequests />
  </div>;
}

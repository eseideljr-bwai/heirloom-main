import { redirect } from 'next/navigation';

/**
 * A Family Space lands on its Tapestry. The Tapestry is the Space's
 * content view and subsumes what the backend scope calls the Family
 * Library — there is no separate Library screen at Space level.
 */
export default function SpacesPage() {
  redirect('/spaces/tapestry');
}

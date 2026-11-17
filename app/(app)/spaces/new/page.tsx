import CreateSpaceWizard from './CreateSpaceWizard';

export const metadata = { title: 'Create a Family Space' };

/**
 * "Create a Family Space": Name, Homes, Review. The Shape step in the design
 * (tree or no tree, where your Home sits) is not here: `POST /family-spaces`
 * ignores `has_lineage`, and every Space made through the API has a tree.
 * Whether the person may create one is `GET /me` → `can_create_space`, read
 * by the wizard itself.
 */
export default function NewFamilySpacePage() {
  return <CreateSpaceWizard />;
}

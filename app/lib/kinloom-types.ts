export type KinloomType = {
  slug: string;
  label: string;
  definition: string;
  prompt: string;
};

export const KINLOOM_TYPES: KinloomType[] = [
  { slug: 'story',            label: 'Story',           definition: 'A meaningful experience or defining moment.',           prompt: 'What story from your childhood still shapes who you are?' },
  { slug: 'lesson',           label: 'Lesson',          definition: 'A truth learned through experience.',                   prompt: 'What took you years to understand?' },
  { slug: 'belief',           label: 'Belief',          definition: 'A principle or conviction that guides your life.',      prompt: 'What do you believe is worth holding onto no matter what?' },
  { slug: 'message',          label: 'Message',         definition: 'Words meant for a specific person or generation.',      prompt: 'What do you want your children to remember about you?' },
  { slug: 'tradition',        label: 'Tradition',       definition: 'A family practice worth preserving.',                   prompt: 'What tradition do you hope your family keeps?' },
  { slug: 'reflection',       label: 'Reflection',      definition: 'A present thought, season, or internal process.',      prompt: 'What has this season of life been teaching you?' },
  { slug: 'milestone',        label: 'Milestone',       definition: 'A reflection on a major event or transition.',          prompt: 'What changed in you when this season began?' },
  { slug: 'photo-collection', label: 'Photo Collection', definition: 'Images paired with the story behind them.',            prompt: 'What was happening in these photos that others might not know?' },
];

export const KINLOOM_TYPE_MAP = Object.fromEntries(KINLOOM_TYPES.map(t => [t.slug, t]));

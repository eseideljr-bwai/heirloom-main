// Aldwin family mock data — mirrors the Kinloom prototype

export interface Member {
  id: string;
  name: string;
  role: string;
  gen: number;
  born: number;
  gender: 'f' | 'm' | 'n';
  tone: string;
  initials: string;
  deceased?: boolean;
  isMe?: boolean;
}

export interface Kinloom {
  id: string;
  type: string;
  author: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  taggedKin: string[];
  hasAudio: boolean;
  hasPhoto: boolean;
}

export interface Whisper {
  id: string;
  kind: string;
  actor: string;
  target: string | null;
  when: string;
  line: string;
  sub: string;
}

export const MEMBERS: Member[] = [
  { id: 'eleanor', name: 'Eleanor Aldwin', role: 'Grandmother',  gen: 1, born: 1938, gender: 'f', tone: '#c9b393', initials: 'EA' },
  { id: 'thomas',  name: 'Thomas Aldwin',  role: 'Grandfather',  gen: 1, born: 1936, gender: 'm', tone: '#a39376', initials: 'TA', deceased: true },
  { id: 'james',   name: 'James Aldwin',   role: 'Father',       gen: 2, born: 1965, gender: 'm', tone: '#7a8a72', initials: 'JA' },
  { id: 'mira',    name: 'Mira Aldwin',    role: 'Mother',       gen: 2, born: 1968, gender: 'f', tone: '#b08d7e', initials: 'MA' },
  { id: 'ruth',    name: 'Aunt Ruth',      role: 'Aunt',         gen: 2, born: 1971, gender: 'f', tone: '#9a7e6a', initials: 'AR' },
  { id: 'you',     name: 'You',            role: 'Self',         gen: 3, born: 1992, gender: 'n', tone: '#556b5b', initials: 'YO', isMe: true },
  { id: 'sam',     name: 'Sam Aldwin',     role: 'Sibling',      gen: 3, born: 1994, gender: 'm', tone: '#6d7d6f', initials: 'SA' },
  { id: 'noor',    name: 'Noor Aldwin',    role: 'Sibling',      gen: 3, born: 1996, gender: 'f', tone: '#9b8a6e', initials: 'NA' },
  { id: 'ivy',     name: 'Ivy',            role: 'Daughter',     gen: 4, born: 2020, gender: 'f', tone: '#c9b09a', initials: 'IV' },
  { id: 'theo',    name: 'Theo',           role: 'Son',          gen: 4, born: 2022, gender: 'm', tone: '#8a9d8c', initials: 'TH' },
];

export const MEMBER_MAP: Record<string, Member> = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

export const KINLOOMS: Kinloom[] = [
  {
    id: 'k1', type: 'story', author: 'eleanor',
    title: 'The summer the river froze',
    excerpt: "We waited until your grandfather got home to tell him. He didn't believe us until he saw it himself — three feet of ice in July…",
    body: "We waited until your grandfather got home to tell him. He didn't believe us until he saw it himself. The river had frozen — three feet of ice in the middle of July. The whole town came down to look. Your great-aunt Ruth slipped on it twice and laughed both times.\n\nIt only happened once in my life. I think about it whenever I want to remind myself that the world is stranger than we let it be.",
    date: 'Mar 14, 2025', taggedKin: ['thomas', 'ruth', 'you'], hasAudio: true, hasPhoto: true,
  },
  {
    id: 'k2', type: 'lesson', author: 'james',
    title: 'What I learned about staying',
    excerpt: "It took me thirty-four years to understand that leaving is easy. Anyone can leave. Staying is the harder thing, the rarer thing…",
    body: "It took me thirty-four years to understand that leaving is easy. Anyone can leave. Staying is the harder thing, the rarer thing.\n\nI thought my father was unimaginative because he stayed. He worked the same job, came home to the same woman, sat on the same porch. I have come to see he was practicing a discipline I am only now beginning to learn.",
    date: 'Mar 10, 2025', taggedKin: ['thomas', 'you', 'mira'], hasAudio: false, hasPhoto: false,
  },
  {
    id: 'k3', type: 'tradition', author: 'mira',
    title: 'Sunday bread',
    excerpt: "My mother taught me to braid the dough on Saturday night so it could rise overnight. I want you to know how, even if you never bake it…",
    body: "My mother taught me to braid the dough on Saturday night so it could rise overnight. I want you to know how, even if you never bake it. The order matters. Three strands, always over the middle, never under.\n\nWhen Ivy is older, ask her to do it with you. The flour gets everywhere. That is part of it.",
    date: 'Mar 8, 2025', taggedKin: ['eleanor', 'ivy', 'you'], hasAudio: true, hasPhoto: true,
  },
  {
    id: 'k4', type: 'belief', author: 'you',
    title: 'On rooms with windows',
    excerpt: "I don't trust a house that doesn't have at least one window facing east. I'm half joking. I'm half not.",
    body: "I don't trust a house that doesn't have at least one window facing east. I'm half joking. I'm half not.\n\nMorning light is the only thing I have ever found that makes me believe, fully, that the day will be alright. Whatever room I work in for the rest of my life — I want east light in it.",
    date: 'Mar 2, 2025', taggedKin: [], hasAudio: false, hasPhoto: false,
  },
  {
    id: 'k5', type: 'message', author: 'eleanor',
    title: "For Ivy, on her tenth birthday",
    excerpt: "I won't be there. That's alright. Here is what I would have said over the cake…",
    body: "I won't be there. That's alright. Here is what I would have said over the cake.\n\nThe world will tell you to be useful. Be useful where you can. But also: be the kind of person who notices the smell of rain coming, who learns the names of three trees, who keeps a fountain pen and uses it.\n\nThat is enough. That has always been enough.",
    date: 'Feb 24, 2025', taggedKin: ['ivy'], hasAudio: true, hasPhoto: false,
  },
  {
    id: 'k6', type: 'milestone', author: 'james',
    title: 'The day Theo was born',
    excerpt: "Twelve hours of waiting in a beige hallway. Then the world had a new person in it.",
    body: "Twelve hours of waiting in a beige hallway. Then the world had a new person in it.\n\nI walked outside at 4 a.m. and the parking lot felt like a different parking lot. That is the only way I can describe it.",
    date: 'Feb 18, 2025', taggedKin: ['theo', 'mira'], hasAudio: false, hasPhoto: true,
  },
  {
    id: 'k7', type: 'reflection', author: 'noor',
    title: 'On being the youngest',
    excerpt: "Being the youngest means you were always the last to know everything, and the first to forget it.",
    body: "Being the youngest means you were always the last to know everything, and the first to forget it.\n\nLately I've been writing down what Sam and you tell me about the years before I remember. I want to be a witness to a life I wasn't around for.",
    date: 'Feb 12, 2025', taggedKin: ['sam', 'you'], hasAudio: false, hasPhoto: false,
  },
  {
    id: 'k8', type: 'photo-collection', author: 'ruth',
    title: '1972, the back porch',
    excerpt: "Six photographs. The summer everyone came home at once.",
    body: "Six photographs. The summer everyone came home at once. I am not in any of them — I was holding the camera. That is, in a way, the story of my life in this family.",
    date: 'Feb 4, 2025', taggedKin: ['eleanor', 'thomas', 'james'], hasAudio: false, hasPhoto: true,
  },
];

export const KINLOOM_MAP: Record<string, Kinloom> = Object.fromEntries(KINLOOMS.map(k => [k.id, k]));

export const WHISPERS: Whisper[] = [
  { id: 'w1', kind: 'created',   actor: 'eleanor', target: 'k1', when: '2 hours ago',  line: 'Eleanor added a story.',             sub: 'The summer the river froze' },
  { id: 'w2', kind: 'tagged',    actor: 'james',   target: 'k2', when: 'Yesterday',    line: 'James tagged you in a lesson.',       sub: 'What I learned about staying' },
  { id: 'w3', kind: 'comment',   actor: 'mira',    target: 'k4', when: '2 days ago',   line: 'Mira left a note on your belief.',    sub: 'On rooms with windows' },
  { id: 'w4', kind: 'milestone', actor: 'system',  target: null, when: 'This week',    line: "Eleanor's 87th birthday is on Sunday.", sub: 'A good time for a message.' },
  { id: 'w5', kind: 'created',   actor: 'mira',    target: 'k3', when: '5 days ago',   line: 'Mira added a tradition.',             sub: 'Sunday bread' },
  { id: 'w6', kind: 'invited',   actor: 'you',     target: null, when: 'Last week',    line: 'Sam joined the family space.',        sub: 'Welcomed by you.' },
  { id: 'w7', kind: 'anniversary', actor: 'system', target: null, when: '2 weeks ago', line: "It has been one year since Thomas's last kinloom.", sub: 'His words are still here.' },
];

export const TREE_EDGES: [string, string][] = [
  ['eleanor', 'james'], ['thomas', 'james'],
  ['eleanor', 'ruth'],  ['thomas', 'ruth'],
  ['james', 'you'],     ['mira', 'you'],
  ['james', 'sam'],     ['mira', 'sam'],
  ['james', 'noor'],    ['mira', 'noor'],
  ['you', 'ivy'],       ['you', 'theo'],
];

export const COUPLES: [string, string][] = [
  ['eleanor', 'thomas'],
  ['mira', 'james'],
];

/* One configuration per employer, and a general one with no employer. Keep achievements and links accurate. */
const solvedEdition = {
  id: 'solved-001',
  company: 'Solved Studio',
  interviewer: 'James Morgenstern',
  role: 'Builder',
  applicant: 'Augustus Edem',
  editionLabel: 'SOLVED STUDIO EDITION',
  // The employer's own site: a Netscape Navigator icon in the desktop's Internet group.
  employerSite: 'https://solved.studio/',
  // The cutscenes are the director's cut in src/director-scenes.js.
  directorCut: true,
  // This edition's CV has a sentence the general one leaves out (cvOmit below), so it has its own PDF.
  cvPdf: 'assets/cv/solved/Augustus-Edem-CV.pdf',
  intro: 'I’m Augustus Edem. Most people attach a CV. I got carried away and made Solved Studio a four-world adventure. Play through my application or go straight to the work.',
  finish: 'Thanks for playing, Solved Studio. Nobody asked me for a game. You asked what I had done that was abnormal, and this seemed quicker than explaining. I’d love to walk you through the work you picked.',
  // The line under the title. Other editions keep "A playable application by <name>".
  tagline: 'You asked what was abnormal.\nAugustus Edem built this.',
  // What the plane's banner says as it crosses each world, in order. Capitals, one line each.
  banners: [
    'HIRE AUGUSTUS. THE PLANE IS BY THE HOUR.',
    'STILL AVAILABLE. THE PILOT HAS STARTED ASKING QUESTIONS.',
    'HE HAS ALSO EMAILED. HE IS NOTHING IF NOT THOROUGH.',
    'HE’S IN THE BUILDING. THIS IS NOW JUST SHOWING OFF.'
  ],
  skillProjects: {
    "creative-direction": "Emotive Impact",
    "product-thinking": "Commune",
    "problem-solving": "Cairn",
    "delivery": "Emotive Impact",
    "building": "Vlume",
    "iteration": "SALEANE",
    "curiosity": "Commune",
    "systems": "Cairn",
    "growth": "SALEANE",
    "storytelling": "Emotive Impact",
    "collaboration": "Commune",
    "judgement": "HIRE.EXE"
},
  // What each skill token is called in this edition: the advert's own "you are probably right
  // for this if" list, in the advert's words where they fit. Other editions keep the level's titles.
  skillTitles: {
    'creative-direction': 'Human taste where it matters',
    'product-thinking': 'Understands people',
    'problem-solving': 'Handed a problem, not a task list',
    'delivery': 'Gets it out the door',
    'building': 'Built something nobody asked for',
    'iteration': 'Ships it before it is perfect',
    'curiosity': 'Happy doing it for the first time',
    'systems': 'High standards',
    'growth': 'Tests it on real people',
    'storytelling': 'Twenty years of knowing where to cut',
    'collaboration': 'Has never said “not my job”',
    'judgement': 'Claude Code and Codex, daily'
  },
  // README.TXT, the first icon on the desktop: the whole application in the shape the advert asks for.
  // Keep the lists in step with links and working below, and with src/cv-text.js.
  readme: `README.TXT

HIRE.EXE, version 0.4
A job application, disguised as a video game.

WHAT THIS IS

You asked what I had done that was abnormal. This is it. I built my application as a 16-bit game, directed every scene, and built it with Claude Code and Codex. It was playable the day after the first commit. A bot plays it on desktop, Android and iPhone every time I change it.

WHERE EVERYTHING IS

HIRE.EXE: The game. Four worlds, about five minutes.
CV.TXT and CV.PDF: The facts, for people who skip to the end.
DEVLOG.TXT: How this was made, a day at a time.
Internet: Things I have shipped. Double-click to open.
Working On: Things in beta. Same again.
Games: The submarine. Nobody asked for it.
Hire Augustus.exe: Run this last.
Guestbook: Sign it on your way out.

KNOWN ISSUES

The submarine was ordered by mistake. It stays.
The Calculator has opinions.

Now close this and double-click HIRE.EXE.

Augustus Edem
`,
  profile: 'I build and ship products with Claude Code and Codex, every day. Two are out, six are on the way, and I do the lot: the idea, the interface, the database, the checkout and the deploy. Before this I spent twenty years directing and editing film, which is where I learned what keeps people watching.',
  experience: [
    { role: 'Founder and Creative Director', company: 'Emotive Impact' },
    { role: 'Video Editor and Director', company: 'OMNi Digital Media' },
    { role: 'Head of Digital Media', company: 'Digital Smart Web' }
  ],
  fieldNotes: {
    'product-thinking': 'Commune started with a household question. Who takes responsibility when a shared task slips?',
    building: 'In Vlume, a small delay control can matter as much as a new audio effect. Try two speakers in the same room.',
    systems: 'Cairn makes the owner’s choice part of the cleanup flow. A gigabyte counter alone cannot tell you what matters.',
    collaboration: 'Editing taught me to listen to the room. Building a product asks the same thing of me.'
  },
  portfolio: [
    { name:'Emotive Impact', description:'Creative direction and client films, from concept and storyboards through production and post.',
      work:'I led scope, schedules and budgets, mentored editors and reviewed work before delivery.', url:'https://emotiveimpact.io/' },
    { name:'Vlume', description:'A macOS mixer for turning one app up and adjusting connected speakers individually.',
      work:'I designed and built it with Claude Code and Codex, from the menu-bar controls to the site, the download and the one-time purchase.', url:'https://vlumeaudio.com/' },
    { name:'Cairn', description:'A Mac storage utility that helps people decide what to clear.',
      work:'I designed protected-file safeguards, reviewable cleanup plans and receipts that show the actual change in free space.', url:'https://cairnmac.com/' },
    { name:'Commune', description:'A shared-living product for household costs, tasks and group information.',
      work:'I directed the homepage and journal, reviewed navigation on desktop and mobile, and used interactive examples to explain splits and repayments.', url:'https://ourcommune.io/' },
    { name:'SALEANE', description:'A booking assistant that connects customer requests with a small business owner’s diary.',
      work:'I designed the flow around what the customer asks for and what the owner needs to see in their diary.', url:'https://saleane.vercel.app/' }
  ],
  contactUrl: 'mailto:emotiveimpact@gmail.com?subject=HIRE.EXE%20-%20Let%27s%20talk',
  // Each platform becomes an icon in the desktop's Internet group (https:// links only).
  // Add more here once Edem confirms them; Hire Augustus.exe sends people to that group.
  links: [
    { name: 'Video Portfolio', id: 'vimeo', url: 'https://vimeo.com/emotiveimpact' },
    { name: 'Vlume', url: 'https://vlumeaudio.com/' },
    { name: 'Cairn', url: 'https://cairnmac.com/' },
    { name: 'Emotive Impact', url: 'https://emotiveimpact.io/' }
  ],
  // Projects in progress: one icon each in the desktop's Working On group (https:// links only).
  // Keep the list in step with CURRENTLY WORKING ON in src/cv-text.js.
  working: [
    { name: 'NoSpoilers', url: 'https://nospoilers.dev/' },
    { name: 'DraftHR', url: 'https://drafthr.io/' },
    { name: 'Lumalook', url: 'https://lumalook.app/' },
    { name: 'Commune', url: 'https://ourcommune.io/' },
    { name: 'SALEANE', url: 'https://saleane.vercel.app/' }
  ],
  // Hire Augustus.exe's install steps for this employer. They answer the Solved advert line by line:
  // no fancy office, Claude Code and Codex, automate the third time, a salary with a number in it,
  // no ping-pong table, no detailed instructions and no long cover note.
  setupSteps: [
    {file: 'OFFICE.IN_', act: 'Searching for fancy office...', aside: 'None found. Space required: one desk.', to: 9},
    {file: 'EDITING.DL_', act: 'Uncompressing twenty years of film and editing...', aside: 'This may take a while. It took twenty years the first time.', to: 18},
    {file: 'DIRECTOR.DL_', act: 'Installing creative direction...', aside: 'Includes saying “it’s nearly there” and meaning it.', to: 27},
    {file: 'AGENTS.IN_', act: 'Configuring Claude Code and Codex...', aside: 'They have been told to ask before deleting anything. They have asked twice already.', to: 36},
    {file: 'TWICE.SY_', act: 'Copying the same file for the second time...', aside: 'There will not be a third. It has been automated.', to: 46},
    {disk: true, file: 'REFS.TX_', act: 'Reading Disk 2 (References)...', aside: 'References available on request. As is traditional.', to: 55},
    {file: 'SALARY.IN_', act: 'Reading the salary from the advert...', aside: 'It gives an actual number. Setup has read it twice to be sure.', to: 64},
    {file: 'PINGPONG.SY_', act: 'Locating the ping-pong table...', aside: 'None found. Located the kettle instead. The first round is on Augustus.', to: 73},
    {file: 'README.TX_', act: 'Reading detailed instructions...', aside: 'None supplied. Continuing anyway.', to: 81},
    {file: 'COVERLET.TX_', act: 'Deleting “I look forward to hearing from you”...', aside: 'It had been looking forward for some time.', to: 89},
    {file: 'ETHIC.DL_', act: 'Installing work ethic...', aside: 'Still at 97%. It’s staying late to finish.', to: 97, stall: true}
  ],
  interview: [
    {question:'Which project shall we talk through?', answers:[
      {label:'Vlume', text:'I started with a listening problem. In Vlume you can route Mac audio to multiple speakers and adjust each output. I can show you the controls and the timing trade-offs.'},
      {label:'Cairn', text:'Cairn asks a practical question before any cleanup: does the owner understand what they are about to remove? I can show you how that shaped the flow.'},
      {label:'Commune', text:'In Commune, I’m interested in the moment a shared task becomes one person’s responsibility. A household pantry makes that design problem very concrete.'},
      {label:'SALEANE', text:'A customer asks to book. The owner needs the right appointment in their diary. I can walk through the design between those two moments and show what the demo does.'}
    ]},
    {question:'What happens next?', answers:[
      {label:'The 30-minute call', text:'Half an hour, your questions, my screen. I’ll bring the work and leave the deck at home. I gather you don’t do them either.'},
      {label:'The paid trial project', text:'Hand me a problem, not a task list. I’ll come back with a live URL and a short note on what I’d fix next.'},
      {label:'Monday', text:'Suits me. The advert mentioned several hats. I’ll bring my own.'}
    ]}
  ]
};

// The edition everyone gets: the same game with no employer in it. Nothing here names a company or
// a person, and tests/simulation.test.js fails if that changes. It differs from the Solved edition
// only where that one speaks to Solved: the lines below, and Setup's own default steps.
const generalEdition = {
  ...solvedEdition,
  id: 'general',
  company: '',
  // What the cutscenes call the person across the desk.
  interviewer: 'Interviewer',
  role: 'AI-native builder',
  editionLabel: '',
  employerSite: null,
  intro: 'I’m Augustus Edem. Most people attach a CV. I got carried away and built a four-world adventure. Play through my application or go straight to the work.',
  finish: 'Thanks for playing. Most people attach a CV. I got carried away and built four worlds. I’d love to walk you through the work you picked.',
  tagline: 'Most people attach a CV.\nAugustus Edem built this.',
  readme: solvedEdition.readme.replace('You asked what I had done that was abnormal. This is it. I built my application',
    'Most people attach a CV. I built my job application'),
  setupSteps: null,
  // CV.TXT, cv.html and CV.PDF leave out the one sentence that answers Solved's advert.
  cvPdf: null,
  cvOmit: ['You asked what I have done that is abnormal. '],
  // The director's cut with its Solved lines swapped. Lines are counted from 0 within a shot, so the
  // shots in src/director-scenes.js stay one list for both editions. `images` can give a shot its own
  // picture: {'office-1': 'assets/…/office-1.webp'}.
  cutscenes: {
    titles: {'Thursday at James’s': 'Come in on Thursday'},
    speakers: {'James': 'Interviewer', 'James, later by email': 'A reply, later by email'},
    lines: {
      'p04-gatekeeper': {0: 'Portal|Lastly, tell us what makes you stand out. Maximum 200 characters.',
        1: 'Augustus|Stand out? I’ll do better than tell you. I’ll build you a video game.'},
      'p05-play': {0: 'Augustus|There. That stands out. Your turn to apply for something.'},
      'p13-draft': {0: 'Augustus|“Hi there” or “Dear Hiring Team”?'},
      'office-2': {1: 'Augustus|You asked for a CV, so I built you a video game.'}
    },
    images: {}
  },
  interview: [
    solvedEdition.interview[0],
    {question:'What happens next?', answers:[
      {label:'A call', text:'Half an hour, your questions, my screen. I’ll bring the work and leave the deck at home.'},
      {label:'A trial project', text:'Hand me a problem, not a task list. I’ll come back with a live URL and a short note on what I’d fix next.'},
      {label:'Monday', text:'Suits me. I’ve checked the diary. It was a short read.'}
    ]}
  ]
};

// Register another edition here. Each ID has its own saved results.
const editions = new Map([
  [generalEdition.id, generalEdition],
  [solvedEdition.id, solvedEdition],
  ['portfolio', { ...solvedEdition, id: 'portfolio', company: '', interviewer: null, role: 'Product builder',
    editionLabel: 'PORTFOLIO EDITION', employerSite: null, directorCut: false, cvPdf: null, cvOmit: generalEdition.cvOmit, setupSteps: null, skillTitles: null, readme: null, tagline: null,
    banners: ['HIRE AUGUSTUS. THE PLANE IS BY THE HOUR.', 'STILL AVAILABLE. THE PILOT HAS STARTED ASKING QUESTIONS.',
      'REFERENCES AVAILABLE. THE PILOT SAYS HE’S FINE.', 'CHEAPER THAN A RECRUITER. SLIGHTLY.'],
    interview: [
    {question:'What would you like to explore first?', answers:[
      {label:'The creative background', text:'Over 20 years of video production, editing and creative direction. I care about how an idea feels, how clearly it communicates and whether it works for the people using it.'},
      {label:'The product-building process', text:'I work with AI coding agents to turn ideas into working products. I shape the flow, direct the agents and test the result. If a real customer can’t finish the task, there’s still work to do.'},
      {label:'How the two fit together', text:'Storytelling gives a product a clear purpose. Building makes that purpose tangible. I enjoy the work between the two: shaping a problem, trying an approach and refining the result.'}
    ]},
      solvedEdition.interview[0],
    {question:'What should the next conversation focus on?', answers:[
      {label:'Working together', text:'How I could contribute creative direction, product judgement and hands-on AI-assisted building to your team.'},
      {label:'A project walkthrough', text:'A chance to look at real work, discuss trade-offs and ask questions about how it was made.'},
      {label:'The role and the team', text:'What the team needs, where my experience fits and what we could learn from each other.'}
    ]}],
    intro: 'I’m Augustus Edem. Play through four stages of my work in creative direction and product building, or open the portfolio.',
    finish: 'Thanks for playing. I’d love to show you how the work came together.' }]
]);
// Which edition this visitor gets. Everyone gets the general one. The Solved edition is for the link
// in the email to James, hireexe.me/?from=james, or ?edition=solved-001. Either choice is remembered
// in this browser, so coming back to the plain address keeps the same game and its saved progress;
// ?edition=general puts it back. The test edition (?edition=portfolio) is never remembered.
function chooseEdition() {
  const KEY = 'hired-exe:edition', kept = [generalEdition.id, solvedEdition.id];
  const query = new URLSearchParams(globalThis.location?.search || '');
  const source = (query.get('from') || query.get('ref') || query.get('utm_source') || '').trim().toLowerCase();
  let asked = query.get('edition');
  if (!editions.has(asked)) asked = source === 'james' ? solvedEdition.id : null;
  let remembered = null;
  try {
    if (kept.includes(asked)) localStorage.setItem(KEY, asked);
    else if (!asked) remembered = localStorage.getItem(KEY);
  } catch (_) { /* Storage can be blocked. The address still decides. */ }
  return editions.get(asked) || editions.get(kept.includes(remembered) ? remembered : '') || generalEdition;
}
globalThis.HIRED_EDITIONS = editions;
globalThis.HIRED_EDITION = chooseEdition();
// CV.TXT for this edition: the full text less any sentence the edition leaves out.
globalThis.HIRED_EDITION_CV = text => (globalThis.HIRED_EDITION.cvOmit || []).reduce((t, cut) => t.split(cut).join(''), String(text ?? ''));


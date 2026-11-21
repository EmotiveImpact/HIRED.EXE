/* One configuration per employer. Keep achievements and links accurate. */
const solvedEdition = {
  id: 'solved-001',
  company: 'Solved Studio',
  interviewer: 'James Morgenstern',
  role: 'Builder',
  applicant: 'Augustus Edem',
  editionLabel: 'SOLVED STUDIO EDITION',
  intro: 'I’m Augustus Edem. Most people attach a CV. I got carried away and made Solved Studio a four-world adventure. Play through my application or go straight to the work.',
  finish: 'Thanks for playing, Solved Studio. I’d love to walk you through the work you picked and hear what you’re building next.',
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
    "judgement": "Emotive Impact"
},
  profile: 'I’m a creative director and AI-native product builder with over 20 years in film and editing. I take software from brief to release: design the experience, trace the flow from interface to database, direct coding agents, review their changes and test what ships.',
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
      work:'I led scope, schedules and budgets, mentored editors and reviewed work before delivery.', url:null },
    { name:'Vlume', description:'A macOS mixer for turning one app up and adjusting connected speakers individually.',
      work:'I led the experience from menu-bar controls through the site, download and one-time purchase.', url:'https://vlumeaudio.com/' },
    { name:'Commune', description:'A shared-living product for household costs, tasks and group information.',
      work:'I directed the homepage and journal, reviewed navigation on desktop and mobile, and used interactive examples to explain splits and repayments.', url:null },
    { name:'SALEANE', description:'A booking assistant that connects customer requests with a small business owner’s diary.',
      work:'I designed the flow around what the customer asks for and what the owner needs to see in their diary.', url:'https://saleane.vercel.app/demo' },
    { name:'Cairn', description:'A Mac storage utility in development that helps people decide what to clear.',
      work:'I designed protected-file safeguards, reviewable cleanup plans and receipts that show the actual change in free space.', url:'https://cairnmac.com/' }
  ],
  contactUrl: 'mailto:emotiveimpact@gmail.com?subject=HIRE.EXE%20-%20Let%27s%20talk',
  interview: [
    {question:'What would you like to explore first?', answers:[
      {label:'The creative background', text:'Over 20 years of video production, editing and creative direction. I care about how an idea feels, how clearly it communicates and whether it works for the people using it.'},
      {label:'The product-building process', text:'I work with AI coding agents to turn ideas into working products. I shape the flow, direct the agents and test the result. If a real customer can’t finish the task, there’s still work to do.'},
      {label:'How the two fit together', text:'Storytelling gives a product a clear purpose. Building makes that purpose tangible. I enjoy the work between the two: shaping a problem, trying an approach and refining the result.'}
    ]},
    {question:'Which project shall we talk through?', answers:[
      {label:'Vlume', text:'I started with a listening problem. In Vlume you can route Mac audio to multiple speakers and adjust each output. I can show you the controls and the timing trade-offs.'},
      {label:'Commune', text:'In Commune, I’m interested in the moment a shared task becomes one person’s responsibility. A household pantry makes that design problem very concrete.'},
      {label:'SALEANE', text:'A customer asks to book. The owner needs the right appointment in their diary. I can walk through the design between those two moments and show what the demo does.'},
      {label:'Cairn', text:'Cairn asks a practical question before any cleanup: does the owner understand what they are about to remove? I can show you how that shaped the flow.'}
    ]},
    {question:'What should the next conversation focus on?', answers:[
      {label:'Working together', text:'How I could contribute creative direction, product judgement and hands-on AI-assisted building to your team.'},
      {label:'A project walkthrough', text:'A chance to look at real work, discuss trade-offs and ask questions about how it was made.'},
      {label:'The role and the team', text:'What the team needs, where my experience fits and what we could learn from each other.'}
    ]}
  ]
};

// Register another edition here. Each ID has its own saved results.
const editions = new Map([
  [solvedEdition.id, solvedEdition],
  ['portfolio', { ...solvedEdition, id: 'portfolio', company: '', interviewer: null, role: 'Product builder',
    editionLabel: 'PORTFOLIO EDITION',
    intro: 'I’m Augustus Edem. Play through four stages of my work in creative direction and product building, or open the portfolio.',
    finish: 'Thanks for playing. I’d love to show you how the work came together.' }]
]);
globalThis.HIRED_EDITION = editions.get(new URLSearchParams(globalThis.location?.search).get('edition')) || solvedEdition;

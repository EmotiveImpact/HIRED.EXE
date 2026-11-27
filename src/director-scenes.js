// Review-only edit. Published game beats stay in scenes.js until the director approves.
const directorScenes = [
  {
    title: 'One PDF', place: 'Augustus’s home studio', cue: 'Opening cinematic, before World 1. The portal prompt is read aloud as screen dialogue. Solved’s advert then asks its own question, which is why the game exists: Augustus sketches the filter, builds the game and presses Play.',
    shots: [
      ['p01-upload','Upload','Portal|Please upload your CV.','Augustus|There you go.'],
      ['p02-form','The receipt','Portal|Thank you. Now enter your employment history.','Augustus|What did you do with the PDF?'],
      ['p03-the-limit','Five years maximum','Portal|Please enter a number between one and five.','Augustus|I’ll let the other fifteen know.'],
      ['p04-gatekeeper','An idea','Solved’s advert|No long cover note. Just tell us what you have done that is abnormal.','Augustus|Abnormal? I’ll do better than tell you. I’ll build you a video game.'],
      ['p05-play','Press Play','Augustus|There. Abnormal enough. Your turn to apply for something.']
    ]
  },
  {
    title:'Your application is important to us',place:'World 1 · Application Alley',cue:'Opening of the first level. Cut through the monitor into the sunny viaduct. The little scanner on the barrier speaks. The attendant has heard this exchange all day. The last jump hands control to the player.',
    shots:[
      ['alley-1','Queue of one','CV Filter|Next, please.','Augustus|Been a bit of a rush, has it?'],
      ['alley-2','Green tick','CV Filter|I’ve read your CV.','Augustus|Oh, good.'],
      ['alley-3','The paperwork','CV Filter|Just a couple of things to fill in.'],
      ['alley-4','Over the barrier','Augustus|Finally. A transferable skill.']
    ]
  },
  {
    title:'A quick addition',place:'World 2 · Ship It City',cue:'Augustus vibe-codes a calculator. The trolley takes “ship it” literally and orders a submarine. The calculator gets one last job before launch.',
    shots:[
      ['city-1','One calculator','Augustus|I vibe-coded a calculator. Two plus two makes four. Let’s ship it.'],
      ['city-2','The submarine'],
      ['city-3','The bill','Augustus|How much did that cost?','Workshop trolley|Hang on. I’ll open the calculator.'],
      ['city-4','Ship it','Workshop trolley|Four.','Augustus|Pounds?','Workshop trolley|Million.','Augustus|Right. Ship the app.']
    ]
  },
  {
    title:'Both of them',place:'World 3 · Growth Run',cue:'The rooftop billboard is the game’s analytics dashboard given a voice. Augustus tries his own build on two devices. The billboard mistakes those sessions for an audience. Play resumes across the rooftops.',
    shots:[
      ['growth-1','Launch day','Billboard|Your audience is growing.','Augustus|Already?'],
      ['growth-2','The device test','Augustus|That jump works on the phone as well. Good.'],
      ['growth-3','The audience portrait','Billboard|Two loyal players.'],
      ['growth-4','Meet the fans','Augustus|I won’t keep them. They’ve both got work.']
    ]
  },
  {
    title:'The attachment',place:'Back in Augustus’s home studio',cue:'Cut out of the game for the actual email. Pepper appears as a text chat in a neighbouring tab. Its line appears in the dialogue strip. James’s reply is the invitation that motivates the next level.',
    shots:[
      ['p13-draft','The salutation','Augustus|“Hi James” or “Dear James”?','Pepper, in chat|We shipped a game in less time than this greeting.'],
      ['p14-just-sent','Sent','Augustus|Please find attached.','Pepper, in chat|Strong email. Shy attachment.'],
      ['p15-attachment','Second email','Augustus|And, in a surprise development, my CV.','James, later by email|I played it. Come in on Thursday?']
    ]
  },
  {
    title:'Three quick stages',place:'World 4 · Final Interview HQ',cue:'Before Thursday’s meeting, Augustus plays his imaginary version of the hiring process. The real game has a phone screen, a take-home task and a panel in that order. These shots introduce those rounds inside its glass arcade.',
    shots:[
      ['hq-1','The arcade','Augustus|I’ll just run through what they might ask.'],
      ['hq-2','Phone screen','Recorded voice|Where do you see yourself in five years?','Augustus|Through to the second round, ideally.'],
      ['hq-3','Take-home task','Task dispenser|Spend no more than an hour on this.','Augustus|Reading it?'],
      ['hq-4','The panel','Panel chair, centre lamp|Make yourself comfortable.','Augustus|Any chance of turning the middle one down?']
    ]
  },
  {
    title:'Thursday at James’s',place:'James’s office · fictionalised Solved Studio meeting',cue:'After the fourth world, cut to Thursday in a working design studio. The orange visitor’s chair, blue partition and print proofs establish a new room. James has actually played the game within this story.',
    shots:[
      ['office-1','The visitor’s chair','James|Did the submarine ever ship?','Augustus|Still in beta.'],
      ['office-2','The interview','James|What would you say is your biggest weakness?','Augustus|You asked what was abnormal, so I built you a video game.'],
      ['office-3','The diary','James|Biggest strength?','Augustus|Same answer.','James|Can you do Monday?'],
      ['office-4','The handshake']
    ]
  }
];

function directorPanel(id) {
  const own = globalThis.HIRED_EDITION?.cutscenes?.images?.[id];
  if (own) return own;
  const revision = /^city-[24]$/.test(id) ? 'v6/' : /^city-[13]$/.test(id) ? 'v5/' : id === 'p05-play' ? 'v4/' :
    ['p04-gatekeeper','p15-attachment'].includes(id) ? 'v2/' :
    id === 'office-3' ? '' : 'v3/';
  return 'assets/directors-board/' + revision + id + '.webp';
}

// The cut as this edition tells it. The shots above are written for the Solved edition; an edition
// can reword a line, rename a speaker or a chapter, or give a shot its own picture, all in its
// `cutscenes` entry in src/edition.js. Lines are counted from 0 within their shot.
function directorCut(edition = globalThis.HIRED_EDITION) {
  const own = edition?.cutscenes || {};
  return directorScenes.map(scene => ({...scene, title: own.titles?.[scene.title] || scene.title,
    shots: scene.shots.map(([panel, alt, ...lines]) => [panel, alt, ...lines.filter(Boolean).map((line, i) => {
      const [who, ...words] = (own.lines?.[panel]?.[i] || line).split('|');
      return (own.speakers?.[who] || who) + '|' + words.join('|');
    })])}));
}

if (globalThis.HIRED_EDITION && globalThis.Hired?.SCENES) {
  const chapters = directorCut().map(scene => scene.shots.map(([panel, alt, ...lines]) => ({
    panel, alt, title: scene.title, image: directorPanel(panel),
    dialogue: lines.map(line => line.split('|')),
    burst: panel === 'p05-play'
  })));
  const [studio, alley, city, growth, email, hq, office] = chapters;
  const groups = [[...studio,...alley],city,growth,[...email,...hq],office.slice(0,2),office.slice(2)];
  const game = globalThis.Hired;
  if (globalThis.HIRED_EDITION.directorCut) {
    game.SCENES = groups.map(beats => ({title:beats[0].title,beats}));
  } else {
    game.SCENES[1] = {title:city[0].title, beats:city};
  }
  game.PANELS.ready = game.SCENES.flatMap(scene => scene.beats.map(beat => beat.panel));
}

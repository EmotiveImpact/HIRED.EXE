// Review-only edit. Published game beats stay in scenes.js until the director approves.
const directorScenes = [
  {
    title: 'One PDF', place: 'Augustus’s home studio', cue: 'Opening cinematic, before World 1. The portal prompt is read aloud as screen dialogue. Augustus draws what the filter might look like, then presses Play.',
    shots: [
      ['p01-upload','Upload','Portal|Please upload your CV.','Augustus|There you go.'],
      ['p02-form','The receipt','Portal|Thank you. Now enter your employment history.','Augustus|What did you do with the PDF?'],
      ['p03-the-limit','Five years maximum','Portal|Please enter a number between one and five.','Augustus|I’ll let the other fifteen know.'],
      ['p04-gatekeeper','An idea','', 'Augustus|Psych! I didn’t draw anything. I used my imagination!'],
      ['p05-play','Press Play','Augustus|Right. Your turn to apply for something.']
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
    title:'A quick addition',place:'World 2 · Ship It City',cue:'On entering the dock level, the workshop trolley offers to help finish one small job. It embodies the familiar person who says “while you’re here”. The player ships the fish and leaves the extra work at the dock.',
    shots:[
      ['city-1','One fish','Augustus|Last job before we ship the level. Paint one fish for the canal.'],
      ['city-2','The reveal','Workshop trolley|While you’re here, could you do the inside?','Augustus|Of the fish?'],
      ['city-3','The estimate','Workshop trolley|Of the submarine. We’ve bought the propeller.'],
      ['city-4','Delivery','Augustus|Lovely. Keep the receipt.']
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
    title:'The attachment',place:'Back in Augustus’s home studio',cue:'Cut out of the game for the actual email. Claude is proposed as a text chat in a neighbouring tab. Its line appears in the dialogue strip. James’s reply is the invitation that motivates the next level.',
    shots:[
      ['p13-draft','The salutation','Augustus|“Hi James” or “Dear James”?','Claude, in chat|You’ve been on this bit longer than the water level.'],
      ['p14-just-sent','Sent','Augustus|Please find attached.','Claude, in chat|Was that an instruction for me?'],
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
      ['office-1','The visitor’s chair','James|I got as far as the submarine.','Augustus|Further than the submarine did.'],
      ['office-2','The interview','James|What would you say is your biggest weakness?','Augustus|You asked for a CV and I built you a video game.'],
      ['office-3','The diary','James|Biggest strength?','Augustus|Same answer.','James|Can you do Monday?'],
      ['office-4','The handshake']
    ]
  }
];

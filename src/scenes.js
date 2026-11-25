(function (H) {
  'use strict';

  H.SCENES = [
  {
    "title": "Forty boxes",
    "backdrop": "application-alley",
    "beats": [
      {
        "panel": "p01-upload",
        "speaker": "Augustus",
        "line": "CV uploaded.",
        "alt": "Augustus uploads the document at his desk."
      },
      {
        "panel": "p02-form",
        "speaker": "Augustus",
        "line": "Now type it all in again. Lovely. They’ve got a copy to mark mine against.",
        "alt": "A green tick sits above a long grid of empty boxes."
      },
      {
        "panel": "p03-the-limit",
        "speaker": "Augustus",
        "line": "Years of experience. Five is the most it’ll take. Where do I put the other fifteen?",
        "alt": "Augustus stares straight back at the form, one eyebrow raised."
      },
      {
        "panel": "p04-gatekeeper",
        "speaker": "Augustus",
        "line": "Twenty years of work and I can’t get past the first screen. Hang on.",
        "alt": "Augustus draws a gatekeeper in his sketchbook."
      },
      {
        "panel": "p05-play",
        "speaker": "Augustus",
        "line": "Right. Let’s give them something to play.",
        "alt": "His drawing becomes the gatekeeper inside the game.",
        "burst": true
      }
    ]
  },
  {
    "title": "While I’m here",
    "backdrop": "ship-it-city",
    "beats": [
      {
        "panel": "p06-fish",
        "speaker": "Augustus",
        "line": "Bit of water here. One fish. Ten minutes.",
        "alt": "Augustus sketches one fish in a small pool."
      },
      {
        "panel": "p07-submarine",
        "speaker": "Augustus",
        "line": "Apparently the fish needs a submarine.",
        "alt": "His submarine plans now cover the desk."
      },
      {
        "panel": "p08-rubber",
        "speaker": "Augustus",
        "line": "I only came in here to add a fish.",
        "alt": "Augustus takes a rubber to the submarine."
      }
    ]
  },
  {
    "title": "Two people played it",
    "backdrop": "growth-run",
    "beats": [
      {
        "panel": "p09-laptop-test",
        "speaker": "Augustus",
        "line": "That’s the laptop.",
        "alt": "Augustus tests a jump on the laptop."
      },
      {
        "panel": "p10-phone-test",
        "speaker": "Augustus",
        "line": "And the phone.",
        "alt": "He tests the same jump on his phone."
      },
      {
        "panel": "p11-two-players",
        "speaker": "Augustus",
        "line": "Two players.",
        "alt": "The dashboard shows two visitors."
      },
      {
        "panel": "p12-loyal-fans",
        "speaker": "Augustus",
        "line": "Both stayed to the end. Nice of me.",
        "alt": "Augustus looks from his phone to his laptop."
      }
    ]
  },
  {
    "title": "Please find attached",
    "backdrop": "interview-hq",
    "beats": [
      {
        "panel": "p13-draft",
        "speaker": "Augustus",
        "line": "Four levels built. Still deciding between ‘Hi James’ and ‘Dear James’.",
        "alt": "The game link sits in a nearly empty draft.",
        "neutralLine": "Four levels built. Still deciding between ‘Hi’ and ‘Dear Hiring Team’."
      },
      {
        "panel": "p14-just-sent",
        "speaker": "Augustus",
        "line": "Please find attached.",
        "alt": "The envelope has gone. His CV is still on the desk."
      },
      {
        "panel": "p15-attachment",
        "speaker": "Augustus",
        "line": "And, in a surprise development, my CV.",
        "after": "Later that morning, an invitation arrives. Three rounds, then the interview.",
        "alt": "This time he attaches the CV."
      }
    ]
  },
  {
    "title": "You’re up",
    "backdrop": "interview-hq",
    "beats": [
      {
        "panel": "p16-interview",
        "speaker": "interviewer",
        "line": "I played your game.",
        "alt": "James invites Augustus to sit beside the monitor.",
        "portrait": true,
        "pose": "idle_1",
        "prop": "finalreview",
        "effect": ""
      },
      {
        "panel": "p17-weakness",
        "speaker": "interviewer",
        "line": "Biggest weakness?",
        "alt": "Augustus gestures towards his game.",
        "portrait": true,
        "pose": "idle_1",
        "prop": "finalreview",
        "effect": "",
        "reply": "You asked what was abnormal, so I built you a video game."
      },
      {
        "panel": "p18-strength",
        "speaker": "interviewer",
        "line": "And your biggest strength?",
        "alt": "James pauses with his pen. Augustus shrugs.",
        "portrait": true,
        "pose": "idle_1",
        "prop": "finalreview",
        "effect": "",
        "reply": "Same answer."
      }
    ]
  },
  {
    "title": "The offer",
    "backdrop": "interview-hq",
    "beats": [
      {
        "panel": "p19-offer",
        "speaker": "interviewer",
        "line": "When can you start?",
        "alt": "James closes his notebook and looks up.",
        "portrait": true,
        "pose": "idle_1",
        "prop": "finalreview",
        "effect": ""
      },
      {
        "panel": "p20-handshake",
        "speaker": "",
        "line": "",
        "alt": "Augustus and James stand and shake hands.",
        "portrait": true,
        "pose": "idle_1",
        "prop": "finalreview",
        "effect": ""
      }
    ]
  }
];

  H.PANELS = {
    folder: "assets/production/story/panels-v2/",
    ready: H.SCENES.flatMap(scene => scene.beats.map(beat => beat.panel))
  };

  /* Short lines shown as toasts during a fight. Each boss only says things a real one would. */
  H.BARKS = {
    recruitmentbot: {
      start: 'CV Filter: Welcome, Mr Vitae. May I call you Curriculum?',
      taunts: [
        'CV Filter: We received a high volume of applications. Yours was one.',
        'CV Filter: Please confirm you are not a robot. Augustus: You first.',
        'CV Filter: I notice a gap in your CV.',
        'CV Filter: We will keep your CV on file.'
      ],
      opening: 'Shield down! Stomp or dash now.',
      hits: ['CV Filter: File deleted.', 'CV Filter: This inbox is not monitored. Please stop.'],
      defeat: 'CV Filter: Your application has been passed to a human. Sorry about that.',
      lose: 'CV Filter: Due to the volume of deaths, we cannot offer individual feedback.'
    },
    scopecreep: {
      start: 'While I’m Here: Quick one.',
      taunts: [
        'While I’m Here: While you’re in there...',
        'While I’m Here: It’s a five-minute job. Augustus: Brilliant. You do it, I’ll time you.',
        'While I’m Here: Can we jump on a quick call?',
        'While I’m Here: No rush. End of day is fine. Today.'
      ],
      signoffs: {
        BRIEF: 'BRIEF signed off. While I’m Here: Signed off? I’ve not finished starting.',
        BUILD: 'BUILD signed off. While I’m Here: Could it be the same, but different?',
        SHIP: 'SHIP signed off. While I’m Here: You can’t ship it. I had an idea in the shower.',
        'SHIP AGAIN': 'SHIP AGAIN signed off. That’s the one.'
      },
      hits: ['While I’m Here: Fine. I’ve written it on the back.'],
      defeat: 'While I’m Here: Fine. The fish can walk.',
      lose: 'While I’m Here: No worries. I’ve added three things while you were down.'
    },
    algorithm: {
      start: 'The Algorithm: Welcome. Your reach today is this room.',
      taunts: [
        'The Algorithm: Your reach is down 40%. No reason. I just felt like it.',
        'The Algorithm: Whatever worked a second ago has stopped working.',
        'The Algorithm: Have you tried posting at six in the morning?'
      ],
      opening: 'The Algorithm: Smash that like button. Stomp or dash now.',
      hits: ['The Algorithm: Engagement!', 'The Algorithm: That’s a strong interaction. Bit too strong.'],
      defeat: 'The Algorithm: Congratulations. You’ve gone viral. Get well soon.',
      lose: 'The Algorithm: Great content. Shared with nobody.'
    }
  };
})(globalThis.Hired = globalThis.Hired || {});

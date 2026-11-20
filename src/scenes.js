(function (H) {
  'use strict';

  const bot = { pose: 'idle_1', prop: 'recruitmentbot' };
  const algo = { pose: 'idle_1', prop: 'algorithm' };

  H.SCENES = [
    {
      title: 'Forty boxes',
      backdrop: 'application-alley',
      beats: [
        { art: 2, effect: 'UPLOAD OK', speaker: 'CV Filter',
          line: 'Thank you for uploading your CV. To continue, please type your entire CV into these forty boxes.' },
        { art: 0, effect: 'BOX 7', speaker: 'Augustus',
          line: 'Box seven. Years of experience. I’ve got twenty. The dropdown stops at five.' },
        { ...bot, effect: 'ERROR', speaker: 'CV Filter',
          line: 'Please select a value between nought and five.' },
        { pose: 'crouch_0', prop: 'terminal', effect: 'FINE.', speaker: 'Augustus',
          line: 'Fine. Five years each. Put me down as four people.' },
        { ...bot, effect: '4 RECEIVED', speaker: 'CV Filter',
          line: 'Four applications received. Unfortunately, three of you have been unsuccessful.' },
        { pose: 'hurt_0', prop: 'recruitmentbot', effect: 'WHICH ONE?', speaker: 'Augustus',
          line: 'Which one of me got through?' },
        { ...bot, effect: 'RESULT', speaker: 'CV Filter',
          line: 'The one with the least experience.' },
        { art: 1, effect: 'BUILD IT!', speaker: 'Augustus', burst: true,
          line: 'Right. Forget the form. I could build them a whole game in the time box nine is taking.' }
      ]
    },
    {
      title: 'A few changes',
      backdrop: 'ship-it-city',
      beats: [
        { pose: 'idle_1', prop: 'terminal', effect: 'LOVE IT', speaker: 'Scope Creep',
          line: 'Love it. Wouldn’t change a thing. I’ve just got a few changes.' },
        { art: 2, effect: 'QUICK ONE', speaker: 'Scope Creep',
          line: 'Could it have a swimming level? Nothing major. Just a small ocean.' },
        { pose: 'idle_1', prop: 'terminal', effect: '5 WEEKS', speaker: 'Augustus',
          line: 'That would take a normal person five weeks.' },
        { pose: 'hurt_0', prop: 'terminal', effect: 'REALLY?', speaker: 'Scope Creep',
          line: 'Really? It only took me five seconds to ask.' },
        { pose: 'victory_1', prop: 'terminal', effect: '5 MINUTES', speaker: 'Augustus',
          line: 'Lucky for you, it’d take me five minutes.' },
        { pose: 'idle_1', prop: 'terminal', effect: 'SO, YES?', speaker: 'Scope Creep',
          line: 'Brilliant! So that’s a yes.' },
        { art: 3, effect: 'CUT.', speaker: 'Augustus', burst: true,
          line: 'It’s a no. Twenty years as a film editor. Just because you can shoot a scene doesn’t mean it stays in.' }
      ]
    },
    {
      title: 'Your numbers are in',
      backdrop: 'growth-run',
      beats: [
        { pose: 'hurt_0', prop: 'algorithm', effect: 'INSIGHTS', speaker: 'The Algorithm',
          line: 'Your demo has had two players so far. Both of them were you.' },
        { ...algo, effect: 'AND?', speaker: 'Augustus',
          line: 'Right. And did we like it?' },
        { pose: 'hurt_0', prop: 'algorithm', effect: 'REVIEWS', speaker: 'The Algorithm',
          line: 'One of you did. The other one reported eleven bugs.' },
        { pose: 'victory_1', prop: 'algorithm', effect: 'HIRE HIM', speaker: 'Augustus',
          line: 'Good. He’s the one you want.' },
        { ...algo, effect: 'TOP TIP', speaker: 'The Algorithm',
          line: 'To grow your audience, you need to post every single day.' },
        { pose: 'crouch_0', prop: 'algorithm', effect: 'ABOUT WHAT?', speaker: 'Augustus',
          line: 'About what?' },
        { ...algo, effect: 'OBVIOUSLY', speaker: 'The Algorithm',
          line: 'About how you post every single day.' },
        { pose: 'jump_1', prop: 'bulb', effect: 'GO.', speaker: 'Augustus', burst: true,
          line: 'I’ll do it the old-fashioned way. Make something good, then pester people until they look.' }
      ]
    },
    {
      title: 'Please find attached',
      backdrop: 'interview-hq',
      beats: [
        { art: 4, effect: 'ONE EMAIL', speaker: 'Augustus',
          line: 'Four worlds and three bosses, done. Now the hard part. A two-line email.' },
        { pose: 'crouch_0', prop: 'envelope_0', effect: 'DRAFT 19', speaker: 'Augustus',
          line: 'I built the game quicker than this. I’ve been on the word ‘Hi’ since Tuesday.' },
        { pose: 'idle_1', prop: 'envelope_0', effect: 'TONE', speaker: 'Augustus',
          line: '‘Dear Sir or Madam’ sounds like I’m complaining about the bins. ‘Hey’ sounds like I’m selling them a gym membership.' },
        { pose: 'dash_1', prop: 'plane_1', effect: 'SEND.', speaker: 'Augustus',
          line: 'Read it nineteen times. Not one typo. Send.' },
        { pose: 'hurt_0', prop: 'briefcase', effect: 'OH NO', speaker: 'Augustus',
          line: '‘Please find attached.’ I haven’t attached anything.' },
        { pose: 'dash_1', prop: 'plane_1', effect: 'VERSION 2', speaker: 'Augustus', burst: true,
          line: 'Second email. ‘Now with attachment.’ Call it version two. Nobody ships a perfect version one.' }
      ]
    },
    {
      title: 'You’re up',
      backdrop: 'interview-hq',
      beats: [
        { art: 5, effect: 'COME IN', speaker: 'Interview host',
          line: 'Come in, come in. Did you find us all right?' },
        { pose: 'idle_1', prop: 'briefcase', effect: 'TRAFFIC', speaker: 'Augustus',
          line: 'Not bad. Four worlds, three bosses. Bit of traffic round the Algorithm.' },
        { art: 5, effect: 'REFERENCE', speaker: 'Interview host',
          line: 'We rang your reference. She says you’re talented, hard-working and not eating properly.' },
        { pose: 'hurt_0', prop: 'envelope_0', effect: 'AH.', speaker: 'Augustus',
          line: 'In my defence, she has known me the longest.' },
        { art: 5, effect: 'WEAKNESS?', speaker: 'Interview host',
          line: 'So. What would you say is your biggest weakness?' },
        { pose: 'idle_1', prop: 'briefcase', effect: 'HONESTLY', speaker: 'Augustus',
          line: 'You asked for a CV and I built you a video game.' },
        { art: 5, effect: 'STRENGTH?', speaker: 'Interview host',
          line: 'And your biggest strength?' },
        { pose: 'victory_1', prop: 'briefcase', effect: 'SAME.', speaker: 'Augustus', burst: true,
          line: 'Same answer.' }
      ]
    }
  ];

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
      start: 'Scope Creep: Quick one.',
      taunts: [
        'Scope Creep: While you’re in there...',
        'Scope Creep: It’s a five-minute job. Augustus: Brilliant. You do it, I’ll time you.',
        'Scope Creep: Can we jump on a quick call?',
        'Scope Creep: No rush. End of day is fine. Today.'
      ],
      signoffs: {
        BRIEF: 'BRIEF signed off. Scope Creep: Signed off? I’ve not finished starting.',
        BUILD: 'BUILD signed off. Scope Creep: Could it be the same, but different?',
        SHIP: 'SHIP signed off. Scope Creep: You can’t ship it. I had an idea in the shower.',
        'SHIP AGAIN': 'SHIP AGAIN signed off. That’s the one.'
      },
      hits: ['Scope Creep: Fine. I’ll raise it as a ticket.'],
      defeat: 'Scope Creep: Fine. Ship it. We’ll pick the ocean up in phase two.',
      lose: 'Scope Creep: No worries. I’ve added three things while you were down.'
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

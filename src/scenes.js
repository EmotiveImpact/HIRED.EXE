(function (H) {
  'use strict';

  H.SCENES = [
    {
      title: 'The sensible version',
      backdrop: 'application-alley',
      beats: [
        { art: 0, effect: 'UPLOAD', speaker: 'Augustus',
          line: 'I wrote a perfectly sensible covering letter. It sounded like every other perfectly sensible covering letter.' },
        { pose: 'hurt_0', prop: 'recruitmentbot', effect: 'ACCESS DENIED', speaker: 'CV Filter',
          line: 'Please prove you think outside the box. Maximum 250 characters.' },
        { art: 1, effect: 'BUILD IT!', speaker: 'Augustus', burst: true,
          line: 'Right. This application’s getting a jump button.' }
      ]
    },
    {
      title: 'A small revision',
      backdrop: 'ship-it-city',
      beats: [
        { pose: 'idle_1', prop: 'terminal', effect: 'BUILD 001', speaker: 'Build log',
          line: 'One small revision later, the covering letter had physics.' },
        { art: 2, effect: 'QUICK QUESTION', speaker: 'Scope Creep',
          line: 'While you’re in there, could the CV have multiplayer?' },
        { art: 3, effect: 'CUT.', speaker: 'Augustus', burst: true,
          line: 'I’ve spent twenty years editing. My favourite feature is still the cut.' }
      ]
    },
    {
      title: 'The demo broke',
      backdrop: 'growth-run',
      beats: [
        { pose: 'hurt_0', prop: 'algorithm', effect: 'EST. TIME: 2 MIN', speaker: 'The Algorithm',
          line: 'Users love onboarding. I’ve added fourteen steps.' },
        { pose: 'crouch_0', prop: 'terminal', effect: 'TEST RUN', speaker: 'Augustus',
          line: 'On SALEANE I start with a customer trying to book and an owner who needs it in their diary. That’s the whole test.' },
        { pose: 'jump_1', prop: 'bulb', effect: 'TRY IT', speaker: 'Augustus', burst: true,
          line: 'I should’ve learnt my lesson when my own CV fell through the floor.' }
      ]
    },
    {
      title: 'Before the door',
      backdrop: 'interview-hq',
      beats: [
        { art: 4, effect: 'DRAFT SAVED', speaker: 'Augustus',
          line: 'I’ve spent years making other people’s ideas easy to see. Showing what I can make is a different sort of nerve.' },
        { pose: 'run_1', prop: 'briefcase', effect: 'SEND?', speaker: 'Augustus',
          line: 'I kept polishing because polishing was easier than pressing send.' },
        { pose: 'dash_1', prop: 'plane_1', effect: 'SEND.', speaker: 'Augustus', burst: true,
          line: 'I can show them the work. The rest is a conversation.' }
      ]
    },
    {
      title: 'The attachment',
      backdrop: 'interview-hq',
      beats: [
        { art: 5, effect: 'KNOCK KNOCK', speaker: 'Interview host',
          line: 'Augustus? I’ve got your application here. I think I fell off it twice.' },
        { pose: 'victory_1', prop: 'envelope_0', effect: 'OPENED', speaker: 'Augustus',
          line: 'You should’ve seen the PDF.' }
      ]
    }
  ];
})(globalThis.Hired = globalThis.Hired || {});

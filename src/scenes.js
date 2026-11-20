(function (H) {
  'use strict';

  H.SCENES = [
    {
      title: 'A quick application',
      backdrop: 'application-alley',
      beats: [
        { art: 0, effect: 'DRAFT 19', speaker: 'Augustus',
          line: 'My CV says I work well under pressure. I’ve rewritten “Hi” so many times it’s starting to look aggressive.' },
        { pose: 'hurt_0', prop: 'recruitmentbot', effect: 'CV IMPORTED', speaker: 'CV Filter',
          line: 'CV imported successfully. Welcome, Page One of Two.' },
        { art: 1, effect: 'BUILD IT!', speaker: 'Augustus', burst: true,
          line: 'Right. Let’s see it parse a double jump.' }
      ]
    },
    {
      title: 'Just a small ocean',
      backdrop: 'ship-it-city',
      beats: [
        { pose: 'idle_1', prop: 'terminal', effect: 'BUILD 001', speaker: 'Augustus',
          line: 'I asked ChatGPT to fix the jump. It congratulated me on spotting the ground.' },
        { art: 2, effect: 'QUICK ONE', speaker: 'Scope Creep',
          line: 'Could we add a swimming level? Just a small ocean.' },
        { art: 3, effect: 'CUT.', speaker: 'Augustus', burst: true,
          line: 'I normally cut films. Today I’m cutting the sea out of a CV.' }
      ]
    },
    {
      title: 'User testing',
      backdrop: 'growth-run',
      beats: [
        { pose: 'hurt_0', prop: 'algorithm', effect: '2 PLAYERS', speaker: 'The Algorithm',
          line: 'Two people have played your demo. Both were you. One of you left.' },
        { pose: 'crouch_0', prop: 'terminal', effect: 'TEST RUN', speaker: 'Augustus',
          line: 'I sent it to a mate. He said he’d been pressing Jump for a full minute.' },
        { pose: 'jump_1', prop: 'bulb', effect: 'FEEDBACK IN', speaker: 'Augustus', burst: true,
          line: 'I’d sent him a screenshot. I’ve put him down as a beta tester anyway.' }
      ]
    },
    {
      title: 'The send button',
      backdrop: 'interview-hq',
      beats: [
        { art: 4, effect: 'DRAFT SAVED', speaker: 'Augustus',
          line: 'Four worlds done. Now I’ve got to do the bit I started all this to avoid. Send the bloody email.' },
        { pose: 'idle_1', prop: 'briefcase', effect: 'SEND?', speaker: 'Augustus',
          line: 'While it’s still a draft, I can imagine them liking it.' },
        { pose: 'dash_1', prop: 'plane_1', effect: 'SEND.', speaker: 'Augustus', burst: true,
          line: 'Right. Send it before I add the sea back in.' }
      ]
    },
    {
      title: 'You’re up',
      backdrop: 'interview-hq',
      beats: [
        { art: 5, effect: 'KNOCK KNOCK', speaker: 'Interview host',
          line: 'Page One of Two? Come in. We called your references. One of them said your jump’s a bit floaty.' },
        { pose: 'victory_1', prop: 'envelope_0', effect: 'REFERENCE CHECK', speaker: 'Augustus',
          line: 'That’ll be my mum. She thinks a double jump is showing off.' }
      ]
    }
  ];
})(globalThis.Hired = globalThis.Hired || {});

/*
 * BRIDGET demo content.
 * In the full product this comes from the database / CMS. Adding a new game
 * is just adding a new object here (later: a new row in the Experiences table).
 * Text inside [[double brackets]] is rendered as a redaction bar.
 */
window.BRIDGET_DATA = {
  experiences: [
    {
      id: 'monsoon-cipher',
      code: 'EXP-01',
      title: 'The Monsoon Cipher',
      tagline: "A city-wide hunt through Panaji's old quarters. Something was hidden. Someone wants it found.",
      format: 'Treasure hunt · City',
      location: 'Panaji, North Goa',
      date: '2027-01-16',
      time: '3:00 PM',
      duration: '5–6 hours',
      teamMin: 2, teamMax: 4,
      price: 1499,
      seats: 40, seatsLeft: 11,
      status: 'open',
      difficulty: 3,
      briefing: [
        'In the monsoon of [[nineteen sixty]], a letter was posted from Panaji. It never arrived.',
        'Its envelope has surfaced. The letter has not. The stamp points to [[a street you have walked down]].',
        'You will need sharp eyes, comfortable shoes, and a team that talks to each other.'
      ],
      canTell: ['It takes place on foot, outdoors and indoors', 'No prior experience needed', 'Smartphone required (one per team)', 'Ends with a reveal you will not forget'],
      cantTell: ['Where it begins', 'Who you will meet', 'What you are looking for', 'How it ends']
    },
    {
      id: 'tideline-protocol',
      code: 'EXP-02',
      title: 'Tideline Protocol',
      tagline: 'Six coordinates. One tide table. The sea decides how long you have.',
      format: 'Adventure · Coastal',
      location: 'South Goa coastline',
      date: '2027-02-13',
      time: '6:30 AM',
      duration: 'Full day',
      teamMin: 3, teamMax: 5,
      price: 2199,
      seats: 24, seatsLeft: 18,
      status: 'open',
      difficulty: 4,
      briefing: [
        'A research buoy went silent off [[the southern headland]] last season.',
        'Its final transmission was six coordinates and the words [[do not wait for low tide]].',
        'Expect sand, water, heat and a clock you cannot pause.'
      ],
      canTell: ['Physically active, moderate fitness needed', 'Swimming is not required', 'Breakfast and lunch provided', 'Transport from Margao included'],
      cantTell: ['The six coordinates', 'What the buoy was measuring', 'Who else is looking']
    },
    {
      id: 'the-last-ferry',
      code: 'EXP-03',
      title: 'The Last Ferry',
      tagline: 'A night-time mystery on the Mandovi. Everyone on board is hiding something. Including you.',
      format: 'Mystery · Night',
      location: 'Mandovi riverfront',
      date: '2027-03-20',
      time: '8:00 PM',
      duration: '4 hours',
      teamMin: 1, teamMax: 2,
      price: 1799,
      seats: 30, seatsLeft: 30,
      status: 'soon',
      difficulty: 3,
      briefing: [
        'Thirty passengers. One crossing. The ferry leaves at [[a time printed on your ticket]].',
        'You will be given a name that is not yours, and a secret that is.'
      ],
      canTell: ['Role-play mystery, dress code applies', 'Solo players welcome', 'Dinner included'],
      cantTell: ['Your character', 'The crime', 'Whether there is one']
    },
    {
      id: 'sealed-04',
      code: 'EXP-04',
      title: 'Untitled',
      tagline: "We can't tell you anything yet. Not even the name.",
      format: '[[Classified]]',
      location: '[[Classified]]',
      date: null,
      dateLabel: 'Monsoon 2027',
      time: '',
      duration: '[[??]]',
      teamMin: 2, teamMax: 6,
      price: 0,
      seats: 0, seatsLeft: 0,
      status: 'sealed',
      difficulty: 5,
      briefing: ['[[This file is sealed.]]', 'Watch the announcements.'],
      canTell: ['It is the biggest thing we have built'],
      cantTell: ['Everything else']
    }
  ],

  announcements: [
    { id: 'a1', date: '2026-11-20', tag: 'Limited seats', pinned: true,
      title: 'Only 11 seats left for The Monsoon Cipher',
      body: 'Selection for EXP-01 runs every Friday. Applications close once the last seat is confirmed.' },
    { id: 'a2', date: '2026-11-14', tag: 'Applications open',
      title: 'Applications are open for Tideline Protocol',
      body: 'Our first coastal adventure. Teams of 3 to 5. Moderate fitness required.' },
    { id: 'a3', date: '2026-11-07', tag: 'Notice',
      title: 'How selection works',
      body: 'We review every application by hand. Selected players get 48 hours to confirm their seat with payment before it goes to the waitlist.' },
    { id: 'a4', date: '2026-11-01', tag: 'Coming soon',
      title: 'The Last Ferry: applications open in January',
      body: 'A night mystery on the river. Solo players welcome. Join to be notified first.' },
    { id: 'a5', date: '2026-10-21', tag: 'Launch',
      title: 'BRIDGET is coming to Goa',
      body: 'Real places, real people, real puzzles. Season One begins January 2027.' }
  ],

  /* Set youtubeId on any item to embed the real video. */
  media: [
    { id: 'm1', cat: 'adventure', title: 'Trailer: Season One', duration: '1:12', date: '2026-12', hue: 38, youtubeId: null },
    { id: 'm2', cat: 'highlight', title: 'Playtest night: what we learned', duration: '8:40', date: '2026-12', hue: 175, youtubeId: null },
    { id: 'm3', cat: 'adventure', title: 'Scouting the Tideline route', duration: '12:05', date: '2027-01', hue: 200, youtubeId: null },
    { id: 'm4', cat: 'coverage', title: 'Behind the build: making a city into a game board', duration: '15:22', date: '2027-01', hue: 18, youtubeId: null },
    { id: 'm5', cat: 'highlight', title: 'The Monsoon Cipher: highlights', duration: '6:30', date: '2027-01', hue: 280, youtubeId: null },
    { id: 'm6', cat: 'coverage', title: 'Press & community: launch night', duration: '4:48', date: '2027-01', hue: 140, youtubeId: null }
  ]
};

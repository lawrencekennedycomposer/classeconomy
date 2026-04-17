export default {
  stage: { key: 'year7', label: 'Year 7' },
  unit: {
    key: 'time',
    label: 'Time'
  },
  focus: {
    key: 'time-units-basic',
    label: 'Units of time'
  },
  d: {
    1: [
      { q: '1 h = ? min', a: '60' },
      { q: '2 h = ? min', a: '120' },
      { q: '30 min = ? h', a: '1/2' },
      { q: '15 min = ? h', a: '1/4' },
      { q: '1 min = ? s', a: '60' },
      { q: '2 min = ? s', a: '120' },
      { q: '1 day = ? h', a: '24' },
      { q: '1 week = ? days', a: '7' }
    ],
    2: [
      { q: '3 h = ? min', a: '180' },
      { q: '4 h = ? min', a: '240' },
      { q: '90 min = ? h', a: '1 1/2' },
      { q: '45 min = ? h', a: '3/4' },
      { q: '5 min = ? s', a: '300' },
      { q: '10 min = ? s', a: '600' },
      { q: '2 days = ? h', a: '48' },
      { q: '3 weeks = ? days', a: '21' }
    ],
    3: [
      { q: '6 h = ? min', a: '360' },
      { q: '12 h = ? min', a: '720' },
      { q: '150 min = ? h', a: '2 1/2' },
      { q: '75 min = ? h', a: '1 1/4' },
      { q: '20 min = ? s', a: '1200' },
      { q: '7 days = ? h', a: '168' },
      { q: '2 fortnights = ? weeks', a: '4' },
      { q: '24 months = ? years', a: '2' }
    ]
  }
};
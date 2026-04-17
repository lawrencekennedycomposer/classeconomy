export default {
  stage: { key: 'year7', label: 'Year 7' },
  unit: {
    key: 'time',
    label: 'Time'
  },
  focus: {
    key: 'minutes-to-hours',
    label: 'Minutes to hours'
  },
  d: {
    1: [
      { q: '30 min = ? h', a: '1/2 h' },
      { q: '15 min = ? h', a: '1/4 h' },
      { q: '45 min = ? h', a: '3/4 h' },
      { q: '60 min = ? h', a: '1 h' },
      { q: '120 min = ? h', a: '2 h' },
      { q: '90 min = ? h', a: '1 1/2 h' },
      { q: '180 min = ? h', a: '3 h' },
      { q: '240 min = ? h', a: '4 h' }
    ],
    2: [
      { q: '75 min = ? h', a: '1 1/4 h' },
      { q: '105 min = ? h', a: '1 3/4 h' },
      { q: '150 min = ? h', a: '2 1/2 h' },
      { q: '210 min = ? h', a: '3 1/2 h' },
      { q: '2 h = ? min', a: '120' },
      { q: '3 h = ? min', a: '180' },
      { q: '1 1/2 h = ? min', a: '90' },
      { q: '2 1/4 h = ? min', a: '135' }
    ],
    3: [
      { q: '135 min = ? h', a: '2 1/4 h' },
      { q: '165 min = ? h', a: '2 3/4 h' },
      { q: '270 min = ? h', a: '4 1/2 h' },
      { q: '300 min = ? h', a: '5 h' },
      { q: '3 1/4 h = ? min', a: '195' },
      { q: '4 1/2 h = ? min', a: '270' },
      { q: '5 1/4 h = ? min', a: '315' },
      { q: '6 1/2 h = ? min', a: '390' }
    ]
  }
};
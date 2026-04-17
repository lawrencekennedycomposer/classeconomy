export default {
  stage: { key: 'year8', label: 'Year 8' },
  unit: {
    key: 'measurement',
    label: 'Measurement'
  },
  focus: {
    key: 'units-of-time',
    label: 'Units of time'
  },
  d: {
    1: [
      { q: '60 s = ? min', a: '1 min' },
      { q: '120 s = ? min', a: '2 min' },
      { q: '180 s = ? min', a: '3 min' },
      { q: '300 s = ? min', a: '5 min' },
      { q: '2 min = ? s', a: '120 s' },
      { q: '4 min = ? s', a: '240 s' },
      { q: '5 min = ? s', a: '300 s' },
      { q: '10 min = ? s', a: '600 s' }
    ],
    2: [
      { q: '90 s = ? min', a: '1.5 min' },
      { q: '150 s = ? min', a: '2.5 min' },
      { q: '210 s = ? min', a: '3.5 min' },
      { q: '75 s = ? min', a: '1.25 min' },
      { q: '1.5 min = ? s', a: '90 s' },
      { q: '2.5 min = ? s', a: '150 s' },
      { q: '3.5 min = ? s', a: '210 s' },
      { q: '1.25 min = ? s', a: '75 s' }
    ],
    3: [
      { q: '1 h = ? min', a: '60 min' },
      { q: '2 h = ? min', a: '120 min' },
      { q: '1.5 h = ? min', a: '90 min' },
      { q: '2.5 h = ? min', a: '150 min' },
      { q: '90 min = ? h', a: '1.5 h' },
      { q: '150 min = ? h', a: '2.5 h' },
      { q: '45 min = ? h', a: '0.75 h' },
      { q: '30 min = ? h', a: '0.5 h' }
    ]
  }
};
export default {
  stage: { key: 'year10', label: 'Year 10' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'mode-basic',
    label: 'Mode basic'
  },
  d: {
    1: [
      { q: '2, 2, 3 → mode', a: '2' },
      { q: '4, 5, 5 → mode', a: '5' },
      { q: '6, 7, 7 → mode', a: '7' },
      { q: '3, 3, 4 → mode', a: '3' },
      { q: '8, 9, 9 → mode', a: '9' },
      { q: '1, 1, 2 → mode', a: '1' },
      { q: '5, 6, 6 → mode', a: '6' },
      { q: '7, 8, 8 → mode', a: '8' }
    ],
    2: [
      { q: '2, 2, 3, 3, 3 → mode', a: '3' },
      { q: '4, 5, 5, 6, 6, 6 → mode', a: '6' },
      { q: '7, 7, 8, 8, 8 → mode', a: '8' },
      { q: '3, 3, 4, 4, 4, 5 → mode', a: '4' },
      { q: '8, 9, 9, 9, 10 → mode', a: '9' },
      { q: '1, 1, 2, 2, 2 → mode', a: '2' },
      { q: '5, 5, 6, 6, 6, 7 → mode', a: '6' },
      { q: '7, 7, 8, 8, 8, 9 → mode', a: '8' }
    ],
    3: [
      { q: '2, 3, 3, 4, 4 → mode', a: '3 & 4' },
      { q: '5, 5, 6, 6, 7 → mode', a: '5 & 6' },
      { q: '7, 8, 8, 9, 9 → mode', a: '8 & 9' },
      { q: '3, 4, 4, 5, 5 → mode', a: '4 & 5' },
      { q: '6, 6, 7, 7, 8 → mode', a: '6 & 7' },
      { q: '1, 2, 2, 3, 3 → mode', a: '2 & 3' },
      { q: '4, 4, 5, 5, 6 → mode', a: '4 & 5' },
      { q: '8, 9, 9, 10, 10 → mode', a: '9 & 10' }
    ]
  }
};
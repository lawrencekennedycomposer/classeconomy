export default {
  stage: { key: 'year10', label: 'Year 10' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'median-basic',
    label: 'Median basic'
  },
  d: {
    1: [
      { q: '1, 2, 3 → median', a: '2' },
      { q: '2, 3, 4 → median', a: '3' },
      { q: '3, 4, 5 → median', a: '4' },
      { q: '4, 5, 6 → median', a: '5' },
      { q: '5, 6, 7 → median', a: '6' },
      { q: '6, 7, 8 → median', a: '7' },
      { q: '7, 8, 9 → median', a: '8' },
      { q: '8, 9, 10 → median', a: '9' }
    ],
    2: [
      { q: '1, 3, 5, 7 → median', a: '4' },
      { q: '2, 4, 6, 8 → median', a: '5' },
      { q: '3, 5, 7, 9 → median', a: '6' },
      { q: '4, 6, 8, 10 → median', a: '7' },
      { q: '5, 7, 9, 11 → median', a: '8' },
      { q: '6, 8, 10, 12 → median', a: '9' },
      { q: '2, 3, 4, 5 → median', a: '3.5' },
      { q: '3, 4, 5, 6 → median', a: '4.5' }
    ],
    3: [
      { q: '1, 4, 2, 3 → median', a: '2.5' },
      { q: '5, 2, 8, 6 → median', a: '5.5' },
      { q: '3, 7, 1, 9 → median', a: '5' },
      { q: '4, 10, 6, 8 → median', a: '7' },
      { q: '2, 9, 5, 7 → median', a: '6' },
      { q: '6, 1, 4, 3 → median', a: '3.5' },
      { q: '8, 2, 6, 4 → median', a: '5' },
      { q: '7, 3, 5, 1 → median', a: '4' }
    ]
  }
};
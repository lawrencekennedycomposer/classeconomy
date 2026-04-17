export default {
  stage: { key: 'year8', label: 'Year 8' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'ordered-stem-and-leaf',
    label: 'Ordered stem and leaf'
  },
  d: {
    1: [
      { q: '2 | 3 1 → ordered', a: '2 | 1 3' },
      { q: '4 | 7 5 → ordered', a: '4 | 5 7' },
      { q: '3 | 9 2 → ordered', a: '3 | 2 9' },
      { q: '5 | 8 4 → ordered', a: '5 | 4 8' },
      { q: '6 | 6 2 → ordered', a: '6 | 2 6' },
      { q: '7 | 3 1 → ordered', a: '7 | 1 3' },
      { q: '8 | 9 5 → ordered', a: '8 | 5 9' },
      { q: '9 | 4 2 → ordered', a: '9 | 2 4' }
    ],
    2: [
      { q: '2 | 3 1 4 → ordered', a: '2 | 1 3 4' },
      { q: '4 | 7 5 6 → ordered', a: '4 | 5 6 7' },
      { q: '3 | 9 2 8 → ordered', a: '3 | 2 8 9' },
      { q: '5 | 8 4 6 → ordered', a: '5 | 4 6 8' },
      { q: '6 | 6 2 5 → ordered', a: '6 | 2 5 6' },
      { q: '7 | 3 1 4 → ordered', a: '7 | 1 3 4' },
      { q: '8 | 9 5 7 → ordered', a: '8 | 5 7 9' },
      { q: '9 | 4 2 6 → ordered', a: '9 | 2 4 6' }
    ],
    3: [
      { q: '2 | 3 1, 3 | 4 2 → ordered', a: '2 | 1 3, 3 | 2 4' },
      { q: '4 | 7 5, 5 | 6 2 → ordered', a: '4 | 5 7, 5 | 2 6' },
      { q: '3 | 9 2, 4 | 8 7 → ordered', a: '3 | 2 9, 4 | 7 8' },
      { q: '5 | 8 4, 6 | 6 3 → ordered', a: '5 | 4 8, 6 | 3 6' },
      { q: '6 | 6 2, 7 | 5 1 → ordered', a: '6 | 2 6, 7 | 1 5' },
      { q: '7 | 3 1, 8 | 9 4 → ordered', a: '7 | 1 3, 8 | 4 9' },
      { q: '8 | 9 5, 9 | 7 2 → ordered', a: '8 | 5 9, 9 | 2 7' },
      { q: '9 | 4 2, 10 | 6 3 → ordered', a: '9 | 2 4, 10 | 3 6' }
    ]
  }
};
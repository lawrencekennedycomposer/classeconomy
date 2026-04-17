export default {
  stage: { key: 'year7', label: 'Year 7' },
  unit: {
    key: 'algebra',
    label: 'Algebra'
  },
  focus: {
    key: 'collect-like-terms-signed',
    label: 'Collect like terms signed'
  },
  d: {
    1: [
      { q: 'a + a - a', a: 'a' },
      { q: 'b + b - b', a: 'b' },
      { q: 'x + x - x', a: 'x' },
      { q: 'y + y - y', a: 'y' },
      { q: 'm + m - m', a: 'm' },
      { q: 'n + n - n', a: 'n' },
      { q: 'k + k - k', a: 'k' },
      { q: 'p + p - p', a: 'p' }
    ],
    2: [
      { q: '2a + a - a', a: '2a' },
      { q: '3b + b - b', a: '3b' },
      { q: '4x + x - x', a: '4x' },
      { q: '5y + y - y', a: '5y' },
      { q: '2m + m - 2m', a: 'm' },
      { q: '3n + n - 2n', a: '2n' },
      { q: '4k + k - 3k', a: '2k' },
      { q: '5p + p - 4p', a: '2p' }
    ],
    3: [
      { q: '2a - a + a', a: '2a' },
      { q: '3b - b + b', a: '3b' },
      { q: '4x - x + 2x', a: '5x' },
      { q: '5y - y + 2y', a: '6y' },
      { q: '2m - 3m + m', a: '0' },
      { q: '3n - 2n + n', a: '2n' },
      { q: '4k - 2k + k', a: '3k' },
      { q: '5p - 3p + p', a: '3p' }
    ]
  }
};
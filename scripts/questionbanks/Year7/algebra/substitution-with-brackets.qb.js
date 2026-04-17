export default {
  stage: { key: 'year7', label: 'Year 7' },
  unit: {
    key: 'algebra',
    label: 'Algebra'
  },
  focus: {
    key: 'substitution-with-brackets',
    label: 'Substitution with brackets'
  },
  d: {
    1: [
      { q: 'm = 2, f = 3, m + f', a: '5' },
      { q: 'm = 2, f = 3, m - f', a: '-1' },
      { q: 'm = 3, f = 2, m + f', a: '5' },
      { q: 'm = 3, f = 2, m - f', a: '1' },
      { q: 'm = 4, f = 2, m + f', a: '6' },
      { q: 'm = 4, f = 2, m - f', a: '2' },
      { q: 'm = 4, f = 3, m + f', a: '7' },
      { q: 'm = 4, f = 3, m - f', a: '1' }
    ],
    2: [
      { q: 'm = 2, f = 3, 2(m + f)', a: '10' },
      { q: 'm = 2, f = 3, 3(m - f)', a: '-3' },
      { q: 'm = 3, f = 2, 2(m + f)', a: '10' },
      { q: 'm = 3, f = 2, 3(m - f)', a: '3' },
      { q: 'm = 4, f = 2, 2(m + f)', a: '12' },
      { q: 'm = 4, f = 2, 3(m - f)', a: '6' },
      { q: 'm = 4, f = 3, 2(m - f)', a: '2' },
      { q: 'm = 4, f = 3, 3(m + f)', a: '21' }
    ],
    3: [
      { q: 'm = 2, f = 3, m(m - 2f)', a: '-8' },
      { q: 'm = 2, f = 3, f(m - 3)', a: '-3' },
      { q: 'm = 3, f = 2, m(m - f)', a: '3' },
      { q: 'm = 3, f = 2, f(m - 2)', a: '2' },
      { q: 'm = 4, f = 2, m(m - f)', a: '8' },
      { q: 'm = 4, f = 2, f(m + 1)', a: '10' },
      { q: 'm = 4, f = 3, m - 2f', a: '-2' },
      { q: 'm = 4, f = 3, f + (m - 3)', a: '4' }
    ]
  }
};
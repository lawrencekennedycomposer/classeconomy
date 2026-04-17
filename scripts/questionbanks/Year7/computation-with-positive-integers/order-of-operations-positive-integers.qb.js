export default {
  stage: { key: 'year7', label: 'Year 7' },
  unit: {
    key: 'computation-with-positive-integers',
    label: 'Computation with positive integers'
  },
  focus: {
    key: 'order-of-operations-positive-integers',
    label: 'Order of operations with positive integers'
  },
  d: {
    1: [
      { q: '3 + 4 × 5', a: '23' },
      { q: '6 + 2 × 7', a: '20' },
      { q: '8 × 3 + 5', a: '29' },
      { q: '9 × 2 + 6', a: '24' },
      { q: '20 - 4 × 3', a: '8' },
      { q: '18 - 5 × 2', a: '8' },
      { q: '12 + 6 ÷ 3', a: '14' },
      { q: '15 + 8 ÷ 4', a: '17' }
    ],
    2: [
      { q: '(3 + 4) × 5', a: '35' },
      { q: '(6 + 2) × 7', a: '56' },
      { q: '8 × (3 + 5)', a: '64' },
      { q: '9 × (2 + 6)', a: '72' },
      { q: '(20 - 4) × 3', a: '48' },
      { q: '(18 - 5) × 2', a: '26' },
      { q: '(12 + 6) ÷ 3', a: '6' },
      { q: '(15 + 8) ÷ 4', a: '23/4' }
    ],
    3: [
      { q: '3 + 4 × 5²', a: '103' },
      { q: '(6 + 2 × 3) × 5', a: '60' },
      { q: '8 × (3 + 5 × 2)', a: '104' },
      { q: '9 × (2 + 6 × 3)', a: '180' },
      { q: '20 - 4 × 3²', a: '-16' },
      { q: '(18 - 5 × 2) × 4', a: '32' },
      { q: '(12 + 6 × 2) ÷ 3', a: '8' },
      { q: '(15 + 8 × 4) ÷ 2', a: '23' }
    ]
  }
};
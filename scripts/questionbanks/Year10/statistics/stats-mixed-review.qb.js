export default {
  stage: { key: 'year10', label: 'Year 10' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'statistics-mixed-review',
    label: 'Statistics review'
  },
  d: {
    1: [
      { q: 'eye colour → ?', a: 'categorical' },
      { q: '2, 4 → mean', a: '3' },
      { q: '1, 2, 3 → median', a: '2' },
      { q: '2, 2, 3 → mode', a: '2' },
      { q: '2, 2, 3, 4 → freq of 2', a: '2' },
      { q: 'height → type', a: 'numerical' },
      { q: '6, 8 → mean', a: '7' },
      { q: '2, 3, 4 → median', a: '3' },

      { q: '4, 5, 5 → mode', a: '5' },
      { q: '1, 1, 1, 2 → freq of 1', a: '3' },
      { q: 'age → ?', a: 'numerical' },
      { q: '3, 5 → mean', a: '4' },
      { q: '3, 4, 5 → median', a: '4' },
      { q: '6, 7, 7 → mode', a: '7' },
      { q: '5, 6, 6, 7 → freq of 6', a: '2' },
      { q: 'shirt colour → ?', a: 'categorical' }
    ],

    2: [
      { q: '2, 4, 6 → mean', a: '4' },
      { q: '1, 3, 5, 7 → median', a: '4' },
      { q: '2, 2, 3, 3, 3 → mode', a: '3' },
      { q: '2, 2, 3, 4, 4 → most freq', a: '2 & 4' },
      { q: 'temperature → type', a: 'numerical' },
      { q: '3, 5, 7 → mean', a: '5' },
      { q: '2, 4, 6, 8 → median', a: '5' },
      { q: '5, 6, 6, 7, 7 → most freq', a: '6 & 7' },

      { q: 'movie genre → type', a: 'categorical' },
      { q: '4, 6, 8 → mean', a: '6' },
      { q: '3, 5, 7, 9 → median', a: '6' },
      { q: '3, 4, 4, 4, 5 → mode', a: '4' },
      { q: '7, 8, 8, 9, 9 → most freq', a: '8 & 9' },
      { q: 'distance → type', a: 'numerical' },
      { q: '2, 5, 8 → mean', a: '5' },
      { q: '2, 3, 4, 5 → median', a: '3.5' }
    ],

    3: [
      { q: 'height → continuous/discrete', a: 'continuous' },
      { q: '2, 3, 4, 5 → mean', a: '3.5' },
      { q: '1, 4, 2, 3 → median', a: '2.5' },
      { q: '2, 3, 3, 4, 4 → mode', a: '3 & 4' },
      { q: '1, 2, 2, 3, 3, 3 → freq of 3', a: '3' },
      { q: 'number of pets → discrete/continuous', a: 'discrete' },
      { q: '3, 4, 5, 6 → mean', a: '4.5' },
      { q: '5, 2, 8, 6 → median', a: '5.5' },

      { q: '5, 5, 6, 6, 7 → mode', a: '5 & 6' },
      { q: '4, 4, 5, 5, 5, 6 → freq of 5', a: '3' },
      { q: 'time → continuous/discrete', a: 'continuous' },
      { q: '1, 5, 5, 9 → mean', a: '5' },
      { q: '3, 7, 1, 9 → median', a: '5' },
      { q: '6, 6, 7, 7, 8 → mode', a: '6 & 7' },
      { q: '8, 8, 9, 9, 9, 9 → freq of 9', a: '4' },
      { q: 'number of goals → discrete/continuous', a: 'discrete' }
    ]
  }
};
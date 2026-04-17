export default {
  stage: { key: 'year10', label: 'Year 10' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'data-type',
    label: 'Data type'
  },
  d: {
    1: [
      { q: 'eye colour → ?', a: 'categorical' },
      { q: 'number of students → ?', a: 'numerical' },
      { q: 'favourite food → ?', a: 'categorical' },
      { q: 'height (cm) → ?', a: 'numerical' },
      { q: 'type of pet → ?', a: 'categorical' },
      { q: 'age (years) → ?', a: 'numerical' },
      { q: 'shirt colour → ?', a: 'categorical' },
      { q: 'number of cars → ?', a: 'numerical' }
    ],
    2: [
      { q: 'temperature → type', a: 'numerical' },
      { q: 'gender → type', a: 'categorical' },
      { q: 'test score → type', a: 'numerical' },
      { q: 'movie genre → type', a: 'categorical' },
      { q: 'distance → type', a: 'numerical' },
      { q: 'car brand → type', a: 'categorical' },
      { q: 'time taken → type', a: 'numerical' },
      { q: 'favourite sport → type', a: 'categorical' }
    ],
    3: [
      { q: 'height → discrete/continuous', a: 'continuous' },
      { q: 'number of siblings → discrete/continuous', a: 'discrete' },
      { q: 'weight → discrete/continuous', a: 'continuous' },
      { q: 'number of pets → discrete/continuous', a: 'discrete' },
      { q: 'time → discrete/continuous', a: 'continuous' },
      { q: 'shoe size → discrete/continuous', a: 'discrete' },
      { q: 'distance → discrete/continuous', a: 'continuous' },
      { q: 'number of goals → discrete/continuous', a: 'discrete' }
    ]
  }
};
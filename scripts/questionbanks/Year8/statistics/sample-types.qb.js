export default {
  stage: { key: 'year8', label: 'Year 8' },
  unit: {
    key: 'statistics',
    label: 'Statistics'
  },
  focus: {
    key: 'sample-types',
    label: 'Sample types'
  },
  d: {
    1: [
      { q: 'every 10th name', a: 'systematic' },
      { q: 'names from a hat', a: 'random' },
      { q: 'every 5th student', a: 'systematic' },
      { q: 'pick 20 at random', a: 'random' },
      { q: 'every 3rd person', a: 'systematic' },
      { q: 'shuffle and pick', a: 'random' },
      { q: 'every 2nd ticket', a: 'systematic' },
      { q: 'lottery style pick', a: 'random' }
    ],
    2: [
      { q: 'pick 5 from each class', a: 'stratified' },
      { q: 'pick equal boys & girls', a: 'stratified' },
      { q: 'sample by year group', a: 'stratified' },
      { q: 'pick from each team', a: 'stratified' },
      { q: 'every 20th phone number', a: 'systematic' },
      { q: 'random number generator', a: 'random' },
      { q: 'draw names blindly', a: 'random' },
      { q: 'every 4th entry', a: 'systematic' }
    ],
    3: [
      { q: 'survey friends only', a: 'biased' },
      { q: 'ask one class only', a: 'biased' },
      { q: 'survey lunch group', a: 'biased' },
      { q: 'pick volunteers', a: 'biased' },
      { q: 'only early arrivals', a: 'biased' },
      { q: 'only athletes', a: 'biased' },
      { q: 'only one gender', a: 'biased' },
      { q: 'only one suburb', a: 'biased' }
    ]
  }
};
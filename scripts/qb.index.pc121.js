/* =========================================================
   PC#121 – Question Bank Index / Library Merge Layer
   Purpose:
     - Merge focus-bank files into one runtime QB object
     - Provide one shared QB path for compatible activities
   Guardrails:
     - Activities must not read folders directly
     - Runtime shape:
       QB[stage].subs[unit].subs[focus].d[difficulty]
========================================================= */

// Quick Maths
import oneStepOperationsAdd from './questionbanks/quickmath/one-step-operations/one-step-operations-add.qb.js';
import oneStepOperationsSubtract from './questionbanks/quickmath/one-step-operations/one-step-operations-subtract.qb.js';
import oneStepOperationsMultiply from './questionbanks/quickmath/one-step-operations/one-step-operations-multiply.qb.js';
import oneStepOperationsDivide from './questionbanks/quickmath/one-step-operations/one-step-operations-divide.qb.js';

// Support
import literacyVocabulary from './questionbanks/Support/maths-trial/literacy-vocabulary.qb.js';
import mathsAlgebra from './questionbanks/Support/maths-trial/maths-algebra.qb.js';
import mathsNumber from './questionbanks/Support/maths-trial/maths-number.qb.js';
import oneStepEquationsAdd from './questionbanks/Support/maths-trial/one-step-equations-add.qb.js';
import oneStepEquationsDivide from './questionbanks/Support/maths-trial/one-step-equations-divide.qb.js';
import oneStepEquationsMultiply from './questionbanks/Support/maths-trial/one-step-equations-multiply.qb.js';
import oneStepEquationsSubtract from './questionbanks/Support/maths-trial/one-step-equations-subtract.qb.js';
import positiveNegativeIntegersSupport from './questionbanks/Support/maths-trial/positive-negative-integers.qb.js';

// Year 7 — Computation with positive integers
import addSubtractPositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/add-subtract-positive-integers.qb.js';
import algorithmsAddSubtract from './questionbanks/Year7/computation-with-positive-integers/algorithms-add-subtract.qb.js';
import multiplySmallPositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/multiply-small-positive-integers.qb.js';
import multiplyLargePositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/multiply-large-positive-integers.qb.js';
import dividePositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/divide-positive-integers.qb.js';
import estimatingRoundingPositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/estimating-rounding-positive-integers.qb.js';
import orderOfOperationsPositiveIntegers from './questionbanks/Year7/computation-with-positive-integers/order-of-operations-positive-integers.qb.js';

// Year 7 — Computation with positive and negative integers
import numberLineAndMagnitude from './questionbanks/Year7/computation-with-positive-and-negative-integers/number-line-and-magnitude.qb.js';
import additionOfIntegers from './questionbanks/Year7/computation-with-positive-and-negative-integers/addition-of-integers.qb.js';
import subtractionOfIntegers from './questionbanks/Year7/computation-with-positive-and-negative-integers/subtraction-of-integers.qb.js';
import multiplicationOfIntegers from './questionbanks/Year7/computation-with-positive-and-negative-integers/multiplication-of-integers.qb.js';
import divisionOfIntegers from './questionbanks/Year7/computation-with-positive-and-negative-integers/division-of-integers.qb.js';
import mixedOperationsBracketsIntegers from './questionbanks/Year7/computation-with-positive-and-negative-integers/mixed-operations-brackets-integers.qb.js';

// Year 7 — Number properties and patterns
import factorsHcf from './questionbanks/Year7/number-properties-and-patterns/factors-hcf.qb.js';
import multiplesLcm from './questionbanks/Year7/number-properties-and-patterns/multiples-lcm.qb.js';
import divisibility24510 from './questionbanks/Year7/number-properties-and-patterns/divisibility-2-4-5-10.qb.js';
import divisibility369 from './questionbanks/Year7/number-properties-and-patterns/divisibility-3-6-9.qb.js';
import indexedNumbers from './questionbanks/Year7/number-properties-and-patterns/indexed-numbers.qb.js';
import factorTrees from './questionbanks/Year7/number-properties-and-patterns/factor-trees.qb.js';
import numberPatterns from './questionbanks/Year7/number-properties-and-patterns/number-patterns.qb.js';

// Year 7 — Fractions and percentages
import fractionsOfShapes from './questionbanks/Year7/fractions-and-percentages/fractions-of-shapes.qb.js';
import comparingFractions from './questionbanks/Year7/fractions-and-percentages/comparing-fractions.qb.js';
import equivalentFractions from './questionbanks/Year7/fractions-and-percentages/equivalent-fractions.qb.js';
import simplifyingFractions from './questionbanks/Year7/fractions-and-percentages/simplifying-fractions.qb.js';
import mixedImproperConversion from './questionbanks/Year7/fractions-and-percentages/mixed-improper-conversion.qb.js';
import addSubtractFractionsSameDenominator from './questionbanks/Year7/fractions-and-percentages/add-subtract-fractions-same-denominator.qb.js';
import addSubtractFractionsDifferentDenominator from './questionbanks/Year7/fractions-and-percentages/add-subtract-fractions-different-denominator.qb.js';
import multiplyFractions from './questionbanks/Year7/fractions-and-percentages/multiply-fractions.qb.js';
import divideFractions from './questionbanks/Year7/fractions-and-percentages/divide-fractions.qb.js';
import fractionsToPercentages from './questionbanks/Year7/fractions-and-percentages/fractions-to-percentages.qb.js';
import percentagesToFractions from './questionbanks/Year7/fractions-and-percentages/percentages-to-fractions.qb.js';
import percentageOfQuantity from './questionbanks/Year7/fractions-and-percentages/percentage-of-quantity.qb.js';

// Year 7 — Decimals
import placeValueDecimals from './questionbanks/Year7/decimals/place-value-decimals.qb.js';
import comparingDecimals from './questionbanks/Year7/decimals/comparing-decimals.qb.js';
import decimalPlaceValue from './questionbanks/Year7/decimals/decimal-place-value.qb.js';
import roundingDecimals from './questionbanks/Year7/decimals/rounding-decimals.qb.js';
import addDecimals from './questionbanks/Year7/decimals/add-decimals.qb.js';
import subtractDecimals from './questionbanks/Year7/decimals/subtract-decimals.qb.js';
import multiplyDivideBy101001000 from './questionbanks/Year7/decimals/multiply-divide-by-10-100-1000.qb.js';
import decimalWordProblemsLight from './questionbanks/Year7/decimals/decimal-word-problems-light.qb.js';
import multiplyDecimals from './questionbanks/Year7/decimals/multiply-decimals.qb.js';
import divideDecimals from './questionbanks/Year7/decimals/divide-decimals.qb.js';
import fractionsToDecimals from './questionbanks/Year7/decimals/fractions-to-decimals.qb.js';
import percentagesToDecimals from './questionbanks/Year7/decimals/percentages-to-decimals.qb.js';
import decimalsToPercentages from './questionbanks/Year7/decimals/decimals-to-percentages.qb.js';


// Year 7 — Algebra
import collectLikeTermsBasic from './questionbanks/Year7/algebra/collect-like-terms-basic.qb.js';
import collectLikeTermsConstants from './questionbanks/Year7/algebra/collect-like-terms-constants.qb.js';
import collectLikeTermsSigned from './questionbanks/Year7/algebra/collect-like-terms-signed.qb.js';
import dividePronumerals from './questionbanks/Year7/algebra/divide-pronumerals.qb.js';
import expandBracketsBasic from './questionbanks/Year7/algebra/expand-brackets-basic.qb.js';
import formulaSubstitution from './questionbanks/Year7/algebra/formula-substitution.qb.js';
import interpretExpressions from './questionbanks/Year7/algebra/interpret-expressions.qb.js';
import multiplyPronumerals from './questionbanks/Year7/algebra/multiply-pronumerals.qb.js';
import patternTables from './questionbanks/Year7/algebra/pattern-tables.qb.js';
import substitutionBasic from './questionbanks/Year7/algebra/substitution-basic.qb.js';
import substitutionExtended from './questionbanks/Year7/algebra/substitution-extended.qb.js';
import substitutionWithBrackets from './questionbanks/Year7/algebra/substitution-with-brackets.qb.js';
import translateExpressions from './questionbanks/Year7/algebra/translate-expressions.qb.js';
import trueFalseEquations from './questionbanks/Year7/algebra/true-false-equations.qb.js';



// Year 7 — Time
import readingTime from './questionbanks/Year7/time/reading-time.qb.js';
import timeUnitsBasic from './questionbanks/Year7/time/time-units-basic.qb.js';
import timetableReading from './questionbanks/Year7/time/timetable-reading.qb.js';
import timeCalculationsAdd from './questionbanks/Year7/time/time-calculations-add.qb.js';
import timeCalculationsSubtract from './questionbanks/Year7/time/time-calculations-subtract.qb.js';
import minutesToHours from './questionbanks/Year7/time/minutes-to-hours.qb.js';
import regionalTime from './questionbanks/Year7/time/regional-time.qb.js';
import worldTime from './questionbanks/Year7/time/world-time.qb.js';

// Year 8 — Measurement
import areaRectangles from './questionbanks/Year8/measurement/area-rectangles.qb.js';
import areaTriangles from './questionbanks/Year8/measurement/area-triangles.qb.js';
import areaUnitConversions from './questionbanks/Year8/measurement/area-unit-conversions.qb.js';
import convertLength from './questionbanks/Year8/measurement/convert-length.qb.js';
import perimeterAdvanced from './questionbanks/Year8/measurement/perimeter-advanced.qb.js';
import perimeterBasic from './questionbanks/Year8/measurement/perimeter-basic.qb.js';
import pythagorasFindHypotenuse from './questionbanks/Year8/measurement/pythagoras-find-hypotenuse.qb.js';
import pythagorasIntro from './questionbanks/Year8/measurement/pythagoras-intro.qb.js';
import timeCalculationsMeasurement from './questionbanks/Year8/measurement/time-calculations.qb.js';
import unitsOfTimeMeasurement from './questionbanks/Year8/measurement/units-of-time.qb.js';

// Year 8 — Statistics
import categoricalVsNumericalY8 from './questionbanks/Year8/statistics/categorical-vs-numerical.qb.js';
import frequencyTablesY8 from './questionbanks/Year8/statistics/frequency-tables.qb.js';
import meanBasicY8 from './questionbanks/Year8/statistics/mean-basic.qb.js';
import medianBasicY8 from './questionbanks/Year8/statistics/median-basic.qb.js';
import medianPositionY8 from './questionbanks/Year8/statistics/median-position.qb.js';
import mixedStatisticsY8 from './questionbanks/Year8/statistics/mixed-statistics.qb.js';
import modeY8 from './questionbanks/Year8/statistics/mode.qb.js';
import orderedStemAndLeafY8 from './questionbanks/Year8/statistics/ordered-stem-and-leaf.qb.js';
import rangeY8 from './questionbanks/Year8/statistics/range.qb.js';
import sampleTypesY8 from './questionbanks/Year8/statistics/sample-types.qb.js';

// Year 9 — Expressions and inequalities
import algebraExpressionsWriteY9 from './questionbanks/Year9/expressions-and-inequalities/algebra-expressions-write.qb.js';
import algebraReviewY9 from './questionbanks/Year9/expressions-and-inequalities/algebra-review.qb.js';
import algebraSubstitutionBasicY9 from './questionbanks/Year9/expressions-and-inequalities/algebra-substitution-basic.qb.js';
import collectLikeTermsY9 from './questionbanks/Year9/expressions-and-inequalities/collect-like-terms.qb.js';
import divideTermsY9 from './questionbanks/Year9/expressions-and-inequalities/divide-terms.qb.js';
import equationsBothSidesY9 from './questionbanks/Year9/expressions-and-inequalities/equations-both-sides.qb.js';
import equationsExpandY9 from './questionbanks/Year9/expressions-and-inequalities/equations-expand.qb.js';
import equationsOneStepY9 from './questionbanks/Year9/expressions-and-inequalities/equations-one-step.qb.js';
import equationsTwoStepY9 from './questionbanks/Year9/expressions-and-inequalities/equations-two-step.qb.js';
import expandSingleBracketsY9 from './questionbanks/Year9/expressions-and-inequalities/expand-single-brackets.qb.js';
import inequalitiesAdvancedY9 from './questionbanks/Year9/expressions-and-inequalities/inequalities-advanced.qb.js';
import inequalitiesBasicY9 from './questionbanks/Year9/expressions-and-inequalities/inequalities-basic.qb.js';
import multiplyTermsY9 from './questionbanks/Year9/expressions-and-inequalities/multiply-terms.qb.js';

// Year 9 — Indices
import indexBasicsY9 from './questionbanks/Year9/indices/index-basics.qb.js';
import indexBracketsY9 from './questionbanks/Year9/indices/index-brackets.qb.js';
import indexLawsDivideY9 from './questionbanks/Year9/indices/index-laws-divide.qb.js';
import indexLawsMultiplyY9 from './questionbanks/Year9/indices/index-laws-multiply.qb.js';
import indexMixedY9 from './questionbanks/Year9/indices/index-mixed.qb.js';
import indexNegativeY9 from './questionbanks/Year9/indices/index-negative.qb.js';
import indexSubstitutionY9 from './questionbanks/Year9/indices/index-substitution.qb.js';
import indexToNumberY9 from './questionbanks/Year9/indices/index-to-number.qb.js';
import indexZeroIndexY9 from './questionbanks/Year9/indices/index-zero-index.qb.js';
import roundingSignificantFiguresY9 from './questionbanks/Year9/indices/rounding-significant-figures.qb.js';
import scientificNotationBasicsY9 from './questionbanks/Year9/indices/scientific-notation-basics.qb.js';
import scientificNotationConvertY9 from './questionbanks/Year9/indices/scientific-notation-convert.qb.js';
import significantFiguresY9 from './questionbanks/Year9/indices/significant-figures.qb.js';

// Year 9 — Linear relations
import equationFromRuleY9 from './questionbanks/Year9/linear-relations/equation-from-rule.qb.js';
import findRuleY9 from './questionbanks/Year9/linear-relations/find-rule.qb.js';
import gradientBasicY9 from './questionbanks/Year9/linear-relations/gradient-basic.qb.js';
import linearPatternsY9 from './questionbanks/Year9/linear-relations/linear-patterns.qb.js';
import linearRelationshipsMixedReviewY9 from './questionbanks/Year9/linear-relations/linear-relationships-mixed-review.qb.js';
import substituteLinearY9 from './questionbanks/Year9/linear-relations/substitute-linear.qb.js';
import yInterceptBasicY9 from './questionbanks/Year9/linear-relations/y-intercept-basic.qb.js';

// Year 10 — Trigonometry
import trigFindAngleBasicY10 from './questionbanks/year10/trigonometry/trig-find-angle-basic.qb.js';
import trigFindSideBasicY10 from './questionbanks/year10/trigonometry/trig-find-side-basic.qb.js';
import trigMixedReviewY10 from './questionbanks/year10/trigonometry/trig-mixed-review.qb.js';
import trigNamingSidesY10 from './questionbanks/year10/trigonometry/trig-naming-sides.qb.js';
import trigRatiosBasicY10 from './questionbanks/year10/trigonometry/trig-ratios-basic.qb.js';

// Year 10 — Statistics
import dataTypeY10 from './questionbanks/year10/statistics/data-type.qb.js';
import frequencyBasicY10 from './questionbanks/year10/statistics/frequency-basic.qb.js';
import meanBasicY10 from './questionbanks/year10/statistics/mean-basic.qb.js';
import medianBasicY10 from './questionbanks/year10/statistics/median-basic.qb.js';
import modeBasicY10 from './questionbanks/year10/statistics/mode-basic.qb.js';
import statsMixedReviewY10 from './questionbanks/year10/statistics/stats-mixed-review.qb.js';

// Year 10 — Geometrical Figures
import anglesAtAPointY10 from './questionbanks/year10/geometrical-figures/angles-at-a-point.qb.js';
import anglesInQuadrilateralsY10 from './questionbanks/year10/geometrical-figures/angles-in-quadrilaterals.qb.js';
import anglesInTrianglesY10 from './questionbanks/year10/geometrical-figures/angles-in-triangles.qb.js';
import congruencyBasicsY10 from './questionbanks/year10/geometrical-figures/congruency-basics.qb.js';
import geometricalFiguresMixedReviewY10 from './questionbanks/year10/geometrical-figures/geometrical-figures-mixed-review.qb.js';
import parallelLinesY10 from './questionbanks/year10/geometrical-figures/parallel-lines.qb.js';
import polygonInteriorAngleSumY10 from './questionbanks/year10/geometrical-figures/polygon-interior-angle-sum.qb.js';
import regularPolygonExteriorAngleY10 from './questionbanks/year10/geometrical-figures/regular-polygon-exterior-angle.qb.js';
import similarFiguresScaleFactorY10 from './questionbanks/year10/geometrical-figures/similar-figures-scale-factor.qb.js';
import similarTrianglesBasicsY10 from './questionbanks/year10/geometrical-figures/similar-triangles-basics.qb.js';
import supplementaryComplementaryY10 from './questionbanks/year10/geometrical-figures/supplementary-complementary.qb.js';
import verticallyOppositeAnglesY10 from './questionbanks/year10/geometrical-figures/vertically-opposite-angles.qb.js';

const FILES = [


  // Quick Maths
  oneStepOperationsAdd,
  oneStepOperationsSubtract,
  oneStepOperationsMultiply,
  oneStepOperationsDivide,

  addSubtractPositiveIntegers,
  algorithmsAddSubtract,
  multiplySmallPositiveIntegers,
  multiplyLargePositiveIntegers,
  dividePositiveIntegers,
  estimatingRoundingPositiveIntegers,
  orderOfOperationsPositiveIntegers,

  numberLineAndMagnitude,
  additionOfIntegers,
  subtractionOfIntegers,
  multiplicationOfIntegers,
  divisionOfIntegers,
  mixedOperationsBracketsIntegers,

  factorsHcf,
  multiplesLcm,
  divisibility24510,
  divisibility369,
  indexedNumbers,
  factorTrees,
  numberPatterns,

  fractionsOfShapes,
  comparingFractions,
  equivalentFractions,
  simplifyingFractions,
  mixedImproperConversion,
  addSubtractFractionsSameDenominator,
  addSubtractFractionsDifferentDenominator,
  multiplyFractions,
  divideFractions,
  fractionsToPercentages,
  percentagesToFractions,
  percentageOfQuantity,

  placeValueDecimals,
  comparingDecimals,
  decimalPlaceValue,
  roundingDecimals,
  addDecimals,
  subtractDecimals,
  multiplyDivideBy101001000,
  decimalWordProblemsLight,
  multiplyDecimals,
  divideDecimals,
  fractionsToDecimals,
  percentagesToDecimals,
  decimalsToPercentages,

  literacyVocabulary,
  mathsAlgebra,
  mathsNumber,
  oneStepEquationsAdd,
  oneStepEquationsDivide,
  oneStepEquationsMultiply,
  oneStepEquationsSubtract,
  positiveNegativeIntegersSupport,

  collectLikeTermsBasic,
  collectLikeTermsConstants,
  collectLikeTermsSigned,
  dividePronumerals,
  expandBracketsBasic,
  formulaSubstitution,
  interpretExpressions,
  multiplyPronumerals,
  patternTables,
  substitutionBasic,
  substitutionExtended,
  substitutionWithBrackets,
  translateExpressions,
  trueFalseEquations,

  readingTime,
  timeUnitsBasic,
  timetableReading,
  timeCalculationsAdd,
  timeCalculationsSubtract,
  minutesToHours,
  regionalTime,
  worldTime,

  areaRectangles,
  areaTriangles,
  areaUnitConversions,
  convertLength,
  perimeterAdvanced,
  perimeterBasic,
  pythagorasFindHypotenuse,
  pythagorasIntro,
  timeCalculationsMeasurement,
  unitsOfTimeMeasurement,

  categoricalVsNumericalY8,
  frequencyTablesY8,
  meanBasicY8,
  medianBasicY8,
  medianPositionY8,
  mixedStatisticsY8,
  modeY8,
  orderedStemAndLeafY8,
  rangeY8,
  sampleTypesY8,

  algebraExpressionsWriteY9,
  algebraReviewY9,
  algebraSubstitutionBasicY9,
  collectLikeTermsY9,
  divideTermsY9,
  equationsBothSidesY9,
  equationsExpandY9,
  equationsOneStepY9,
  equationsTwoStepY9,
  expandSingleBracketsY9,
  inequalitiesAdvancedY9,
  inequalitiesBasicY9,
  multiplyTermsY9,

  indexBasicsY9,
  indexBracketsY9,
  indexLawsDivideY9,
  indexLawsMultiplyY9,
  indexMixedY9,
  indexNegativeY9,
  indexSubstitutionY9,
  indexToNumberY9,
  indexZeroIndexY9,
  roundingSignificantFiguresY9,
  scientificNotationBasicsY9,
  scientificNotationConvertY9,
  significantFiguresY9,

  equationFromRuleY9,
  findRuleY9,
  gradientBasicY9,
  linearPatternsY9,
  linearRelationshipsMixedReviewY9,
  substituteLinearY9,
  yInterceptBasicY9,  


  trigFindAngleBasicY10,
  trigFindSideBasicY10,
  trigMixedReviewY10,
  trigNamingSidesY10,
  trigRatiosBasicY10,

  dataTypeY10,
  frequencyBasicY10,
  meanBasicY10,
  medianBasicY10,
  modeBasicY10,
  statsMixedReviewY10,

  anglesAtAPointY10,
  anglesInQuadrilateralsY10,
  anglesInTrianglesY10,
  congruencyBasicsY10,
  geometricalFiguresMixedReviewY10,
  parallelLinesY10,
  polygonInteriorAngleSumY10,
  regularPolygonExteriorAngleY10,
  similarFiguresScaleFactorY10,
  similarTrianglesBasicsY10,
  supplementaryComplementaryY10,
  verticallyOppositeAnglesY10,

 
];


function ensureD(d) {
  return {
    1: Array.isArray(d?.[1]) ? d[1] : [],
    2: Array.isArray(d?.[2]) ? d[2] : [],
    3: Array.isArray(d?.[3]) ? d[3] : []
  };
}

function buildQB(files) {
  const qb = {};

  for (const file of files) {
  if (!file?.stage?.key || !file?.unit?.key || !file?.focus?.key) {
    console.warn('[PC121] Invalid QB file skipped:', file);
    continue;
  }

    const stageKey = file.stage.key;
    const unitKey = file.unit.key;
    const focusKey = file.focus.key;

    if (!qb[stageKey]) {
      qb[stageKey] = {
        label: file.stage.label || stageKey,
        subs: {}
      };
    }

    if (!qb[stageKey].subs[unitKey]) {
      qb[stageKey].subs[unitKey] = {
        label: file.unit.label || unitKey,
        subs: {}
      };
    }

    qb[stageKey].subs[unitKey].subs[focusKey] = {
      label: file.focus.label || focusKey,
      d: ensureD(file.d)
    };
  }

  return qb;
}

export const QB = buildQB(FILES);

window.STW_QB = QB;
window.QM_QB = QB;

export default QB;
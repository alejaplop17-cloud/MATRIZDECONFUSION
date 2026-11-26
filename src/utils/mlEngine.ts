import {
  AlgorithmComparisonEntry,
  AlgorithmId,
  AlgorithmMeta,
  BinaryMetrics,
  ClassMetrics,
  ConfusionMatrixResult,
  DatasetInfo,
  PredictionRow,
  PreprocessingSummary,
  TrainConfig,
  TrainedModelResult,
} from '../types/ml';

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: 'logistic',
    name: 'Regresión Logística',
    shortName: 'Reg. Logística',
    description:
      'Calcula probabilidades mediante una función sigmoide (o One-vs-Rest en multiclase) combinando linealmente las variables.',
    strengths: 'Muy interpretable, rápida y produce probabilidades calibradas.',
  },
  {
    id: 'decision_tree',
    name: 'Árbol de Decisión (CART)',
    shortName: 'Árbol Decisión',
    description:
      'Divide los datos paso a paso buscando las reglas más puras según el índice de impureza Gini.',
    strengths: 'Captura relaciones no lineales y reglas claras tipo "si-entonces".',
  },
  {
    id: 'random_forest',
    name: 'Random Forest',
    shortName: 'Random Forest',
    description:
      'Entrena un bosque de 15 árboles de decisión con muestras bootstrap y subconjuntos aleatorios de variables.',
    strengths: 'Alta precisión y menor riesgo de sobreajuste que un árbol individual.',
  },
  {
    id: 'knn',
    name: 'K-Nearest Neighbors (KNN)',
    shortName: 'KNN (k=5)',
    description:
      'Clasifica cada registro nuevo observando las clases de sus 5 vecinos más cercanos en el espacio estandarizado.',
    strengths: 'No asume forma lineal; se adapta bien a fronteras locales.',
  },
  {
    id: 'naive_bayes',
    name: 'Naive Bayes Gaussiano',
    shortName: 'Naive Bayes',
    description:
      'Aplica el teorema de Bayes asumiendo independencia condicional entre variables usando distribuciones gaussianas.',
    strengths: 'Muy veloz, estable con muestras pequeñas y robusta ante ruido.',
  },
];

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface FittedPreprocessor {
  numericFeatures: string[];
  categoricalFeatures: string[];
  medians: Record<string, number>;
  means: Record<string, number>;
  stds: Record<string, number>;
  modes: Record<string, string>;
  categories: Record<string, string[]>;
  encodedFeatureCount: number;
  imputedTrainMissing: number;
  imputedTestMissing: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fitAndTransform(
  trainRows: Record<string, string | number | null>[],
  testRows: Record<string, string | number | null>[],
  featureColumns: string[],
  dataset: DatasetInfo
): {
  XTrain: number[][];
  XTest: number[][];
  summary: PreprocessingSummary;
} {
  const colMap = new Map(dataset.columns.map((c) => [c.name, c]));
  const numericFeatures: string[] = [];
  const categoricalFeatures: string[] = [];

  for (const colName of featureColumns) {
    const profile = colMap.get(colName);
    if (profile?.type === 'numeric') {
      numericFeatures.push(colName);
    } else {
      categoricalFeatures.push(colName);
    }
  }

  // Fit ONLY on trainRows (strictly avoiding data leakage)
  const medians: Record<string, number> = {};
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const col of numericFeatures) {
    const vals: number[] = [];
    for (const row of trainRows) {
      const v = row[col];
      if (typeof v === 'number' && Number.isFinite(v)) {
        vals.push(v);
      }
    }
    const med = median(vals);
    medians[col] = med;

    const imputed = trainRows.map((r) => {
      const v = r[col];
      return typeof v === 'number' && Number.isFinite(v) ? v : med;
    });
    const meanVal =
      imputed.reduce((acc, v) => acc + v, 0) / Math.max(1, imputed.length);
    const variance =
      imputed.reduce((acc, v) => acc + (v - meanVal) ** 2, 0) /
      Math.max(1, imputed.length);
    const stdVal = Math.sqrt(variance) || 1;
    means[col] = meanVal;
    stds[col] = stdVal;
  }

  const modes: Record<string, string> = {};
  const categories: Record<string, string[]> = {};
  for (const col of categoricalFeatures) {
    const counts: Record<string, number> = {};
    for (const row of trainRows) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const k = String(v);
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    modes[col] = sortedCats[0]?.[0] ?? 'Desconocido';
    // Cap one-hot categories at 12 most frequent to keep training fast and clean
    categories[col] = sortedCats.slice(0, 12).map(([k]) => k);
  }

  let imputedTrainMissing = 0;
  let imputedTestMissing = 0;

  const transformRow = (
    row: Record<string, string | number | null>,
    isTrain: boolean
  ): number[] => {
    const vec: number[] = [];
    for (const col of numericFeatures) {
      const raw = row[col];
      let val: number;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        val = raw;
      } else {
        val = medians[col];
        if (isTrain) imputedTrainMissing++;
        else imputedTestMissing++;
      }
      vec.push((val - means[col]) / stds[col]);
    }
    for (const col of categoricalFeatures) {
      const raw = row[col];
      let strVal: string;
      if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        strVal = String(raw);
      } else {
        strVal = modes[col];
        if (isTrain) imputedTrainMissing++;
        else imputedTestMissing++;
      }
      for (const cat of categories[col]) {
        vec.push(strVal === cat ? 1 : 0);
      }
    }
    return vec;
  };

  const XTrain = trainRows.map((r) => transformRow(r, true));
  const XTest = testRows.map((r) => transformRow(r, false));
  const encodedFeatureCount = XTrain[0]?.length ?? 0;

  const prep: FittedPreprocessor = {
    numericFeatures,
    categoricalFeatures,
    medians,
    means,
    stds,
    modes,
    categories,
    encodedFeatureCount,
    imputedTrainMissing,
    imputedTestMissing,
  };

  const notes: string[] = [
    `Ajuste estricto en entrenamiento (${trainRows.length} filas) antes de transformar prueba (${testRows.length} filas).`,
  ];
  if (numericFeatures.length > 0) {
    notes.push(
      `${numericFeatures.length} variable(s) numérica(s): imputación por mediana y estandarización Z-score.`
    );
  }
  if (categoricalFeatures.length > 0) {
    notes.push(
      `${categoricalFeatures.length} variable(s) categórica(s): imputación por moda y codificación One-Hot.`
    );
  }
  if (imputedTrainMissing + imputedTestMissing > 0) {
    notes.push(
      `Se imputaron ${prep.imputedTrainMissing} valores faltantes en entrenamiento y ${prep.imputedTestMissing} en prueba.`
    );
  }

  return {
    XTrain,
    XTest,
    summary: {
      trainCount: trainRows.length,
      testCount: testRows.length,
      numericFeatures,
      categoricalFeatures,
      encodedFeatureCount,
      imputedTrainMissing: prep.imputedTrainMissing,
      imputedTestMissing: prep.imputedTestMissing,
      notes,
    },
  };
}

// ==========================================
// Classification Algorithms
// ==========================================

function sigmoid(z: number): number {
  const clamped = Math.max(-30, Math.min(30, z));
  return 1 / (1 + Math.exp(-clamped));
}

function trainBinaryLogistic(
  X: number[][],
  yBinary: number[],
  lr = 0.15,
  epochs = 260,
  l2 = 0.01
): { weights: number[]; bias: number } {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  const weights = new Array(d).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      let z = bias;
      const row = X[i];
      for (let j = 0; j < d; j++) {
        z += weights[j] * row[j];
      }
      const p = sigmoid(z);
      const err = p - yBinary[i];
      gradB += err;
      for (let j = 0; j < d; j++) {
        gradW[j] += err * row[j];
      }
    }

    bias -= lr * (gradB / n);
    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }
  }
  return { weights, bias };
}

function predictLogisticProbabilities(
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number
): number[][] {
  if (numClasses === 2) {
    const { weights, bias } = trainBinaryLogistic(XTrain, yTrainIdx);
    return XTest.map((row) => {
      let z = bias;
      for (let j = 0; j < weights.length; j++) z += weights[j] * row[j];
      const p1 = sigmoid(z);
      return [1 - p1, p1];
    });
  }

  // One-vs-Rest multiclass logistic regression
  const models = Array.from({ length: numClasses }, (_, cIdx) =>
    trainBinaryLogistic(
      XTrain,
      yTrainIdx.map((y) => (y === cIdx ? 1 : 0))
    )
  );

  return XTest.map((row) => {
    const rawProbs = models.map(({ weights, bias }) => {
      let z = bias;
      for (let j = 0; j < weights.length; j++) z += weights[j] * row[j];
      return sigmoid(z);
    });
    const sum = rawProbs.reduce((a, b) => a + b, 0) || 1;
    return rawProbs.map((p) => p / sum);
  });
}

// Decision Tree (CART)
interface TreeNode {
  isLeaf: boolean;
  classProbs: number[];
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function giniFromCounts(counts: number[], total: number): number {
  if (total === 0) return 0;
  let sumSq = 0;
  for (const c of counts) {
    const p = c / total;
    sumSq += p * p;
  }
  return 1 - sumSq;
}

function buildCartTree(
  X: number[][],
  y: number[],
  indices: number[],
  numClasses: number,
  depth: number,
  maxDepth: number,
  minSamplesSplit: number,
  maxFeaturesPerSplit: number | null,
  rand: () => number
): TreeNode {
  const counts = new Array(numClasses).fill(0);
  for (const idx of indices) counts[y[idx]]++;
  const total = indices.length;
  const classProbs = counts.map((c) => c / Math.max(1, total));

  const parentGini = giniFromCounts(counts, total);
  if (depth >= maxDepth || total < minSamplesSplit || parentGini < 1e-6) {
    return { isLeaf: true, classProbs };
  }

  const numFeatures = X[0]?.length ?? 0;
  let candidateFeatures = Array.from({ length: numFeatures }, (_, i) => i);
  if (maxFeaturesPerSplit && maxFeaturesPerSplit < numFeatures) {
    shuffleInPlace(candidateFeatures, rand);
    candidateFeatures = candidateFeatures.slice(0, maxFeaturesPerSplit);
  }

  let bestGain = 0;
  let bestFeature = -1;
  let bestThresh = 0;
  let bestLeft: number[] = [];
  let bestRight: number[] = [];

  for (const fIdx of candidateFeatures) {
    // Sort indices by feature value
    const sorted = [...indices].sort((a, b) => X[a][fIdx] - X[b][fIdx]);
    const leftCounts = new Array(numClasses).fill(0);
    const rightCounts = [...counts];
    let leftTotal = 0;
    let rightTotal = total;

    // Evaluate up to ~25 quantile/midpoint thresholds for speed on large datasets
    const step = Math.max(1, Math.floor(sorted.length / 25));

    for (let i = 0; i < sorted.length - 1; i++) {
      const idx = sorted[i];
      const cls = y[idx];
      leftCounts[cls]++;
      rightCounts[cls]--;
      leftTotal++;
      rightTotal--;

      const valA = X[idx][fIdx];
      const valB = X[sorted[i + 1]][fIdx];
      if (valA === valB) continue;
      if (i % step !== 0 && sorted.length > 35) continue;

      const giniL = giniFromCounts(leftCounts, leftTotal);
      const giniR = giniFromCounts(rightCounts, rightTotal);
      const weightedGini =
        (leftTotal / total) * giniL + (rightTotal / total) * giniR;
      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = fIdx;
        bestThresh = (valA + valB) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-6) {
    return { isLeaf: true, classProbs };
  }

  bestLeft = [];
  bestRight = [];
  for (const idx of indices) {
    if (X[idx][bestFeature] <= bestThresh) bestLeft.push(idx);
    else bestRight.push(idx);
  }

  if (bestLeft.length === 0 || bestRight.length === 0) {
    return { isLeaf: true, classProbs };
  }

  return {
    isLeaf: false,
    classProbs,
    featureIdx: bestFeature,
    threshold: bestThresh,
    left: buildCartTree(
      X,
      y,
      bestLeft,
      numClasses,
      depth + 1,
      maxDepth,
      minSamplesSplit,
      maxFeaturesPerSplit,
      rand
    ),
    right: buildCartTree(
      X,
      y,
      bestRight,
      numClasses,
      depth + 1,
      maxDepth,
      minSamplesSplit,
      maxFeaturesPerSplit,
      rand
    ),
  };
}

function predictTreeRow(node: TreeNode, row: number[]): number[] {
  let curr = node;
  while (!curr.isLeaf && curr.featureIdx !== undefined && curr.threshold !== undefined) {
    if (row[curr.featureIdx] <= curr.threshold) {
      curr = curr.left!;
    } else {
      curr = curr.right!;
    }
  }
  return curr.classProbs;
}

function predictDecisionTreeProbabilities(
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number,
  rand: () => number
): number[][] {
  const allIndices = XTrain.map((_, i) => i);
  const tree = buildCartTree(
    XTrain,
    yTrainIdx,
    allIndices,
    numClasses,
    0,
    5,
    4,
    null,
    rand
  );
  return XTest.map((row) => predictTreeRow(tree, row));
}

function predictRandomForestProbabilities(
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number,
  rand: () => number
): number[][] {
  const n = XTrain.length;
  const numFeatures = XTrain[0]?.length ?? 1;
  const maxFeat = Math.max(1, Math.round(Math.sqrt(numFeatures)));
  const nTrees = 15;
  const trees: TreeNode[] = [];

  for (let t = 0; t < nTrees; t++) {
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(rand() * n));
    }
    trees.push(
      buildCartTree(
        XTrain,
        yTrainIdx,
        bootIndices,
        numClasses,
        0,
        6,
        3,
        maxFeat,
        rand
      )
    );
  }

  return XTest.map((row) => {
    const avgProbs = new Array(numClasses).fill(0);
    for (const tree of trees) {
      const p = predictTreeRow(tree, row);
      for (let c = 0; c < numClasses; c++) {
        avgProbs[c] += p[c] / nTrees;
      }
    }
    return avgProbs;
  });
}

function predictKnnProbabilities(
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number,
  k = 5
): number[][] {
  const effK = Math.min(k, Math.max(1, XTrain.length));
  return XTest.map((testRow) => {
    const dists = XTrain.map((trainRow, idx) => {
      let sq = 0;
      for (let j = 0; j < testRow.length; j++) {
        const diff = testRow[j] - trainRow[j];
        sq += diff * diff;
      }
      return { dist: Math.sqrt(sq), label: yTrainIdx[idx] };
    });
    dists.sort((a, b) => a.dist - b.dist);
    const neighbors = dists.slice(0, effK);
    const weights = new Array(numClasses).fill(0);
    let totalW = 0;
    for (const nb of neighbors) {
      const w = 1 / (nb.dist + 1e-4);
      weights[nb.label] += w;
      totalW += w;
    }
    return weights.map((w) => w / (totalW || 1));
  });
}

function predictNaiveBayesProbabilities(
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number
): number[][] {
  const n = XTrain.length;
  const d = XTrain[0]?.length ?? 0;
  const priors: number[] = [];
  const means: number[][] = [];
  const vars: number[][] = [];

  for (let c = 0; c < numClasses; c++) {
    const classRows = XTrain.filter((_, i) => yTrainIdx[i] === c);
    priors.push(Math.max(1e-6, classRows.length / Math.max(1, n)));
    const cMeans = new Array(d).fill(0);
    const cVars = new Array(d).fill(1);
    if (classRows.length > 0) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (const r of classRows) sum += r[j];
        const m = sum / classRows.length;
        cMeans[j] = m;
        let sq = 0;
        for (const r of classRows) sq += (r[j] - m) ** 2;
        cVars[j] = sq / classRows.length + 1e-3; // Variance smoothing
      }
    }
    means.push(cMeans);
    vars.push(cVars);
  }

  return XTest.map((row) => {
    const logPosteriors = priors.map((prior, c) => {
      let logP = Math.log(prior);
      for (let j = 0; j < d; j++) {
        const v = vars[c][j];
        const diff = row[j] - means[c][j];
        logP += -0.5 * Math.log(2 * Math.PI * v) - (diff * diff) / (2 * v);
      }
      return logP;
    });
    const maxLog = Math.max(...logPosteriors);
    const exps = logPosteriors.map((lp) => Math.exp(lp - maxLog));
    const sumExp = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map((e) => e / sumExp);
  });
}

// ==========================================
// Confusion Matrix & Metrics Calculation
// ==========================================

export function computeConfusionMatrixMetrics(
  predictions: PredictionRow[],
  classes: string[],
  positiveClass: string
): ConfusionMatrixResult {
  const k = classes.length;
  const classToIdx = new Map(classes.map((c, idx) => [c, idx]));
  const matrix: number[][] = Array.from({ length: k }, () =>
    new Array(k).fill(0)
  );

  let totalCorrect = 0;
  for (const pred of predictions) {
    const r = classToIdx.get(pred.actual);
    const c = classToIdx.get(pred.predicted);
    if (r !== undefined && c !== undefined) {
      matrix[r][c]++;
      if (r === c) totalCorrect++;
    }
  }

  const totalSamples = predictions.length;
  const totalErrors = totalSamples - totalCorrect;
  const isBinary = k === 2;

  const perClass: ClassMetrics[] = classes.map((cls, idx) => {
    const tp = matrix[idx][idx];
    let fn = 0;
    let fp = 0;
    for (let j = 0; j < k; j++) {
      if (j !== idx) {
        fn += matrix[idx][j];
        fp += matrix[j][idx];
      }
    }
    const tn = totalSamples - tp - fp - fn;
    const support = tp + fn;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const f1 =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnr = fn + tp > 0 ? fn / (fn + tp) : 0;

    return {
      className: cls,
      support,
      tp,
      fp,
      fn,
      tn,
      precision,
      recall,
      specificity,
      f1,
      fpr,
      fnr,
    };
  });

  let binary: BinaryMetrics | undefined;
  let negativeClass: string | undefined;

  if (isBinary) {
    const posMetrics =
      perClass.find((c) => c.className === positiveClass) ?? perClass[0];
    negativeClass =
      classes.find((c) => c !== posMetrics.className) ?? classes[1];
    const accuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0;

    binary = {
      tp: posMetrics.tp,
      tn: posMetrics.tn,
      fp: posMetrics.fp,
      fn: posMetrics.fn,
      accuracy,
      precision: posMetrics.precision,
      recall: posMetrics.recall,
      specificity: posMetrics.specificity,
      f1: posMetrics.f1,
      fpr: posMetrics.fpr,
      fnr: posMetrics.fnr,
    };
  }

  const macroAccuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0;
  const macroPrecision =
    perClass.reduce((s, c) => s + c.precision, 0) / Math.max(1, k);
  const macroRecall =
    perClass.reduce((s, c) => s + c.recall, 0) / Math.max(1, k);
  const macroSpecificity =
    perClass.reduce((s, c) => s + c.specificity, 0) / Math.max(1, k);
  const macroF1 = perClass.reduce((s, c) => s + c.f1, 0) / Math.max(1, k);
  const macroFpr = perClass.reduce((s, c) => s + c.fpr, 0) / Math.max(1, k);
  const macroFnr = perClass.reduce((s, c) => s + c.fnr, 0) / Math.max(1, k);

  const weightedF1 =
    totalSamples > 0
      ? perClass.reduce((s, c) => s + c.f1 * c.support, 0) / totalSamples
      : 0;

  return {
    classes,
    matrix,
    isBinary,
    positiveClass: isBinary ? (binary ? positiveClass : classes[0]) : classes[0],
    negativeClass,
    binary,
    perClass,
    macroAccuracy,
    macroPrecision,
    macroRecall,
    macroSpecificity,
    macroF1,
    macroFpr,
    macroFnr,
    weightedF1,
    totalSamples,
    totalCorrect,
    totalErrors,
  };
}

export function generateAutomaticConclusions(
  metrics: ConfusionMatrixResult,
  algorithmName: string,
  datasetName: string
): string[] {
  const conclusions: string[] = [];
  const accPct = (metrics.macroAccuracy * 100).toFixed(1);
  const f1Pct = ((metrics.isBinary && metrics.binary ? metrics.binary.f1 : metrics.macroF1) * 100).toFixed(1);

  if (metrics.macroAccuracy >= 0.85) {
    conclusions.push(
      `${algorithmName} logra un desempeño sólido en "${datasetName}" con ${accPct}% de exactitud global (Accuracy) y ${f1Pct}% de F1-Score.`
    );
  } else if (metrics.macroAccuracy >= 0.7) {
    conclusions.push(
      `${algorithmName} alcanza un desempeño moderado (${accPct}% de Accuracy y ${f1Pct}% de F1-Score), con margen claro de mejora en casos frontera.`
    );
  } else {
    conclusions.push(
      `${algorithmName} muestra dificultades en "${datasetName}" (${accPct}% de Accuracy). Conviene probar otro algoritmo o revisar las variables predictoras.`
    );
  }

  if (metrics.isBinary && metrics.binary) {
    const { tp, tn, fp, fn, precision, recall } = metrics.binary;
    const posTotal = tp + fn;
    const negTotal = tn + fp;
    const ratio = Math.min(posTotal, negTotal) / Math.max(1, Math.max(posTotal, negTotal));
    if (ratio < 0.35) {
      conclusions.push(
        `Alerta de desbalance: la clase "${metrics.positiveClass}" representa solo el ${((posTotal / Math.max(1, metrics.totalSamples)) * 100).toFixed(1)}% del conjunto de prueba. Evalúa Precision y Recall por encima del Accuracy.`
      );
    }

    if (fn > fp) {
      conclusions.push(
        `El error predominante son los Falsos Negativos (${fn} casos vs ${fp} Falsos Positivos): el modelo deja escapar casos reales de "${metrics.positiveClass}" (Recall ${(recall * 100).toFixed(1)}%). Si omitir positivos es costoso, prueba reducir el umbral de decisión.`
      );
    } else if (fp > fn) {
      conclusions.push(
        `El error predominante son los Falsos Positivos (${fp} casos vs ${fn} Falsos Negativos): genera falsas alarmas sobre "${metrics.positiveClass}" (Precision ${(precision * 100).toFixed(1)}%). Si investigar falsas alarmas es costoso, prueba subir el umbral.`
      );
    } else {
      conclusions.push(
        `Los errores están equilibrados entre Falsos Positivos (${fp}) y Falsos Negativos (${fn}).`
      );
    }
  } else {
    // Multiclass insights
    const sortedByF1 = [...metrics.perClass].sort((a, b) => a.f1 - b.f1);
    const weakest = sortedByF1[0];
    const strongest = sortedByF1[sortedByF1.length - 1];
    conclusions.push(
      `La clase mejor identificada es "${strongest.className}" (F1: ${(strongest.f1 * 100).toFixed(1)}%), mientras que "${weakest.className}" presenta la mayor dificultad (F1: ${(weakest.f1 * 100).toFixed(1)}%).`
    );

    // Find top confusion pair
    let maxErr = 0;
    let errPair = '';
    for (let r = 0; r < metrics.classes.length; r++) {
      for (let c = 0; c < metrics.classes.length; c++) {
        if (r !== c && metrics.matrix[r][c] > maxErr) {
          maxErr = metrics.matrix[r][c];
          errPair = `"${metrics.classes[r]}" confundida como "${metrics.classes[c]}" (${maxErr} veces)`;
        }
      }
    }
    if (errPair) {
      conclusions.push(`La confusión más frecuente ocurre cuando la clase real es ${errPair}.`);
    }
  }

  return conclusions;
}

// ==========================================
// Stratified Train/Test Split & Training API
// ==========================================

function prepareSplit(dataset: DatasetInfo, config: TrainConfig) {
  const validRows = dataset.rows.filter((r) => {
    const t = r[config.targetColumn];
    return t !== null && t !== undefined && String(t).trim() !== '';
  });

  if (validRows.length < 10) {
    throw new Error('No hay suficientes filas con variable objetivo válida.');
  }

  const classMap = new Map<string, Record<string, string | number | null>[]>();
  for (const row of validRows) {
    const label = String(row[config.targetColumn]);
    if (!classMap.has(label)) classMap.set(label, []);
    classMap.get(label)!.push(row);
  }

  const classes = Array.from(classMap.keys()).sort();
  if (classes.length < 2) {
    throw new Error('La variable objetivo debe tener al menos 2 clases distintas.');
  }

  const rand = createSeededRng(config.seed);
  const trainRows: Record<string, string | number | null>[] = [];
  const testRows: Record<string, string | number | null>[] = [];
  const trainClassDistribution: Record<string, number> = {};
  const testClassDistribution: Record<string, number> = {};

  for (const cls of classes) {
    const group = shuffleInPlace([...classMap.get(cls)!], rand);
    const nTest = Math.max(1, Math.round(group.length * config.testSize));
    const safeTest = Math.min(nTest, Math.max(1, group.length - 1));
    const clsTest = group.slice(0, safeTest);
    const clsTrain = group.slice(safeTest);

    testRows.push(...clsTest);
    trainRows.push(...clsTrain);
    testClassDistribution[cls] = clsTest.length;
    trainClassDistribution[cls] = clsTrain.length;
  }

  shuffleInPlace(trainRows, rand);
  shuffleInPlace(testRows, rand);

  return {
    classes,
    trainRows,
    testRows,
    trainClassDistribution,
    testClassDistribution,
    rand,
  };
}

function runAlgorithm(
  algorithm: AlgorithmId,
  XTrain: number[][],
  yTrainIdx: number[],
  XTest: number[][],
  numClasses: number,
  rand: () => number
): number[][] {
  switch (algorithm) {
    case 'logistic':
      return predictLogisticProbabilities(XTrain, yTrainIdx, XTest, numClasses);
    case 'decision_tree':
      return predictDecisionTreeProbabilities(XTrain, yTrainIdx, XTest, numClasses, rand);
    case 'random_forest':
      return predictRandomForestProbabilities(XTrain, yTrainIdx, XTest, numClasses, rand);
    case 'knn':
      return predictKnnProbabilities(XTrain, yTrainIdx, XTest, numClasses, 5);
    case 'naive_bayes':
      return predictNaiveBayesProbabilities(XTrain, yTrainIdx, XTest, numClasses);
  }
}

export function trainClassificationModel(
  dataset: DatasetInfo,
  config: TrainConfig
): TrainedModelResult {
  const t0 = performance.now();
  const {
    classes,
    trainRows,
    testRows,
    trainClassDistribution,
    testClassDistribution,
    rand,
  } = prepareSplit(dataset, config);

  const { XTrain, XTest, summary } = fitAndTransform(
    trainRows,
    testRows,
    config.featureColumns,
    dataset
  );

  const classToIdx = new Map(classes.map((c, i) => [c, i]));
  const yTrainIdx = trainRows.map((r) => classToIdx.get(String(r[config.targetColumn]))!);

  const probMatrix = runAlgorithm(
    config.algorithm,
    XTrain,
    yTrainIdx,
    XTest,
    classes.length,
    rand
  );

  const isBinary = classes.length === 2;
  const positiveClass =
    isBinary && classes.includes(config.positiveClass)
      ? config.positiveClass
      : classes[0];
  const negativeClass = isBinary
    ? classes.find((c) => c !== positiveClass) ?? classes[1]
    : '';
  const posIdx = classes.indexOf(positiveClass);

  const predictions: PredictionRow[] = testRows.map((row, i) => {
    const actual = String(row[config.targetColumn]);
    const probsVec = probMatrix[i];
    const probabilities: Record<string, number> = {};
    classes.forEach((cls, cIdx) => {
      probabilities[cls] = Number((probsVec[cIdx] ?? 0).toFixed(4));
    });

    let predicted: string;
    if (isBinary) {
      const pPos = probsVec[posIdx] ?? 0;
      predicted = pPos >= config.threshold ? positiveClass : negativeClass;
    } else {
      let bestIdx = 0;
      let bestP = -1;
      probsVec.forEach((p, idx) => {
        if (p > bestP) {
          bestP = p;
          bestIdx = idx;
        }
      });
      predicted = classes[bestIdx];
    }

    let binaryOutcome: 'TP' | 'TN' | 'FP' | 'FN' | undefined;
    if (isBinary) {
      if (actual === positiveClass && predicted === positiveClass) binaryOutcome = 'TP';
      else if (actual !== positiveClass && predicted !== positiveClass) binaryOutcome = 'TN';
      else if (actual !== positiveClass && predicted === positiveClass) binaryOutcome = 'FP';
      else binaryOutcome = 'FN';
    }

    const featuresSummary: Record<string, string | number | null> = {};
    for (const col of config.featureColumns.slice(0, 5)) {
      featuresSummary[col] = row[col];
    }

    return {
      rowIndex: i + 1,
      actual,
      predicted,
      probabilities,
      correct: actual === predicted,
      binaryOutcome,
      featuresSummary,
    };
  });

  const metrics = computeConfusionMatrixMetrics(predictions, classes, positiveClass);
  const algoMeta = ALGORITHMS.find((a) => a.id === config.algorithm)!;
  const conclusions = generateAutomaticConclusions(
    metrics,
    algoMeta.name,
    dataset.name
  );
  const trainingTimeMs = Math.max(1, Math.round(performance.now() - t0));

  return {
    id: `model_${Date.now()}`,
    algorithm: config.algorithm,
    algorithmName: algoMeta.name,
    datasetName: dataset.name,
    sector: dataset.sector,
    targetColumn: config.targetColumn,
    featureColumns: config.featureColumns,
    classes,
    isBinary,
    positiveClass,
    threshold: config.threshold,
    testSize: config.testSize,
    preprocessing: summary,
    predictions,
    metrics,
    conclusions,
    trainClassDistribution,
    testClassDistribution,
    trainingTimeMs,
  };
}

export function recalculateModelWithThreshold(
  model: TrainedModelResult,
  newThreshold: number,
  newPositiveClass?: string
): TrainedModelResult {
  const positiveClass = newPositiveClass && model.classes.includes(newPositiveClass)
    ? newPositiveClass
    : model.positiveClass;
  const negativeClass =
    model.classes.find((c) => c !== positiveClass) ?? model.classes[1];

  const updatedPredictions: PredictionRow[] = model.predictions.map((p) => {
    let predicted = p.predicted;
    let binaryOutcome: 'TP' | 'TN' | 'FP' | 'FN' | undefined;

    if (model.isBinary) {
      const pPos = p.probabilities[positiveClass] ?? 0;
      predicted = pPos >= newThreshold ? positiveClass : negativeClass;
      if (p.actual === positiveClass && predicted === positiveClass) binaryOutcome = 'TP';
      else if (p.actual !== positiveClass && predicted !== positiveClass) binaryOutcome = 'TN';
      else if (p.actual !== positiveClass && predicted === positiveClass) binaryOutcome = 'FP';
      else binaryOutcome = 'FN';
    }

    return {
      ...p,
      predicted,
      correct: p.actual === predicted,
      binaryOutcome,
    };
  });

  const metrics = computeConfusionMatrixMetrics(
    updatedPredictions,
    model.classes,
    positiveClass
  );
  const conclusions = generateAutomaticConclusions(
    metrics,
    model.algorithmName,
    model.datasetName
  );

  return {
    ...model,
    positiveClass,
    threshold: newThreshold,
    predictions: updatedPredictions,
    metrics,
    conclusions,
  };
}

export function compareAllAlgorithms(
  dataset: DatasetInfo,
  baseConfig: TrainConfig
): AlgorithmComparisonEntry[] {
  return ALGORITHMS.map((algo) => {
    const res = trainClassificationModel(dataset, {
      ...baseConfig,
      algorithm: algo.id,
    });
    const m = res.metrics;
    const bin = m.binary;
    return {
      algorithm: algo.id,
      algorithmName: algo.shortName,
      accuracy: m.macroAccuracy,
      precision: bin ? bin.precision : m.macroPrecision,
      recall: bin ? bin.recall : m.macroRecall,
      specificity: bin ? bin.specificity : m.macroSpecificity,
      f1: bin ? bin.f1 : m.macroF1,
      fpr: bin ? bin.fpr : m.macroFpr,
      fnr: bin ? bin.fnr : m.macroFnr,
      trainingTimeMs: res.trainingTimeMs,
    };
  });
}

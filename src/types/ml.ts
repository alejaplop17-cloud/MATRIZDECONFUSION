export type AppTab = 'datos' | 'modelo' | 'laboratorio' | 'videojuego' | 'resultados';

export type ColumnType = 'numeric' | 'categorical';

export type ProblemType = 'binary' | 'multiclass' | 'invalid';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
  targetCandidate: boolean;
  targetReason: string;
  classDistribution?: Record<string, number>;
}

export interface DatasetInfo {
  id: string;
  name: string;
  sector: string;
  description: string;
  fileName: string;
  rows: Record<string, string | number | null>[];
  columns: ColumnProfile[];
  totalMissing: number;
}

export type AlgorithmId =
  | 'logistic'
  | 'decision_tree'
  | 'random_forest'
  | 'knn'
  | 'naive_bayes';

export interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  shortName: string;
  description: string;
  strengths: string;
}

export interface TrainConfig {
  algorithm: AlgorithmId;
  testSize: number; // 0.15 to 0.4
  targetColumn: string;
  featureColumns: string[];
  positiveClass: string; // relevant for binary
  threshold: number; // relevant for binary probability threshold (default 0.5)
  seed: number;
}

export interface PredictionRow {
  rowIndex: number;
  actual: string;
  predicted: string;
  probabilities: Record<string, number>;
  correct: boolean;
  binaryOutcome?: 'TP' | 'TN' | 'FP' | 'FN';
  featuresSummary: Record<string, string | number | null>;
}

export interface BinaryMetrics {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  fpr: number;
  fnr: number;
}

export interface ClassMetrics {
  className: string;
  support: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  fpr: number;
  fnr: number;
}

export interface ConfusionMatrixResult {
  classes: string[];
  matrix: number[][]; // [actualIdx][predIdx]
  isBinary: boolean;
  positiveClass: string;
  negativeClass?: string;
  binary?: BinaryMetrics;
  perClass: ClassMetrics[];
  macroAccuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroSpecificity: number;
  macroF1: number;
  macroFpr: number;
  macroFnr: number;
  weightedF1: number;
  totalSamples: number;
  totalCorrect: number;
  totalErrors: number;
}

export interface PreprocessingSummary {
  trainCount: number;
  testCount: number;
  numericFeatures: string[];
  categoricalFeatures: string[];
  encodedFeatureCount: number;
  imputedTrainMissing: number;
  imputedTestMissing: number;
  notes: string[];
}

export interface TrainedModelResult {
  id: string;
  algorithm: AlgorithmId;
  algorithmName: string;
  datasetName: string;
  sector: string;
  targetColumn: string;
  featureColumns: string[];
  classes: string[];
  isBinary: boolean;
  positiveClass: string;
  threshold: number;
  testSize: number;
  preprocessing: PreprocessingSummary;
  predictions: PredictionRow[];
  metrics: ConfusionMatrixResult;
  conclusions: string[];
  trainClassDistribution: Record<string, number>;
  testClassDistribution: Record<string, number>;
  trainingTimeMs: number;
}

export interface AlgorithmComparisonEntry {
  algorithm: AlgorithmId;
  algorithmName: string;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  fpr: number;
  fnr: number;
  trainingTimeMs: number;
}

export type BadgeId =
  | 'nivel_1'
  | 'nivel_2'
  | 'nivel_3'
  | 'nivel_4'
  | 'nivel_5';

export interface BadgeInfo {
  id: BadgeId;
  level: number;
  title: string;
  subtitle: string;
}

export interface GameProgress {
  xp: number;
  lives: number;
  maxLives: number;
  completedLevels: number[];
  unlockedBadges: BadgeId[];
  levelScores: Record<number, number>;
  playerName: string;
  soundEnabled: boolean;
}

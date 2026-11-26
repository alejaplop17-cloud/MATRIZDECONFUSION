import { BadgeInfo } from '../types/ml';

export const QUEST_BADGES: BadgeInfo[] = [
  {
    id: 'nivel_1',
    level: 1,
    title: 'Explorador de Casillas',
    subtitle: 'Distingue TP, TN, FP y FN con precisión.',
  },
  {
    id: 'nivel_2',
    level: 2,
    title: 'Arquitecto de Matrices',
    subtitle: 'Construye matrices de confusión desde registros crudos.',
  },
  {
    id: 'nivel_3',
    level: 3,
    title: 'Detective Sectorial',
    subtitle: 'Evalúa el costo real de errores en 6 industrias.',
  },
  {
    id: 'nivel_4',
    level: 4,
    title: 'Maestro de las Métricas',
    subtitle: 'Calcula e interpreta Precision, Recall, Especificidad y F1.',
  },
  {
    id: 'nivel_5',
    level: 5,
    title: 'Estratega de Machine Learning',
    subtitle: 'Audita un modelo real entrenado con datos completos.',
  },
];

export interface Level1Round {
  id: string;
  sector: string;
  positiveLabel: string;
  negativeLabel: string;
  caseSummary: string;
  actual: string;
  predicted: string;
  answer: 'TP' | 'TN' | 'FP' | 'FN';
  explanation: string;
}

export const LEVEL_1_ROUNDS: Level1Round[] = [
  {
    id: 'l1_1',
    sector: 'Salud',
    positiveLabel: 'Enfermo',
    negativeLabel: 'Sano',
    caseSummary: 'Un paciente tiene diabetes real, y el modelo clínico predijo "Enfermo".',
    actual: 'Enfermo',
    predicted: 'Enfermo',
    answer: 'TP',
    explanation:
      'Es un Verdadero Positivo (TP) porque la clase real era positiva ("Enfermo") y el modelo acertó prediciendo positivo.',
  },
  {
    id: 'l1_2',
    sector: 'Finanzas',
    positiveLabel: 'Fraude',
    negativeLabel: 'Legítima',
    caseSummary: 'Una compra normal de supermercado fue bloqueada porque el modelo la marcó como "Fraude".',
    actual: 'Legítima',
    predicted: 'Fraude',
    answer: 'FP',
    explanation:
      'Es un Falso Positivo (FP): la realidad era negativa ("Legítima"), pero el modelo lanzó una falsa alarma prediciendo "Fraude".',
  },
  {
    id: 'l1_3',
    sector: 'Industria',
    positiveLabel: 'Defectuosa',
    negativeLabel: 'Óptima',
    caseSummary: 'Una pieza con grieta interna salió al mercado porque el sensor la clasificó como "Óptima".',
    actual: 'Defectuosa',
    predicted: 'Óptima',
    answer: 'FN',
    explanation:
      'Es un Falso Negativo (FN): existía un defecto real (positivo), pero el modelo lo pasó por alto prediciendo "Óptima".',
  },
  {
    id: 'l1_4',
    sector: 'Marketing',
    positiveLabel: 'Cancela',
    negativeLabel: 'Permanece',
    caseSummary: 'Un cliente fiel que renovó su plan fue clasificado correctamente como "Permanece".',
    actual: 'Permanece',
    predicted: 'Permanece',
    answer: 'TN',
    explanation:
      'Es un Verdadero Negativo (TN): tanto la realidad como la predicción corresponden a la clase negativa ("Permanece").',
  },
  {
    id: 'l1_5',
    sector: 'Movilidad',
    positiveLabel: 'Riesgo Alto',
    negativeLabel: 'Tramo Seguro',
    caseSummary: 'En un cruce con alta probabilidad real de choque, el sistema predijo "Riesgo Alto".',
    actual: 'Riesgo Alto',
    predicted: 'Riesgo Alto',
    answer: 'TP',
    explanation:
      'Es un Verdadero Positivo (TP): el modelo detectó correctamente un escenario positivo de alto riesgo.',
  },
];

export interface Level2Round {
  id: string;
  title: string;
  positiveLabel: string;
  negativeLabel: string;
  pairs: Array<{ id: number; actual: string; predicted: string }>;
  expected: { tp: number; fn: number; fp: number; tn: number };
}

export const LEVEL_2_ROUNDS: Level2Round[] = [
  {
    id: 'l2_1',
    title: 'Ronda 1 · Diagnóstico Rápido (8 pacientes)',
    positiveLabel: 'Positivo',
    negativeLabel: 'Negativo',
    pairs: [
      { id: 1, actual: 'Positivo', predicted: 'Positivo' },
      { id: 2, actual: 'Positivo', predicted: 'Positivo' },
      { id: 3, actual: 'Positivo', predicted: 'Negativo' },
      { id: 4, actual: 'Negativo', predicted: 'Negativo' },
      { id: 5, actual: 'Negativo', predicted: 'Positivo' },
      { id: 6, actual: 'Negativo', predicted: 'Negativo' },
      { id: 7, actual: 'Positivo', predicted: 'Positivo' },
      { id: 8, actual: 'Negativo', predicted: 'Negativo' },
    ],
    expected: { tp: 3, fn: 1, fp: 1, tn: 3 },
  },
  {
    id: 'l2_2',
    title: 'Ronda 2 · Filtro Antifraude (10 transacciones)',
    positiveLabel: 'Fraude',
    negativeLabel: 'Legítima',
    pairs: [
      { id: 1, actual: 'Fraude', predicted: 'Fraude' },
      { id: 2, actual: 'Fraude', predicted: 'Legítima' },
      { id: 3, actual: 'Legítima', predicted: 'Legítima' },
      { id: 4, actual: 'Legítima', predicted: 'Fraude' },
      { id: 5, actual: 'Legítima', predicted: 'Fraude' },
      { id: 6, actual: 'Fraude', predicted: 'Fraude' },
      { id: 7, actual: 'Legítima', predicted: 'Legítima' },
      { id: 8, actual: 'Fraude', predicted: 'Legítima' },
      { id: 9, actual: 'Legítima', predicted: 'Legítima' },
      { id: 10, actual: 'Legítima', predicted: 'Legítima' },
    ],
    expected: { tp: 2, fn: 2, fp: 2, tn: 4 },
  },
  {
    id: 'l2_3',
    title: 'Ronda 3 · Control de Calidad (12 piezas)',
    positiveLabel: 'Defectuosa',
    negativeLabel: 'Óptima',
    pairs: [
      { id: 1, actual: 'Defectuosa', predicted: 'Defectuosa' },
      { id: 2, actual: 'Defectuosa', predicted: 'Defectuosa' },
      { id: 3, actual: 'Defectuosa', predicted: 'Defectuosa' },
      { id: 4, actual: 'Defectuosa', predicted: 'Óptima' },
      { id: 5, actual: 'Defectuosa', predicted: 'Óptima' },
      { id: 6, actual: 'Óptima', predicted: 'Óptima' },
      { id: 7, actual: 'Óptima', predicted: 'Defectuosa' },
      { id: 8, actual: 'Óptima', predicted: 'Óptima' },
      { id: 9, actual: 'Óptima', predicted: 'Óptima' },
      { id: 10, actual: 'Óptima', predicted: 'Óptima' },
      { id: 11, actual: 'Defectuosa', predicted: 'Defectuosa' },
      { id: 12, actual: 'Óptima', predicted: 'Óptima' },
    ],
    expected: { tp: 4, fn: 2, fp: 1, tn: 5 },
  },
];

export interface Level3Round {
  id: string;
  sector: 'Salud' | 'Finanzas' | 'Marketing' | 'Comercio' | 'Industria' | 'Movilidad';
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const LEVEL_3_ROUNDS: Level3Round[] = [
  {
    id: 'l3_salud',
    sector: 'Salud',
    scenario:
      'Un modelo de tamizaje detecta cáncer temprano (clase positiva: "Con tumor", clase negativa: "Sano").',
    question: '¿Qué consecuencia tiene un Falso Negativo (FN) en este contexto y por qué suele ser el error más crítico?',
    options: [
      'Un paciente sano repite un examen de rutina, generando ansiedad temporal.',
      'Un paciente con enfermedad real recibe el alta como sano, retrasando un tratamiento vital.',
      'El hospital ahorra recursos evitando biopsias innecesarias.',
      'El modelo clasifica correctamente a todos los pacientes sanos.',
    ],
    correctIndex: 1,
    explanation:
      'En Salud, un Falso Negativo significa dejar sin diagnóstico a un paciente enfermo. Por eso se prioriza maximizar el Recall (Sensibilidad).',
  },
  {
    id: 'l3_finanzas',
    sector: 'Finanzas',
    scenario:
      'Un banco opera un sistema automático de bloqueo de tarjetas por fraude (clase positiva: "Fraude").',
    question: '¿Qué ocurre en la operación bancaria cuando aumenta la tasa de Falsos Positivos (FP)?',
    options: [
      'Se aprueban compras robadas sin alertar al titular de la tarjeta.',
      'Se bloquean tarjetas de clientes legítimos en plena compra, causando fricción y abandono.',
      'Desaparece el riesgo de pérdidas por contracargos fraudulentos.',
      'Aumenta la especificidad del modelo al 100%.',
    ],
    correctIndex: 1,
    explanation:
      'Un Falso Positivo en fraude bloquea una compra legítima. Aunque un FN cuesta dinero directo por fraude, demasiados FP arruinan la experiencia del cliente.',
  },
  {
    id: 'l3_marketing',
    sector: 'Marketing',
    scenario:
      'Una empresa de telecomunicaciones predice qué clientes cancelarán su plan (clase positiva: "Abandono") para enviarles un descuento del 30%.',
    question: '¿Cuál es el impacto comercial directo de un Falso Positivo (FP)?',
    options: [
      'Se pierde al cliente porque nunca recibió una oferta de retención.',
      'Se regala un descuento del 30% a un cliente fiel que igual pensaba quedarse.',
      'El departamento de soporte reduce sus llamadas entrantes.',
      'Mejora automáticamente el margen de ganancia neta.',
    ],
    correctIndex: 1,
    explanation:
      'En campañas de retención, un FP implica asumir el costo del incentivo en un cliente que no iba a irse, mientras un FN implica perder al cliente sin intentar retenerlo.',
  },
  {
    id: 'l3_comercio',
    sector: 'Comercio',
    scenario:
      'Un e-commerce predice si un visitante realizará una compra (clase positiva: "Compra") para asignar inventario prioritario y cupones.',
    question: 'Si el modelo tiene muchos Falsos Negativos (FN) al predecir compras, ¿qué problema enfrenta la tienda?',
    options: [
      'Subestima la demanda real de compradores activos y pierde ventas por falta de stock o seguimiento.',
      'Envía pedidos duplicados a clientes que no compraron.',
      'Satura la bodega con productos devueltos.',
      'Incrementa su tasa de Precision por encima del 100%.',
    ],
    correctIndex: 0,
    explanation:
      'Un Falso Negativo ocurre cuando un cliente que sí iba a comprar es clasificado como no comprador, provocando subestimación de demanda y pérdida de oportunidades.',
  },
  {
    id: 'l3_industria',
    sector: 'Industria',
    scenario:
      'Una planta automotriz inspecciona frenos mediante visión artificial (clase positiva: "Pieza defectuosa").',
    question: '¿Cuál de estos escenarios representa el riesgo más grave de un Falso Negativo (FN)?',
    options: [
      'Descartar o re-inspeccionar manualmente una pieza que estaba en buen estado.',
      'Dejar pasar un freno defectuoso hacia el ensamblaje final de vehículos.',
      'Detener la banda transportadora 5 minutos por una falsa alarma.',
      'Aumentar el costo de inspección visual en el turno nocturno.',
    ],
    correctIndex: 1,
    explanation:
      'En seguridad industrial, un Falso Negativo permite que una pieza defectuosa llegue al usuario final, generando riesgos de seguridad y retiradas masivas.',
  },
  {
    id: 'l3_movilidad',
    sector: 'Movilidad',
    scenario:
      'Un sistema vial urbano predice tramos con alta probabilidad de accidente en la próxima hora (clase positiva: "Riesgo de accidente").',
    question: '¿Cómo se interpreta correctamente el balance entre FP y FN en este sistema?',
    options: [
      'Un FN deja un punto crítico sin patrullaje preventivo; un FP despliega una alerta preventiva innecesaria.',
      'Un FP provoca directamente un choque en la autopista.',
      'Un FN envía demasiadas ambulancias a zonas seguras.',
      'Ambos errores tienen exactamente cero impacto operativo.',
    ],
    correctIndex: 0,
    explanation:
      'En movilidad y seguridad vial, un FN significa no advertir ni prevenir un accidente real; un FP implica movilizar señalización o recursos preventivos sin incidente.',
  },
];

export interface Level4Round {
  id: string;
  context: string;
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  targetMetric: 'Accuracy' | 'Precision' | 'Recall' | 'Especificidad' | 'F1-Score';
  formulaHint: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const LEVEL_4_ROUNDS: Level4Round[] = [
  {
    id: 'l4_1',
    context: 'Modelo clínico (Positivo: Enfermo)',
    tp: 40,
    fn: 10,
    fp: 5,
    tn: 45,
    targetMetric: 'Accuracy',
    formulaHint: '(TP + TN) / Total',
    options: ['75.0%', '85.0%', '88.9%', '90.0%'],
    correctIndex: 1,
    explanation: 'Accuracy = (40 + 45) / (40 + 10 + 5 + 45) = 85 / 100 = 85.0%.',
  },
  {
    id: 'l4_2',
    context: 'Filtro de fraude bancario (Positivo: Fraude)',
    tp: 18,
    fn: 6,
    fp: 2,
    tn: 74,
    targetMetric: 'Precision',
    formulaHint: 'TP / (TP + FP)',
    options: ['75.0%', '90.0%', '92.0%', '97.4%'],
    correctIndex: 1,
    explanation: 'Precision = 18 / (18 + 2) = 18 / 20 = 90.0%. Mide qué tan confiables son las alertas positivas.',
  },
  {
    id: 'l4_3',
    context: 'Detección de piezas defectuosas (Positivo: Defecto)',
    tp: 27,
    fn: 3,
    fp: 9,
    tn: 61,
    targetMetric: 'Recall',
    formulaHint: 'TP / (TP + FN)',
    options: ['75.0%', '87.1%', '90.0%', '88.0%'],
    correctIndex: 2,
    explanation: 'Recall = 27 / (27 + 3) = 27 / 30 = 90.0%. De 30 defectos reales, detectó 27.',
  },
  {
    id: 'l4_4',
    context: 'Control de acceso seguro (Negativo: Acceso válido)',
    tp: 15,
    fn: 5,
    fp: 8,
    tn: 72,
    targetMetric: 'Especificidad',
    formulaHint: 'TN / (TN + FP)',
    options: ['75.0%', '87.0%', '90.0%', '65.2%'],
    correctIndex: 2,
    explanation: 'Especificidad = 72 / (72 + 8) = 72 / 80 = 90.0%. Identificó correctamente al 90% de los casos negativos reales.',
  },
  {
    id: 'l4_5',
    context: 'Predicción de abandono de clientes (Precision = 80%, Recall = 80%)',
    tp: 32,
    fn: 8,
    fp: 8,
    tn: 52,
    targetMetric: 'F1-Score',
    formulaHint: '2 · (Precision · Recall) / (Precision + Recall)',
    options: ['76.0%', '80.0%', '84.0%', '86.7%'],
    correctIndex: 1,
    explanation:
      'Precision = 32/40 = 80% y Recall = 32/40 = 80%. Por tanto, F1-Score = 2 · (0.8 · 0.8) / (0.8 + 0.8) = 80.0%.',
  },
];

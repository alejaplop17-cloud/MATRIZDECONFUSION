import { DatasetInfo } from '../types/ml';
import { profileColumns } from '../utils/dataParser';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildSaludCardioDataset(): DatasetInfo {
  const rand = seededRand(101);
  const rows: Record<string, string | number | null>[] = [];
  const habitos = ['Sedentario', 'Moderado', 'Activo'];
  const antecedentes = ['No', 'Si'];

  for (let i = 1; i <= 220; i++) {
    const edad = Math.round(28 + rand() * 48);
    const presion = Math.round(105 + (edad - 28) * 0.65 + (rand() - 0.4) * 34);
    const colesterol = Math.round(155 + (edad - 28) * 0.9 + (rand() - 0.45) * 85);
    const glucosa = Math.round(78 + rand() * 88);
    const habito = habitos[Math.floor(rand() * habitos.length)];
    const ant = rand() < 0.36 ? antecedentes[1] : antecedentes[0];

    const riskScore =
      (edad > 55 ? 1.4 : 0) +
      (presion > 138 ? 1.8 : 0) +
      (colesterol > 225 ? 1.3 : 0) +
      (glucosa > 125 ? 1.5 : 0) +
      (habito === 'Sedentario' ? 1.0 : habito === 'Activo' ? -0.9 : 0) +
      (ant === 'Si' ? 1.2 : 0) +
      (rand() - 0.5) * 1.4;

    const diagnostico = riskScore >= 2.75 ? 'Riesgo Alto' : 'Riesgo Bajo';

    // Inject realistic missing values (~3%) to showcase automatic imputation
    rows.push({
      ID_Paciente: `PAC-${String(i).padStart(3, '0')}`,
      Edad: rand() < 0.02 ? null : edad,
      Presion_Arterial: rand() < 0.025 ? null : presion,
      Colesterol: rand() < 0.03 ? null : colesterol,
      Glucosa: glucosa,
      Actividad_Fisica: rand() < 0.02 ? null : habito,
      Antecedentes_Familiares: ant,
      Diagnostico: diagnostico,
    });
  }

  const { columns, totalMissing } = profileColumns(rows);
  return {
    id: 'demo_salud_cardio',
    name: 'Diagnóstico Cardiovascular (Salud)',
    sector: 'Salud',
    description:
      'Evaluación clínica de riesgo cardiovascular en 220 pacientes con variables biométricas, hábitos e historial familiar.',
    fileName: 'salud_riesgo_cardiovascular.csv',
    rows,
    columns,
    totalMissing,
  };
}

function buildFinanzasFraudeDataset(): DatasetInfo {
  const rand = seededRand(202);
  const rows: Record<string, string | number | null>[] = [];
  const canales = ['App Móvil', 'Web', 'Terminal POS', 'Cajero'];
  const paises = ['Local', 'Internacional'];

  for (let i = 1; i <= 240; i++) {
    const isFraud = rand() < 0.24; // Realistic imbalanced fraud dataset (~24% positive)
    const monto = isFraud
      ? Math.round(450 + rand() * 2600)
      : Math.round(15 + rand() * 480);
    const hora = isFraud ? Math.floor(rand() * 6) : Math.floor(7 + rand() * 16);
    const intentos = isFraud ? Math.ceil(rand() * 5) : rand() < 0.85 ? 1 : 2;
    const canal = isFraud
      ? canales[rand() < 0.7 ? 1 : 0]
      : canales[Math.floor(rand() * canales.length)];
    const origen = isFraud ? (rand() < 0.68 ? paises[1] : paises[0]) : rand() < 0.15 ? paises[1] : paises[0];
    const distanciaKm = isFraud ? Math.round(120 + rand() * 1400) : Math.round(rand() * 45);

    rows.push({
      ID_Transaccion: `TX-${1000 + i}`,
      Monto_USD: rand() < 0.02 ? null : monto,
      Hora_Dia: hora,
      Intentos_Fallidos: intentos,
      Canal: canal,
      Origen: origen,
      Distancia_Habitual_Km: rand() < 0.025 ? null : distanciaKm,
      Fraude: isFraud ? 'Fraude' : 'Legítima',
    });
  }

  const { columns, totalMissing } = profileColumns(rows);
  return {
    id: 'demo_finanzas_fraude',
    name: 'Detección de Fraude Bancario (Finanzas)',
    sector: 'Finanzas',
    description:
      'Transacciones financieras con desbalance de clases realista (~24% fraude) para analizar falsos positivos y falsos negativos.',
    fileName: 'finanzas_deteccion_fraude.csv',
    rows,
    columns,
    totalMissing,
  };
}

function buildComercioChurnDataset(): DatasetInfo {
  const rand = seededRand(303);
  const rows: Record<string, string | number | null>[] = [];
  const planes = ['Básico', 'Estándar', 'Premium'];

  for (let i = 1; i <= 210; i++) {
    const antiguedadMeses = Math.round(1 + rand() * 48);
    const ticketsSoporte = Math.floor(rand() * 7);
    const gastoMensual = Math.round(18 + rand() * 110);
    const diasSinUso = Math.round(rand() * 40);
    const plan = planes[Math.floor(rand() * planes.length)];

    const score =
      (antiguedadMeses < 10 ? 1.5 : -0.4) +
      (ticketsSoporte >= 4 ? 1.7 : 0) +
      (diasSinUso > 20 ? 1.8 : 0) +
      (plan === 'Básico' ? 0.6 : -0.5) +
      (rand() - 0.5) * 1.3;

    rows.push({
      ID_Cliente: `CLI-${500 + i}`,
      Antiguedad_Meses: antiguedadMeses,
      Tickets_Soporte: ticketsSoporte,
      Gasto_Mensual_USD: rand() < 0.02 ? null : gastoMensual,
      Dias_Sin_Uso: diasSinUso,
      Plan_Suscripcion: plan,
      Abandono: score >= 1.9 ? 'Cancela' : 'Permanece',
    });
  }

  const { columns, totalMissing } = profileColumns(rows);
  return {
    id: 'demo_marketing_churn',
    name: 'Predicción de Abandono de Clientes (Marketing)',
    sector: 'Marketing y Comercio',
    description:
      'Historial de uso y soporte de 210 clientes para predecir cancelación de suscripción.',
    fileName: 'marketing_abandono_clientes.csv',
    rows,
    columns,
    totalMissing,
  };
}

function buildIndustriaMulticlaseDataset(): DatasetInfo {
  const rand = seededRand(404);
  const rows: Record<string, string | number | null>[] = [];
  const turnos = ['Mañana', 'Tarde', 'Noche'];

  for (let i = 1; i <= 240; i++) {
    const r = rand();
    let estado: 'Óptimo' | 'Defecto Menor' | 'Defecto Crítico';
    let temperatura: number;
    let vibracion: number;
    let espesorMm: number;
    let presionBar: number;

    if (r < 0.45) {
      estado = 'Óptimo';
      temperatura = Math.round(62 + rand() * 14);
      vibracion = Number((0.4 + rand() * 1.1).toFixed(2));
      espesorMm = Number((4.9 + rand() * 0.2).toFixed(2));
      presionBar = Number((5.8 + rand() * 0.7).toFixed(2));
    } else if (r < 0.78) {
      estado = 'Defecto Menor';
      temperatura = Math.round(77 + rand() * 13);
      vibracion = Number((1.6 + rand() * 1.3).toFixed(2));
      espesorMm = Number((4.6 + rand() * 0.28).toFixed(2));
      presionBar = Number((5.1 + rand() * 0.8).toFixed(2));
    } else {
      estado = 'Defecto Crítico';
      temperatura = Math.round(91 + rand() * 18);
      vibracion = Number((3.0 + rand() * 2.1).toFixed(2));
      espesorMm = Number((4.1 + rand() * 0.42).toFixed(2));
      presionBar = Number((4.2 + rand() * 0.9).toFixed(2));
    }

    rows.push({
      Lote: `LOT-${200 + i}`,
      Temperatura_C: rand() < 0.02 ? null : temperatura,
      Vibracion_Hz: vibracion,
      Espesor_mm: espesorMm,
      Presion_Bar: presionBar,
      Turno: turnos[Math.floor(rand() * turnos.length)],
      Calidad_Pieza: estado,
    });
  }

  const { columns, totalMissing } = profileColumns(rows);
  return {
    id: 'demo_industria_calidad',
    name: 'Control de Calidad Industrial (Multiclase)',
    sector: 'Industria',
    description:
      'Sensores de línea de producción con 3 clases (Óptimo, Defecto Menor y Defecto Crítico) para explorar matrices multiclase.',
    fileName: 'industria_calidad_multiclase.csv',
    rows,
    columns,
    totalMissing,
  };
}

export const SAMPLE_DATASETS: DatasetInfo[] = [
  buildSaludCardioDataset(),
  buildFinanzasFraudeDataset(),
  buildComercioChurnDataset(),
  buildIndustriaMulticlaseDataset(),
];

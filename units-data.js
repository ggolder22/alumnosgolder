// ── CONTENIDO DE UNIDADES ─────────────────────────────────────
// Editá el contenido de cada unidad aquí.
// También podés editarlo desde el Panel Admin en la app.

const UNITS = [
  {
    id: 1,
    title: 'Circuito Eléctrico y Magnitudes Fundamentales',
    topics: ['Corriente eléctrica', 'Tensión (D.D.P.)', 'Resistencia eléctrica', 'Ley de Ohm'],
    tag: 'Fundamentos',
    content: `
<h4>1.1 Corriente Eléctrica</h4>
<p>La corriente eléctrica es el movimiento ordenado de portadores de carga (electrones libres) a través de un conductor. Se denomina con la letra <strong>I</strong> y se mide en <strong>Amperes (A)</strong>.</p>
<div class="formula">I = Q / t</div>
<p>Donde Q es la carga en Coulombs y t es el tiempo en segundos.</p>

<h4>1.2 Tensión o Diferencia de Potencial (D.D.P.)</h4>
<p>La tensión o diferencia de potencial es la fuerza electromotriz que impulsa a los electrones a través del circuito. Se representa con la letra <strong>V</strong> (o U) y se mide en <strong>Volts (V)</strong>.</p>
<div class="formula">V = W / Q</div>
<p>Donde W es el trabajo en Joules y Q la carga en Coulombs.</p>

<h4>1.3 Resistencia Eléctrica</h4>
<p>La resistencia es la oposición que ofrece un material al paso de la corriente eléctrica. Se simboliza con la letra <strong>R</strong> y se mide en <strong>Ohms (Ω)</strong>.</p>
<ul>
  <li><strong>Conductores:</strong> baja resistencia (cobre, aluminio, plata)</li>
  <li><strong>Aislantes:</strong> muy alta resistencia (caucho, plástico, vidrio)</li>
  <li><strong>Semiconductores:</strong> resistencia intermedia (silicio, germanio)</li>
</ul>

<h4>1.4 Ley de Ohm</h4>
<p>Establece la relación entre tensión, corriente y resistencia en un circuito:</p>
<div class="formula">V = I × R &nbsp;|&nbsp; I = V / R &nbsp;|&nbsp; R = V / I</div>
<div class="nota">📌 Importante: La ley de Ohm sólo es válida para elementos resistivos lineales (resistencias puras) a temperatura constante.</div>

<h4>1.5 Potencia y Energía Eléctrica</h4>
<p>La <strong>potencia</strong> indica la velocidad con que se transforma la energía eléctrica. Se mide en <strong>Watts (W)</strong>:</p>
<div class="formula">P = V × I = I² × R = V² / R</div>
<p>La <strong>energía eléctrica</strong> es la potencia consumida durante un tiempo:</p>
<div class="formula">E = P × t &nbsp;&nbsp;[Wh o kWh]</div>
`
  },
  {
    id: 2,
    title: 'Circuitos en Serie, Paralelo y Mixtos',
    topics: ['Asociación serie', 'Asociación paralelo', 'Circuitos mixtos', 'Divisor de tensión y corriente'],
    tag: 'Circuitos',
    content: `
<h4>2.1 Circuito en Serie</h4>
<p>En un circuito serie, los elementos están conectados uno a continuación del otro. La misma corriente circula por todos los elementos.</p>
<ul>
  <li>La corriente es igual en todos los elementos: <strong>I<sub>T</sub> = I<sub>1</sub> = I<sub>2</sub> = ... = I<sub>n</sub></strong></li>
  <li>La tensión total es la suma de las tensiones parciales: <strong>V<sub>T</sub> = V<sub>1</sub> + V<sub>2</sub> + ... + V<sub>n</sub></strong></li>
  <li>La resistencia equivalente es la suma: <strong>R<sub>eq</sub> = R<sub>1</sub> + R<sub>2</sub> + ... + R<sub>n</sub></strong></li>
</ul>

<h4>2.2 Circuito en Paralelo</h4>
<p>Los elementos están conectados entre los mismos dos nodos. La misma tensión aparece en todos.</p>
<ul>
  <li>La tensión es igual en todos: <strong>V<sub>T</sub> = V<sub>1</sub> = V<sub>2</sub> = ... = V<sub>n</sub></strong></li>
  <li>La corriente total es la suma: <strong>I<sub>T</sub> = I<sub>1</sub> + I<sub>2</sub> + ... + I<sub>n</sub></strong></li>
  <li>La resistencia equivalente: <strong>1/R<sub>eq</sub> = 1/R<sub>1</sub> + 1/R<sub>2</sub> + ... + 1/R<sub>n</sub></strong></li>
</ul>
<div class="formula">Para 2 resistencias en paralelo: R_eq = (R₁ × R₂) / (R₁ + R₂)</div>

<h4>2.3 Divisor de Tensión (Serie)</h4>
<div class="formula">V_x = V_T × (R_x / R_T)</div>

<h4>2.4 Divisor de Corriente (Paralelo)</h4>
<div class="formula">I_x = I_T × (R_eq / R_x)</div>

<div class="nota">📌 En circuitos mixtos: simplificá primero los grupos en paralelo, luego sumá las resistencias en serie.</div>
`
  },
  {
    id: 3,
    title: 'Leyes de Kirchhoff',
    topics: ['LCK — Ley de corrientes', 'LTK — Ley de tensiones', 'Análisis de mallas', 'Análisis nodal'],
    tag: 'Análisis',
    content: `
<h4>3.1 Primera Ley de Kirchhoff (LCK — Nodos)</h4>
<p>La suma algebraica de las corrientes que llegan a un nodo es igual a cero. O equivalentemente: <em>la suma de corrientes que entran = suma de corrientes que salen</em>.</p>
<div class="formula">Σ I_entrada = Σ I_salida</div>

<h4>3.2 Segunda Ley de Kirchhoff (LTK — Mallas)</h4>
<p>La suma algebraica de las tensiones en cualquier malla cerrada es igual a cero.</p>
<div class="formula">Σ V = 0 (en cualquier malla cerrada)</div>
<div class="nota">📌 Convención de signos: si recorremos la malla en el sentido de la corriente asumida, la caída en una resistencia es negativa; si la cruzamos en sentido contrario, es positiva.</div>

<h4>3.3 Análisis de Mallas</h4>
<ol>
  <li>Identificar las mallas independientes del circuito.</li>
  <li>Asumir una corriente de malla en cada una (sentido horario).</li>
  <li>Aplicar LTK en cada malla y plantear el sistema de ecuaciones.</li>
  <li>Resolver el sistema para encontrar las corrientes de malla.</li>
</ol>

<h4>3.4 Análisis Nodal</h4>
<ol>
  <li>Elegir un nodo de referencia (tierra).</li>
  <li>Asignar tensiones desconocidas a los demás nodos.</li>
  <li>Aplicar LCK en cada nodo no de referencia.</li>
  <li>Resolver el sistema de ecuaciones.</li>
</ol>
`
  },
  {
    id: 4,
    title: 'Corriente Alterna — CA',
    topics: ['Magnitudes de CA', 'Valor eficaz (RMS)', 'Frecuencia y período', 'Representación fasorial'],
    tag: 'CA',
    content: `
<h4>4.1 Definición y Características</h4>
<p>La corriente alterna (CA) es aquella que varía de forma periódica en el tiempo, alternando su dirección. La forma más común es la <strong>sinusoidal</strong>.</p>
<div class="formula">v(t) = V_p · sen(ωt + φ)</div>
<ul>
  <li><strong>V_p</strong>: valor pico o máximo [V]</li>
  <li><strong>ω</strong>: pulsación angular [rad/s] → ω = 2πf</li>
  <li><strong>f</strong>: frecuencia [Hz] — en Argentina la red es 50 Hz</li>
  <li><strong>T</strong>: período [s] → T = 1/f</li>
  <li><strong>φ</strong>: fase inicial [rad]</li>
</ul>

<h4>4.2 Valor Eficaz (RMS)</h4>
<p>El valor eficaz es el valor de CC equivalente en cuanto a potencia disipada.</p>
<div class="formula">V_rms = V_p / √2 ≈ 0,707 × V_p</div>
<p>En Argentina, la tensión de red es <strong>220 V RMS</strong>, por lo que el valor pico es ≈ 311 V.</p>

<h4>4.3 Representación Fasorial</h4>
<p>Un fasor es un número complejo que representa la amplitud y fase de una señal sinusoidal. Simplifica el análisis de circuitos CA.</p>
<div class="formula">V = V_rms ∠ φ</div>

<div class="nota">📌 En Argentina: frecuencia de red = 50 Hz, tensión = 220 V (monofásica) y 380 V (trifásica).</div>
`
  },
  {
    id: 5,
    title: 'Impedancia — R, L, C en CA',
    topics: ['Resistencia en CA', 'Reactancia inductiva XL', 'Reactancia capacitiva XC', 'Impedancia Z'],
    tag: 'Impedancia',
    content: `
<h4>5.1 Resistencia Pura (R) en CA</h4>
<p>La corriente y la tensión están <strong>en fase</strong> (φ = 0°). La resistencia en CA es la misma que en CC.</p>

<h4>5.2 Bobina (Inductor) en CA</h4>
<p>La corriente se <strong>atrasa 90°</strong> respecto de la tensión.</p>
<div class="formula">X_L = 2π · f · L &nbsp;&nbsp;[Ω]</div>
<p>Donde L es la inductancia en Henrys (H).</p>

<h4>5.3 Capacitor en CA</h4>
<p>La corriente se <strong>adelanta 90°</strong> respecto de la tensión.</p>
<div class="formula">X_C = 1 / (2π · f · C) &nbsp;&nbsp;[Ω]</div>
<p>Donde C es la capacitancia en Farads (F).</p>

<h4>5.4 Impedancia (Z)</h4>
<p>La impedancia es la oposición total al paso de la corriente alterna. Combina resistencia y reactancias.</p>
<div class="formula">Z = R + j·(X_L - X_C) &nbsp;&nbsp;|Z| = √(R² + (X_L - X_C)²)</div>
<div class="formula">φ = arctan((X_L - X_C) / R)</div>

<h4>5.5 Triángulo de Impedancias</h4>
<ul>
  <li>Si X_L > X_C → circuito <strong>inductivo</strong> (I atrasa)</li>
  <li>Si X_C > X_L → circuito <strong>capacitivo</strong> (I adelanta)</li>
  <li>Si X_L = X_C → <strong>resonancia</strong> (Z = R, máxima corriente)</li>
</ul>
`
  },
  {
    id: 6,
    title: 'Potencia en CA — Factor de Potencia',
    topics: ['Potencia activa P', 'Potencia reactiva Q', 'Potencia aparente S', 'Factor de potencia FP'],
    tag: 'Potencia',
    content: `
<h4>6.1 Tipos de Potencia</h4>
<p>En circuitos de corriente alterna existen tres tipos de potencia:</p>
<ul>
  <li><strong>Potencia Activa (P):</strong> la potencia real consumida y transformada en trabajo útil. Se mide en <strong>Watts [W]</strong>.</li>
  <li><strong>Potencia Reactiva (Q):</strong> intercambiada entre fuente y elementos reactivos (L y C). Se mide en <strong>VAR</strong>.</li>
  <li><strong>Potencia Aparente (S):</strong> la potencia total entregada por la fuente. Se mide en <strong>VA</strong>.</li>
</ul>

<h4>6.2 Fórmulas</h4>
<div class="formula">P = V · I · cos(φ) &nbsp;&nbsp;[W]</div>
<div class="formula">Q = V · I · sen(φ) &nbsp;&nbsp;[VAR]</div>
<div class="formula">S = V · I &nbsp;&nbsp;[VA]</div>
<div class="formula">S² = P² + Q² &nbsp;&nbsp;→ &nbsp;S = √(P² + Q²)</div>

<h4>6.3 Factor de Potencia (FP)</h4>
<div class="formula">FP = cos(φ) = P / S</div>
<p>El FP varía entre 0 y 1. Un FP = 1 (resistivo puro) indica máxima eficiencia. Un FP bajo implica mayor corriente para la misma potencia útil.</p>

<h4>6.4 Corrección del Factor de Potencia</h4>
<p>Se realiza colocando capacitores en paralelo con las cargas inductivas (motores, transformadores). Esto reduce la corriente reactiva y mejora la eficiencia del sistema.</p>
<div class="nota">📌 Las empresas distribuidoras penalizan a los usuarios industriales con FP menor a 0,85 según normativa ENRE.</div>
`
  }
];

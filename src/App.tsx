import React, { useEffect, useMemo, useState } from "react";
import CurrencyInput from './components/CurrencyInput';
import GlitchText from './components/GlitchText';
import GlitchImage from './components/GlitchImage';
import BudgetTable from './components/BudgetTable';
import { TrashIcon, EyeIcon, PencilSquareIcon, PrinterIcon } from "@heroicons/react/24/outline";
// Puedes cambiar a mono_light-icon-256.png, mono_teal-icon-256.png u original_cutout-icon-256.png
import logoMark from "../presupuestos_logo_pack/original_cutout-icon-256.png";
const normUnit = (u:string) => u.replace("²","2").replace("³","3").toLowerCase();
const clamp0 = (n:number) => Math.max(0, Number.isFinite(n)? n: 0);
const uid = () => Math.random().toString(36).slice(2,9);
// Formateador de moneda CLP
const fmt = (n: number) => new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
}).format(n || 0);

// ================= Datos base =================
const defaultResources: Record<string, any> = {
  jornal_maestro: { id: "jornal_maestro", tipo: "mano_obra", nombre: "Maestro jornal", unidad: "jornal", precio: 49500 },
  jornal_ayudante: { id: "jornal_ayudante", tipo: "mano_obra", nombre: "Ayudante jornal", unidad: "jornal", precio: 29915 },
  retro_4x4_hora: { id: "retro_4x4_hora", tipo: "equipo", nombre: "Retroexcavadora 4x4 hora", unidad: "hora", precio: 42000 },
  bomba_hora: { id: "bomba_hora", tipo: "equipo", nombre: "Bomba de hormigón hora", unidad: "hora", precio: 31303 },
  h25_m3: { id: "h25_m3", tipo: "material", nombre: "Hormigón H-25 (m³)", unidad: "m3", precio: 188836 },
  encofrado_m2: { id: "encofrado_m2", tipo: "material", nombre: "Madera encofrado (m²)", unidad: "m2", precio: 28442 },
  acero_kg: { id: "acero_kg", tipo: "material", nombre: "Acero A63-42H (kg)", unidad: "kg", precio: 3133 },
  topo_dia: { id: "topo_dia", tipo: "servicio", nombre: "Topografía con estación total (día)", unidad: "día", precio: 510000 },
};

function loadResources(){
  try{
    const saved = localStorage.getItem('apu-resources');
    return saved ? { ...defaultResources, ...JSON.parse(saved) } : defaultResources;
  }catch{ return defaultResources; }
}

// Catálogo base de APUs eliminado: solo se usan APUs personalizados guardados por el usuario

// Cálculo del unitario directo
function unitCost(apu:any, resources:Record<string, any>)
{
  // Preferir secciones si existen (materiales/equipos/manoObra/varios/extras)
  const sec:any = (apu as any)?.secciones;
  const sumRows = (arr:any[]) => (arr||[]).reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
  if(sec && typeof sec==='object'){
    const a = sumRows(sec.materiales||[]);
    const b = sumRows(sec.equipos||[]);
    const c = sumRows(sec.manoObra||[]);
    const d = sumRows(sec.varios||[]);
    const ext = (Array.isArray(sec.extras)? sec.extras : []).reduce((acc:number, s:any)=> acc + sumRows((s&&s.rows)||[]), 0);
    const total = a + b + c + d + ext;
    if(total > 0 || (
      ((sec.materiales||[]).length + (sec.equipos||[]).length + (sec.manoObra||[]).length + (sec.varios||[]).length) > 0 ||
      (Array.isArray(sec.extras) && sec.extras.length>0)
    )){
      return { unit: total };
    }
  }
  // Si no hay secciones, usar items base (coef/rendimiento)
  const total = (apu?.items||[]).reduce((acc:number, it:any)=>{
    const r = resources[it.resourceId]; if(!r) return acc;
    if(it.tipo==='coef') return acc + (it.coef||0) * r.precio * (1 + (it.merma||0));
    return acc + r.precio / (it.rendimiento||1);
  }, 0);
  return { unit: total };
}

// ================= App =================
export default function App(){
  // Tabs: proyecto | biblioteca | presupuesto
  const [tab, setTab] = useState<'proyecto'|'biblioteca'|'presupuesto'>('presupuesto');

  // Notificaciones
  const [notification, setNotification] = useState<{show:boolean; message:string; type:'success'|'error'|'info'}>({show:false, message:'', type:'success'});
  const showNotification = (message:string, type:'success'|'error'|'info'='success')=>{
    setNotification({ show:true, message, type });
    setTimeout(()=> setNotification(s=>({...s, show:false})), 2800);
  };

  // Recursos
  const [resources, setResources] = useState<Record<string, any>>(()=>loadResources());
  const updateResourcePrice = (id:string, value:any)=>{
    const precio = Number(value)||0;
    const next = { ...resources, [id]: { ...resources[id], precio } };
    setResources(next);
    try{ localStorage.setItem('apu-resources', JSON.stringify(next)); }catch{}
  };

  // Proyecto: gg/util/iva
  const [gg, setGG] = useState<number>(()=> Number(localStorage.getItem('apu-gg')||'0.18'));
  const [util, setUtil] = useState<number>(()=> Number(localStorage.getItem('apu-util')||'0.10'));
  const [iva, setIva] = useState<number>(()=> Number(localStorage.getItem('apu-iva')||'0.19'));
  useEffect(()=>{ localStorage.setItem('apu-gg', String(gg)); }, [gg]);
  useEffect(()=>{ localStorage.setItem('apu-util', String(util)); }, [util]);
  useEffect(()=>{ localStorage.setItem('apu-iva', String(iva)); }, [iva]);

  // Info proyecto + usuarios
  const [projectInfo, setProjectInfo] = useState<any>(()=>{
    try{ return JSON.parse(localStorage.getItem('apu-project')||'{}'); }catch{ return {}; }
  });
  const [users, setUsers] = useState<any[]>(()=>{
    try{ return JSON.parse(localStorage.getItem('apu-users')||'[]'); }catch{ return []; }
  });
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const handleSaveProjectInfo = (data:any)=>{
    setProjectInfo(data);
    if(typeof data.pctGG==='number') setGG((data.pctGG||0)/100);
    if(typeof data.pctUtil==='number') setUtil((data.pctUtil||0)/100);
    if(typeof data.pctIVA==='number') setIva((data.pctIVA||0)/100);
    try{ localStorage.setItem('apu-project', JSON.stringify(data)); }catch{}
    showNotification('Proyecto actualizado','success');
  };
  const handleSaveUser = (u:any)=>{
    const next = [...users, u]; setUsers(next); try{ localStorage.setItem('apu-users', JSON.stringify(next)); }catch{}; showNotification('Usuario creado','success');
  };

  // Biblioteca: personalizados
  const loadLibrary = ()=>{ try{ return JSON.parse(localStorage.getItem('apu-library')||'[]'); }catch{ return []; } };
  const saveLibrary = (arr:any[])=>{
    // Guardar sin códigos correlativos
    try{ localStorage.setItem('apu-library', JSON.stringify(arr||[])); }catch{}
    setCustomApus(arr||[]);
  };
  const [customApus, setCustomApus] = useState<any[]>(loadLibrary);
  const allApus = useMemo(()=>[...customApus], [customApus]);
  const getApuById = (id:string)=> allApus.find(a=>a.id===id);

  // Forzar siembra de nuevos APUs (sin piscina)
  const ensureNewApusPresent = ()=>{
    try{
      const lib = [...customApus];
      const addIfMissing = (id:string, builder: ()=>any)=>{
        if(!lib.find(a=>a.id===id)) lib.push(builder());
      };
      // Nuevos agregados (incluye piscina)
      addIfMissing('apu_excavacion_retiro_m3', buildApuExcavacionRetiroM3);
      addIfMissing('apu_base_estabilizada_10cm_m2', buildApuBaseEstabilizada10cmM2);
      addIfMissing('apu_encofrado_doble_cara_m2', buildApuEncofradoDobleCaraM2);
      addIfMissing('apu_enfierradura_kg', buildApuEnfierraduraKg);
      addIfMissing('apu_h25_obra_vibrado_m3', buildApuH25ObraVibradoM3);
      addIfMissing('apu_curado_humedo_m2', buildApuCuradoHumedoM2);
      addIfMissing('apu_imper_cementicia_2capas_m2', buildApuImperCementicia2capasM2);
      addIfMissing('apu_pintura_piscina_2manos_m2', buildApuPinturaPiscina2manosM2);
      // Red hidráulica (unitarios)
      addIfMissing('apu_red_hid_pvc50_tuberia_ml', buildApuRedHid_PVC50_Tuberia_ml);
      addIfMissing('apu_red_hid_codo_50_u', buildApuRedHid_Codo50_u);
      addIfMissing('apu_red_hid_tee_50_u', buildApuRedHid_Tee50_u);
      addIfMissing('apu_red_hid_valvula_bola_50_u', buildApuRedHid_ValvulaBola50_u);
      addIfMissing('apu_red_hid_skimmer_u', buildApuRedHid_Skimmer_u);
      addIfMissing('apu_red_hid_retorno_u', buildApuRedHid_Retorno_u);
      addIfMissing('apu_red_hid_desague_fondo_u', buildApuRedHid_DesagueFondo_u);
      addIfMissing('apu_red_hid_kit_filtro_bomba_set', buildApuRedHid_KitFiltroBomba_set);
      addIfMissing('apu_red_hid_arena_filtro_saco', buildApuRedHid_ArenaFiltro_saco);
      addIfMissing('apu_red_hid_pruebas_ls', buildApuRedHid_PruebasLS);
  addIfMissing('apu_red_hid_conjunto_set', buildApuRedHidConjuntoSet);
      const addedCount = lib.length - customApus.length;
      if(addedCount>0){
        saveLibrary(lib);
        // Mostrar en "Ver todos" y limpiar filtros para que se vean
        setLibScope('all');
        setLibSearch('');
        setLibCategory('all');
        showNotification(`Se agregaron ${addedCount} APUs a la biblioteca`,'success');
      } else {
        setLibScope('all');
        showNotification('No había APUs nuevos para agregar (ya están en la biblioteca)','info');
      }
    }catch{ showNotification('No se pudo resembrar APUs','error'); }
  };

  // Auto-verificación al montar: si faltan, re-sembrar
  useEffect(()=>{
    const need = [
      'apu_excavacion_retiro_m3',
      'apu_base_estabilizada_10cm_m2',
      'apu_encofrado_doble_cara_m2',
      'apu_enfierradura_kg',
      'apu_h25_obra_vibrado_m3',
      'apu_curado_humedo_m2',
      'apu_imper_cementicia_2capas_m2',
      'apu_pintura_piscina_2manos_m2',
      'apu_red_hid_pvc50_tuberia_ml',
      'apu_red_hid_codo_50_u',
      'apu_red_hid_tee_50_u',
      'apu_red_hid_valvula_bola_50_u',
      'apu_red_hid_skimmer_u',
      'apu_red_hid_retorno_u',
      'apu_red_hid_desague_fondo_u',
      'apu_red_hid_kit_filtro_bomba_set',
      'apu_red_hid_arena_filtro_saco',
      'apu_red_hid_pruebas_ls',
  'apu_red_hid_conjunto_set',
    ];
    const ids = new Set((customApus||[]).map((a:any)=>a.id));
    if(need.some(id=>!ids.has(id))){
      ensureNewApusPresent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proyectos guardados (snapshots de presupuesto)
  const ensureArrayProjects = (val:any): any[] => {
    if(Array.isArray(val)) return val;
    if(val && typeof val==='object') return [val];
    return [];
  };
  const loadProjects = () => { try{ const parsed = JSON.parse(localStorage.getItem('apu-projects')||'[]'); return ensureArrayProjects(parsed); }catch{ return []; } };
  const saveProjects = (list:any[])=>{ const arr = ensureArrayProjects(list); try{ localStorage.setItem('apu-projects', JSON.stringify(arr)); }catch{}; setProjects(arr); };
  const [projects, setProjects] = useState<any[]>(loadProjects);
  // Migración: si había un objeto simple, normalizar a arreglo en primer render
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('apu-projects');
      if(raw!=null){ const parsed = JSON.parse(raw); const norm = ensureArrayProjects(parsed); if(JSON.stringify(parsed)!==JSON.stringify(norm)){ localStorage.setItem('apu-projects', JSON.stringify(norm)); } setProjects(norm); }
    }catch{}
  }, []);
  // Al entrar a la pestaña Proyecto, recargar desde localStorage por si hubo cambios previos
  useEffect(()=>{
    if(tab==='proyecto'){
      try{ setProjects(loadProjects()); }catch{}
    }
  }, [tab]);

  // APU: Hormigón H-25 hecho en obra (1 m³)
  const buildApuH25Obra = () => {
    // Mano de obra separada por rol, calculada desde montos mensuales (Indeed Chile),
    // asumiendo 22 días laborales/mes y rendimiento 3 m³ por jornada.
    const diasMes = 22;
    const rendimientoM3PorDia = 3;
    const maestroMensual = 827_327; // CLP/mes
    const ayudanteMensual = 480_457; // CLP/mes
    const costoMaestroPorM3 = Math.round(maestroMensual / diasMes / rendimientoM3PorDia); // ≈ 12.5k
    const costoAyudantePorM3 = Math.round(ayudanteMensual / diasMes / rendimientoM3PorDia); // ≈ 7.3k

    return {
      id: 'apu_h25_obra',
      descripcion: 'Hormigón H-25 hecho en obra',
      unidadSalida: 'm3',
      categoria: 'Obra gruesa',
      codigoExterno: '03-020',
      secciones: {
        materiales: [
          { descripcion: 'Cemento 25 kg (saco)', unidad: 'saco', cantidad: 14, pu: 4790 }, // $67.060
          { descripcion: 'Arena a granel', unidad: 'm3', cantidad: 0.563, pu: 32900 },     // ≈ $18.523
          { descripcion: 'Grava 3/4" a granel', unidad: 'm3', cantidad: 0.704, pu: 21900 }, // ≈ $15.418
          { descripcion: 'Agua', unidad: 'm3', cantidad: 0.141, pu: 0 },
        ],
        manoObra: [
          { descripcion: 'Maestro (rend. 3 m³/jornada)', unidad: 'm3', cantidad: 1, pu: costoMaestroPorM3 },
          { descripcion: 'Ayudante (rend. 3 m³/jornada)', unidad: 'm3', cantidad: 1, pu: costoAyudantePorM3 },
        ],
        equipos: [
          { descripcion: 'Betonera 90–150 L', unidad: 'm3', cantidad: 1, pu: 3617 },
          { descripcion: 'Vibrador de inmersión', unidad: 'm3', cantidad: 1, pu: 5000 },
        ],
        varios: [],
      }
    } as any;
  };

  // APU: Moldaje Terciado 1 m² (muro doble cara)
  const buildApuMoldajeTerciado = () => ({
    id: 'apu_moldaje_terciado_m2',
    descripcion: 'Moldaje Terciado (muro doble cara)',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Terciado 15 mm 1,22×2,44 (12 reusos, 10% merma)', unidad: 'm2', cantidad: 1, pu: 1324 },
        { descripcion: 'Pino 2×3 prorrateo (3,0 m / 15 reusos)', unidad: 'm2', cantidad: 1, pu: 247 },
        { descripcion: 'Desmoldante Topex (prorrateo)', unidad: 'm2', cantidad: 1, pu: 142 },
        { descripcion: 'Clavo 2½" (0,2 kg/m²)', unidad: 'm2', cantidad: 1, pu: 362 },
        { descripcion: 'Amarras (4 u/m²)', unidad: 'm2', cantidad: 1, pu: 9107 },
      ],
      manoObra: [
        { descripcion: 'Carpintero (12 m²/día, 9 h/día)', unidad: 'm2', cantidad: 1, pu: 5265 },
        { descripcion: 'Ayudante (12 m²/día, 9 h/día)', unidad: 'm2', cantidad: 1, pu: 5264 },
      ],
      equipos: [
        { descripcion: 'Puntales y prensas (prorrateo simple)', unidad: 'm2', cantidad: 1, pu: 1000 },
      ],
      varios: [],
    }
  } as any);

  // APU: Muro de ladrillo 1 m² (ladrillo fiscal 29×14×8)
  const buildApuMuroLadrillo = () => {
    const sacosMortero = Number((29.3 / 14.5).toFixed(3)); // 29,3 L / 14,5 L por saco ≈ 2,021 sacos
    const moTotal = 18000; // $/m² (1 maestro + 1 ayudante, rto 5 m²/jrn)
    const moMaestro = 9000; // Supuesto: 50/50 del total
    const moAyudante = moTotal - moMaestro; // 9000
    const herramientasMenores = Math.round(moTotal * 0.05); // 5% de MO ⇒ 900

    return {
      id: 'apu_muro_ladrillo_m2',
      descripcion: 'Muro de ladrillo fiscal 29×14×8',
      unidadSalida: 'm2',
      categoria: 'Obra gruesa',
      codigoExterno: '',
      secciones: {
        materiales: [
          { descripcion: 'Ladrillo fiscal 29×14×8', unidad: 'u', cantidad: 36.75, pu: 390 }, // ≈ $14.332
          { descripcion: 'Mortero de pega 25 kg (14,5 L/saco)', unidad: 'saco', cantidad: sacosMortero, pu: 2650 }, // ≈ $5.355
        ],
        manoObra: [
          { descripcion: 'Maestro (1+1; rend. 5 m²/jrn)', unidad: 'm2', cantidad: 1, pu: moMaestro },
          { descripcion: 'Ayudante (1+1; rend. 5 m²/jrn)', unidad: 'm2', cantidad: 1, pu: moAyudante },
        ],
        equipos: [],
        varios: [
          { descripcion: 'Herramientas menores (5% de MO)', unidad: 'm2', cantidad: 1, pu: herramientasMenores },
        ],
      }
    } as any;
  };

  // ===== Nuevos APUs solicitados =====
  const buildApuExcavacionZanjaManual = () => ({
    id: 'apu_exc_zanja_manual',
    descripcion: 'Excavación de zanja manual',
    unidadSalida: 'm3',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [],
      manoObra: [
        { descripcion: 'Maestro (5 m³/jornal)', unidad: 'm3', cantidad: 1, pu: 9000 },
        { descripcion: 'Ayudante (5 m³/jornal)', unidad: 'm3', cantidad: 1, pu: 9000 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores (5% de MO)', unidad: 'm3', cantidad: 1, pu: 900 } ],
    }
  } as any);

  const buildApuRellenoCompactManual = () => ({
    id: 'apu_relleno_compact_manual',
    descripcion: 'Relleno y compactación manual',
    unidadSalida: 'm3',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Agua', unidad: 'm3', cantidad: 1, pu: 200 } ],
      manoObra: [
        { descripcion: 'Maestro (8 m³/jornal)', unidad: 'm3', cantidad: 1, pu: 5625 },
        { descripcion: 'Ayudante (8 m³/jornal)', unidad: 'm3', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm3', cantidad: 1, pu: 560 } ],
    }
  } as any);

  const buildApuZapataCorridaEnZanja = () => ({
    id: 'apu_hormigon_zapata_corrida_ml',
    descripcion: 'Hormigón en zapata corrida 0,40×0,20 (en zanja)',
    unidadSalida: 'ml',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Hormigón preparado 25 kg (7 sacos/ml)', unidad: 'ml', cantidad: 1, pu: 22680 },
        { descripcion: 'Acero A630 Ø10 (4 m/ml)', unidad: 'ml', cantidad: 1, pu: 4590 },
        { descripcion: 'Estribos Ø6 c/20 cm (estim.)', unidad: 'ml', cantidad: 1, pu: 2500 },
        { descripcion: 'Alambre recocido 0,05 kg/ml', unidad: 'ml', cantidad: 1, pu: 185 },
      ],
      manoObra: [
        { descripcion: 'Maestro (8 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 5625 },
        { descripcion: 'Ayudante (8 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'ml', cantidad: 1, pu: 560 } ],
    }
  } as any);

  const buildApuRadierH25ConMalla = () => ({
    id: 'apu_radier_h25_10cm_malla_polietileno',
    descripcion: 'Radier H-25 10 cm con malla y polietileno',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Cemento 25 kg (1,4 sacos/m²)', unidad: 'm2', cantidad: 1, pu: 6706 },
        { descripcion: 'Arena 25 kg (2 sacos/m²)', unidad: 'm2', cantidad: 1, pu: 1880 },
        { descripcion: 'Gravilla 25 kg (3 sacos/m²)', unidad: 'm2', cantidad: 1, pu: 2670 },
        { descripcion: 'Malla ACMA C-92', unidad: 'm2', cantidad: 1, pu: 1769 },
        { descripcion: 'Polietileno 4×10 m', unidad: 'm2', cantidad: 1, pu: 375 },
        { descripcion: 'Alambre recocido', unidad: 'm2', cantidad: 1, pu: 185 },
      ],
      manoObra: [
        { descripcion: 'Maestro (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3575 },
        { descripcion: 'Ayudante (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3575 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores y misceláneos', unidad: 'm2', cantidad: 1, pu: 315 } ],
    }
  } as any);

  const buildApuAlbanileriaLadrilloComun = () => ({
    id: 'apu_albanileria_ladrillo_fiscal_m2',
    descripcion: 'Albañilería ladrillo fiscal (aparejo común)',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Ladrillo fiscal (25 u/m²)', unidad: 'm2', cantidad: 1, pu: 7750 },
        { descripcion: 'Mortero: cemento + arena', unidad: 'm2', cantidad: 1, pu: 7610 },
      ],
      manoObra: [
        { descripcion: 'Maestro (5 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 9000 },
        { descripcion: 'Ayudante (5 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 9000 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 900 } ],
    }
  } as any);

  const buildApuTabiqueMetalconDoblePlaca = () => ({
    id: 'apu_tabique_metalcon_90_doble_placa',
    descripcion: 'Tabique Metalcon 90 mm, doble placa 12,5 mm + lana 50 mm',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Montante C90 (2,7 m/m²)', unidad: 'm2', cantidad: 1, pu: 4585 },
        { descripcion: 'Solera U92 (0,8 m/m²)', unidad: 'm2', cantidad: 1, pu: 1165 },
        { descripcion: 'Yeso-cartón 12,5 mm (doble cara)', unidad: 'm2', cantidad: 1, pu: 7738 },
        { descripcion: 'Lana 50 mm', unidad: 'm2', cantidad: 1, pu: 1874 },
        { descripcion: 'Tornillos yeso-cartón (18 u/m²)', unidad: 'm2', cantidad: 1, pu: 212 },
        { descripcion: 'Cinta juntas (1,5 m/m²)', unidad: 'm2', cantidad: 1, pu: 153 },
        { descripcion: 'Masilla juntas 5 kg (0,6 kg/m²)', unidad: 'm2', cantidad: 1, pu: 899 },
      ],
      manoObra: [
        { descripcion: 'Maestro (10 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 4500 },
        { descripcion: 'Ayudante (10 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 4500 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 450 } ],
    }
  } as any);

  const buildApuCieloRasoYesoCarton = () => ({
    id: 'apu_cielo_yeso_carton_12_5_sobre_perf',
    descripcion: 'Cielo raso yeso-cartón 12,5 mm sobre perfilería existente',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Yeso-cartón 12,5 mm', unidad: 'm2', cantidad: 1, pu: 3867 },
        { descripcion: 'Tornillos drywall (18 u/m²)', unidad: 'm2', cantidad: 1, pu: 212 },
        { descripcion: 'Cinta juntas', unidad: 'm2', cantidad: 1, pu: 153 },
        { descripcion: 'Masilla juntas 5 kg (0,6 kg/m²)', unidad: 'm2', cantidad: 1, pu: 899 },
      ],
      manoObra: [
        { descripcion: 'Maestro (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3750 },
        { descripcion: 'Ayudante (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3750 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 375 } ],
    }
  } as any);

  const buildApuEstructuraTechumbreMadera = () => ({
    id: 'apu_estructura_techumbre_madera',
    descripcion: 'Estructura de techumbre en madera (cerchas pino 2×6 @60 cm)',
    unidadSalida: 'm2',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Madera + fijaciones (estimado)', unidad: 'm2', cantidad: 1, pu: 12200 } ],
      manoObra: [
        { descripcion: 'Maestro (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
        { descripcion: 'Ayudante (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 563 } ],
    }
  } as any);

  const buildApuCubiertaZincFieltro = () => ({
    id: 'apu_cubierta_zinc_0_35_fieltro',
    descripcion: 'Cubierta zinc acanalado 0,35 mm + fieltro',
    unidadSalida: 'm2',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Plancha zinc 0,35', unidad: 'm2', cantidad: 1, pu: 6506 },
        { descripcion: 'Fieltro asfáltico 15 lb', unidad: 'm2', cantidad: 1, pu: 2589 },
        { descripcion: 'Tornillos techo (6 u/m²)', unidad: 'm2', cantidad: 1, pu: 317 },
      ],
      manoObra: [
        { descripcion: 'Maestro (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3750 },
        { descripcion: 'Ayudante (12 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 3750 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 375 } ],
    }
  } as any);

  // Techumbre completa con teja asfáltica (por m²)
  const buildApuTechumbreTejaAsfaltica = () => ({
    id: 'apu_techumbre_teja_asfaltica_m2',
    descripcion: 'Techumbre OSB 11 + fieltro + teja asfáltica',
    unidadSalida: 'm2',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'OSB 11 mm (0,336 pl/m²)', unidad: 'm2', cantidad: 1, pu: 6600 },
        { descripcion: 'Fieltro asfáltico 15 lb', unidad: 'm2', cantidad: 1, pu: 225 },
        { descripcion: 'Teja asfáltica (económica)', unidad: 'm2', cantidad: 1, pu: 9990 },
        { descripcion: 'Clavos/asfaltos', unidad: 'm2', cantidad: 1, pu: 800 },
        { descripcion: 'Estructura de techumbre en madera (proporción)', unidad: 'm2', cantidad: 1, pu: 13000 },
      ],
      manoObra: [
        { descripcion: 'Maestro techumbre', unidad: 'm2', cantidad: 1, pu: 5000 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 5000 },
      ],
      equipos: [],
      varios: [{ descripcion: 'Misceláneos', unidad: 'm2', cantidad: 1, pu: 485 }],
    }
  } as any);

  // Cielo + EPS 100 mm (por m²)
  const buildApuCieloYesoMasAislacion = () => ({
    id: 'apu_cielo_yeso_eps100',
    descripcion: 'Cielo raso yeso-cartón + aislación EPS 100 mm',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Yeso-cartón 10 mm', unidad: 'm2', cantidad: 1, pu: 2290 },
        { descripcion: 'Listonería y fijaciones', unidad: 'm2', cantidad: 1, pu: 2500 },
        { descripcion: 'EPS 100 mm', unidad: 'm2', cantidad: 1, pu: 3000 },
        { descripcion: 'Cinta, pasta, tornillos', unidad: 'm2', cantidad: 1, pu: 1400 },
      ],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 3500 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 3500 },
      ],
      equipos: [],
      varios: [{ descripcion: 'Misceláneos', unidad: 'm2', cantidad: 1, pu: 1620 }],
    }
  } as any);

  // Porcelanato estar-comedor (por m²)
  const buildApuPorcelanato = () => ({
    id: 'apu_piso_porcelanato_60x60',
    descripcion: 'Porcelanato 60×60 + adhesivo + fragüe',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Porcelanato 60×60', unidad: 'm2', cantidad: 1, pu: 7990 },
        { descripcion: 'Adhesivo porcelanato', unidad: 'm2', cantidad: 1, pu: 1800 },
        { descripcion: 'Fragüe', unidad: 'm2', cantidad: 1, pu: 685 },
      ],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 4250 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 4250 },
      ],
      equipos: [],
      varios: [{ descripcion: 'Misceláneos', unidad: 'm2', cantidad: 1, pu: 110 }],
    }
  } as any);

  // Cerámica piso (por m²)
  const buildApuCeramicaPiso = () => ({
    id: 'apu_piso_ceramica_base',
    descripcion: 'Cerámica piso + adhesivo + fragüe',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Cerámica piso', unidad: 'm2', cantidad: 1, pu: 4690 },
        { descripcion: 'Adhesivo', unidad: 'm2', cantidad: 1, pu: 1800 },
        { descripcion: 'Fragüe', unidad: 'm2', cantidad: 1, pu: 685 },
      ],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 4000 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 4000 },
      ],
      equipos: [],
      varios: [{ descripcion: 'Misceláneos', unidad: 'm2', cantidad: 1, pu: 110 }],
    }
  } as any);

  // Piso flotante (por m²)
  const buildApuPisoFlotante = () => ({
    id: 'apu_piso_flotante_7mm',
    descripcion: 'Piso flotante 7 mm + bajo mantención + guardapolvo',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Lámina piso flotante 7 mm', unidad: 'm2', cantidad: 1, pu: 6990 },
        { descripcion: 'Bajo-mantención', unidad: 'm2', cantidad: 1, pu: 500 },
        { descripcion: 'Guardapolvo', unidad: 'm2', cantidad: 1, pu: 1000 },
      ],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 3000 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 3000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  // Cerámica muros de baño (por m²)
  const buildApuCeramicaMuroBano = () => ({
    id: 'apu_ceramica_muro_bano',
    descripcion: 'Cerámica muros baño + adhesivo + fragüe',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Cerámica muro', unidad: 'm2', cantidad: 1, pu: 4690 },
        { descripcion: 'Adhesivo', unidad: 'm2', cantidad: 1, pu: 1800 },
        { descripcion: 'Fragüe', unidad: 'm2', cantidad: 1, pu: 695 },
      ],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 5000 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 5000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  // Pintura exterior (fibrocemento)
  const buildApuPinturaExteriorFibro = () => ({
    id: 'apu_pintura_exterior_fibro',
    descripcion: 'Pintura exterior en fibrocemento (esmalte al agua)',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [{ descripcion: 'Pintura + insumos', unidad: 'm2', cantidad: 1, pu: 1500 }],
      manoObra: [
        { descripcion: 'Maestro', unidad: 'm2', cantidad: 1, pu: 1500 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 1500 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  // Eléctrica completa (global 1 u)
  const buildApuElectricaCompleta = () => ({
    id: 'apu_electrica_completa_gl',
    descripcion: 'Instalación eléctrica completa vivienda 100 m²',
    unidadSalida: 'u',
    categoria: 'Instalaciones eléctricas',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Sistema completo', unidad: 'u', cantidad: 1, pu: 1480000 } ] }
  } as any);

  // Sanitaria completa (global 1 u)
  const buildApuSanitariaCompleta = () => ({
    id: 'apu_sanitaria_completa_gl',
    descripcion: 'Instalación sanitaria completa 2 baños + cocina + lavadero + calefón',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Sistema completo', unidad: 'u', cantidad: 1, pu: 2520000 } ] }
  } as any);

  // Terminaciones menores por ml (globalizable)
  const buildApuTerminacionesMenoresML = () => ({
    id: 'apu_terminaciones_menores_ml',
    descripcion: 'Guardapolvos, zócalos, cornisas (todo costo)',
    unidadSalida: 'ml',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'ml', cantidad: 1, pu: 3000 } ] }
  } as any);

  // Trámites (servicios globales)
  const buildApuTramiteDom = () => ({ id: 'apu_tramite_dom_permiso', descripcion: 'Permiso de edificación y derechos DOM', unidadSalida: 'u', categoria: 'Servicios', secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Permiso DOM', unidad: 'u', cantidad: 1, pu: 700000 } ] } } as any);
  const buildApuTramiteCalculo = () => ({ id: 'apu_tramite_calculo_estructural', descripcion: 'Cálculo estructural vivienda liviana', unidadSalida: 'u', categoria: 'Servicios', secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Cálculo estructural', unidad: 'u', cantidad: 1, pu: 600000 } ] } } as any);
  const buildApuTramiteRecepcion = () => ({ id: 'apu_tramite_recepcion_final', descripcion: 'Recepción final, certificados y copias', unidadSalida: 'u', categoria: 'Servicios', secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Recepción final y certificados', unidad: 'u', cantidad: 1, pu: 300000 } ] } } as any);
  const buildApuTramiteTE1 = () => ({ id: 'apu_tramite_te1_sec', descripcion: 'SEC/TE1 eléctrica', unidadSalida: 'u', categoria: 'Servicios', secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'SEC/TE1', unidad: 'u', cantidad: 1, pu: 120000 } ] } } as any);

  const buildApuCanaletaPVC4 = () => ({
    id: 'apu_canaleta_pvc_4_instalada',
    descripcion: 'Canaleta PVC 4" instalada',
    unidadSalida: 'ml',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
          { descripcion: 'Canaleta + uniones/soportes', unidad: 'ml', cantidad: 1, pu: 1923 },
      ],
      manoObra: [
        { descripcion: 'Maestro (20 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 2250 },
        { descripcion: 'Ayudante (20 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 2250 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'ml', cantidad: 1, pu: 225 } ],
    }
  } as any);

  const buildApuBajadaAguasLLuvias75 = () => ({
    id: 'apu_bajada_lluvias_pvc_75_instalada',
    descripcion: 'Bajada de aguas lluvias PVC Ø75 mm instalada',
    unidadSalida: 'ml',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
  materiales: [ { descripcion: 'Tubo + codos/anclajes', unidad: 'ml', cantidad: 1, pu: 3197 } ],
        manoObra: [
          { descripcion: 'Maestro (20 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 2250 },
          { descripcion: 'Ayudante (20 ml/jornal)', unidad: 'ml', cantidad: 1, pu: 2250 },
        ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'ml', cantidad: 1, pu: 225 } ],
    }
  } as any);

  const buildApuRevestimientoFibrocemento = () => ({
    id: 'apu_revestimiento_exterior_fibro_6mm_sobre_liston',
    descripcion: 'Revestimiento exterior fibrocemento 6 mm sobre listón',
    unidadSalida: 'm2',
    categoria: 'Fachada',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Placa fibrocemento 6 mm', unidad: 'm2', cantidad: 1, pu: 5318 },
        { descripcion: 'Tornillo lenteja (12 u/m²)', unidad: 'm2', cantidad: 1, pu: 271 },
        { descripcion: 'Listón pino (1,2 m/m²)', unidad: 'm2', cantidad: 1, pu: 656 },
        { descripcion: 'Masilla juntas fibrocemento', unidad: 'm2', cantidad: 1, pu: 800 },
      ],
      manoObra: [
        { descripcion: 'Maestro (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
        { descripcion: 'Ayudante (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 563 } ],
    }
  } as any);

  // APU: Muro exterior 2×4 @40 cm + OSB 11 mm + lana 80 mm + fibrocemento 6 mm pintado (por m²)
  const buildApuMuroExtMaderaOsbFc = () => ({
    id: 'apu_muro_ext_2x4_osb11_lana80_fc6_pint',
    descripcion: 'Muro exterior 2×4 @40 + OSB 11 mm + lana 80 mm + fibrocemento 6 mm pintado',
    unidadSalida: 'm2',
    categoria: 'Fachada',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Madera pino 2×4 3,2 m (2,5 pzs/m²)', unidad: 'm2', cantidad: 1, pu: 12975 },
        { descripcion: 'OSB 11 mm (0,336 pl/m²)', unidad: 'm2', cantidad: 1, pu: 6600 },
        { descripcion: 'Lana mineral 80 mm', unidad: 'm2', cantidad: 1, pu: 7500 },
        { descripcion: 'Fibrocemento 6 mm (0,347 pl/m²)', unidad: 'm2', cantidad: 1, pu: 4700 },
        { descripcion: 'Tornillos, clavos, cintas y sellos', unidad: 'm2', cantidad: 1, pu: 877 },
        { descripcion: 'Pintura exterior (materiales)', unidad: 'm2', cantidad: 1, pu: 4200 },
      ],
      manoObra: [
        { descripcion: 'Maestro carpintero', unidad: 'm2', cantidad: 1, pu: 6000 },
        { descripcion: 'Ayudante carpintería', unidad: 'm2', cantidad: 1, pu: 6000 },
      ],
      equipos: [],
      varios: [
        { descripcion: 'Merma y misceláneos (10% materiales)', unidad: 'm2', cantidad: 1, pu: 3548 },
      ],
    }
  } as any);

  // APU: Tabique interior 2×4 + volcanita simple (ambas caras) por m²
  const buildApuTabiqueMaderaVolcanitaSimple = () => ({
    id: 'apu_tabique_2x4_volcanita_simple',
    descripcion: 'Tabique interior 2×4 + volcanita 10 mm simple (ambas caras)',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Madera pino 2×4 (2,19 pzs/m²)', unidad: 'm2', cantidad: 1, pu: 11366 },
        { descripcion: 'Volcanita 10 mm (0,694 pl/m²)', unidad: 'm2', cantidad: 1, pu: 4580 },
        { descripcion: 'Tornillos yeso, cinta y pasta', unidad: 'm2', cantidad: 1, pu: 2100 },
      ],
      manoObra: [
        { descripcion: 'Yesero/maestro', unidad: 'm2', cantidad: 1, pu: 4000 },
        { descripcion: 'Ayudante', unidad: 'm2', cantidad: 1, pu: 4000 },
      ],
      equipos: [],
      varios: [
        { descripcion: 'Merma y misceláneos (ajuste)', unidad: 'm2', cantidad: 1, pu: 2584 },
      ],
    }
  } as any);

  const buildApuPisoCeramica = () => ({
    id: 'apu_piso_ceramica_60x60',
    descripcion: 'Piso cerámica 60×60 sobre radier afinado',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Cerámica 60×60 (estimado)', unidad: 'm2', cantidad: 1, pu: 8000 },
        { descripcion: 'Adhesivo cerámico', unidad: 'm2', cantidad: 1, pu: 700 },
        { descripcion: 'Fragüe', unidad: 'm2', cantidad: 1, pu: 327 },
      ],
      manoObra: [
        { descripcion: 'Maestro (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
        { descripcion: 'Ayudante (8 m²/jornal)', unidad: 'm2', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 563 } ],
    }
  } as any);

  const buildApuPinturaInteriorLatex = () => ({
    id: 'apu_pintura_interior_latex_muros',
    descripcion: 'Pintura interior muros, látex mate, 2 manos sobre yeso',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Tineta látex + insumos', unidad: 'm2', cantidad: 1, pu: 898 },
      ],
      manoObra: [
        { descripcion: 'Maestro (35 m²/jornal, 2 manos)', unidad: 'm2', cantidad: 1, pu: 1286 },
        { descripcion: 'Ayudante (35 m²/jornal, 2 manos)', unidad: 'm2', cantidad: 1, pu: 1285 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'm2', cantidad: 1, pu: 129 } ],
    }
  } as any);

  const buildApuVentanaAluminio = () => ({
    id: 'apu_ventana_aluminio_120x100_instalada',
    descripcion: 'Ventana aluminio corredera 120×100 instalada',
    unidadSalida: 'u',
    categoria: 'Aberturas',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Ventana + sellos', unidad: 'u', cantidad: 1, pu: 77613 } ],
      manoObra: [
        { descripcion: 'Maestro (0,25 jornal/u)', unidad: 'u', cantidad: 1, pu: 11250 },
        { descripcion: 'Ayudante (0,25 jornal/u)', unidad: 'u', cantidad: 1, pu: 11250 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'u', cantidad: 1, pu: 1125 } ],
    }
  } as any);

  const buildApuVentanaAluminio100x100 = () => ({
    id: 'apu_ventana_aluminio_100x100_instalada',
    descripcion: 'Ventana aluminio corredera 100×100 instalada',
    unidadSalida: 'u',
    categoria: 'Aberturas',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Ventana + sellos', unidad: 'u', cantidad: 1, pu: 215000 } ],
      manoObra: [
        { descripcion: 'Maestro (0,30 jornal/u)', unidad: 'u', cantidad: 1, pu: 15000 },
        { descripcion: 'Ayudante (0,30 jornal/u)', unidad: 'u', cantidad: 1, pu: 15000 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'u', cantidad: 1, pu: 990 } ],
    }
  } as any);

  const buildApuPuertaInteriorMdf = () => ({
    id: 'apu_puerta_interior_mdf_70x200_instalada',
    descripcion: 'Puerta interior MDF 70×200 instalada',
    unidadSalida: 'u',
    categoria: 'Aberturas',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Hoja + cerradura + bisagras + contramarco', unidad: 'u', cantidad: 1, pu: 86650 } ],
      manoObra: [
        { descripcion: 'Maestro (0,30 jornal/u)', unidad: 'u', cantidad: 1, pu: 13500 },
        { descripcion: 'Ayudante (0,30 jornal/u)', unidad: 'u', cantidad: 1, pu: 13500 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'u', cantidad: 1, pu: 1350 } ],
    }
  } as any);

  const buildApuPuertaExteriorAcero = () => ({
    id: 'apu_puerta_exterior_acero_90x200_instalada',
    descripcion: 'Puerta exterior acero 90×200 instalada',
    unidadSalida: 'u',
    categoria: 'Aberturas',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Hoja acero + cerradura exterior + bisagras + marco', unidad: 'u', cantidad: 1, pu: 292990 } ],
      manoObra: [
        { descripcion: 'Maestro (0,40 jornal/u)', unidad: 'u', cantidad: 1, pu: 18000 },
        { descripcion: 'Ayudante (0,40 jornal/u)', unidad: 'u', cantidad: 1, pu: 18000 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Espumas/sellos y herramientas', unidad: 'u', cantidad: 1, pu: 2000 } ],
    }
  } as any);

  const buildApuVentanaAluminio6040 = () => ({
    id: 'apu_ventana_aluminio_60x40_instalada',
    descripcion: 'Ventana aluminio corredera 60×40 instalada',
    unidadSalida: 'u',
    categoria: 'Aberturas',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Ventana + sellos', unidad: 'u', cantidad: 1, pu: 81100 } ],
      manoObra: [
        { descripcion: 'Maestro (0,20 jornal/u)', unidad: 'u', cantidad: 1, pu: 9000 },
        { descripcion: 'Ayudante (0,20 jornal/u)', unidad: 'u', cantidad: 1, pu: 9000 },
      ],
      equipos: [],
      varios: [ { descripcion: 'Herramientas menores', unidad: 'u', cantidad: 1, pu: 900 } ],
    }
  } as any);

  // ===== APUs solicitados por el usuario (MO base; materiales/equipos a completar) =====
  const buildApuSubbaseEstabilizada15cm = () => ({
    id: 'apu_subbase_estab_15cm_m2',
    descripcion: 'Subbase estabilizada 15 cm compactada',
    unidadSalida: 'm2',
    categoria: 'Movimiento de tierras',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 5.0 },
      materiales: [
        { descripcion: 'Base chancada (15 cm) + 5% merma', unidad: 'm3', cantidad: 0.1575, pu: 20000 },
        { descripcion: 'Geotextil 200 g/m²', unidad: 'm2', cantidad: 1.0, pu: 1199 },
        { descripcion: 'Agua riego', unidad: 'm2', cantidad: 1.0, pu: 100 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,20 h/m²)', unidad: 'm2', cantidad: 1, pu: 2250 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 300 },
        { descripcion: 'Obs: placa vibratoria/rodillo; humedad óptima. Rendimiento: 5,0 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuMuroExt23OsbHousewrapLanaYeso = () => ({
    id: 'apu_muro_ext_23_osb_house_lana_yeso_m2',
    descripcion: 'Muro exterior 2×3 + OSB11 + housewrap + lana 100 + yeso int.',
    unidadSalida: 'm2',
    categoria: 'Fachada',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 0.70 },
      materiales: [
        { descripcion: 'Madera 2×3" estructura + 5% merma', unidad: 'ml', cantidad: 3.36, pu: 1200 },
        { descripcion: 'Madera 2×3" soleras + 3% merma', unidad: 'ml', cantidad: 0.824, pu: 1200 },
        { descripcion: 'OSB 11 mm + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 7000 },
        { descripcion: 'Membrana hidrófuga + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 1800 },
        { descripcion: 'Lana de vidrio 100 mm', unidad: 'm2', cantidad: 1.0, pu: 4753 },
        { descripcion: 'Yeso-cartón 12,5 mm', unidad: 'm2', cantidad: 1.0, pu: 5309 },
        { descripcion: 'Tornillos, clavos, cintas', unidad: 'm2', cantidad: 1.0, pu: 1200 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (1,42 h/m²)', unidad: 'm2', cantidad: 1, pu: 16000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 600 },
        { descripcion: 'Obs: topes sísmicos y barrera de vapor. Rendimiento: 0,70 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuEIFS40mm = () => ({
    id: 'apu_eifs_40mm_m2',
    descripcion: 'EIFS 40 mm (EPS + basecoat+malla + terminación)',
    unidadSalida: 'm2',
    categoria: 'Fachada',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 0.94 },
      materiales: [
        { descripcion: 'EPS 40 mm + 3% merma', unidad: 'm2', cantidad: 1.03, pu: 3500 },
        { descripcion: 'Basecoat + 5% merma', unidad: 'kg', cantidad: 5.25, pu: 560 },
        { descripcion: 'Malla 160 g + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 1500 },
        { descripcion: 'Terminación acrílica + 5% merma', unidad: 'kg', cantidad: 2.625, pu: 1120 },
        { descripcion: 'Perfiles PVC', unidad: 'm2', cantidad: 1.0, pu: 600 },
        { descripcion: 'Anclajes', unidad: 'm2', cantidad: 1.0, pu: 300 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (1,07 h/m²)', unidad: 'm2', cantidad: 1, pu: 12000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 500 },
        { descripcion: 'Obs: juntas dentadas y curado entre capas. Rendimiento: 0,94 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuSidingVinilico = () => ({
    id: 'apu_siding_vinilico_m2',
    descripcion: 'Siding vinílico sobre listones y membrana',
    unidadSalida: 'm2',
    categoria: 'Fachada',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.25 },
      materiales: [
        { descripcion: 'Siding vinílico + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 9500 },
        { descripcion: 'Membrana hidrófuga + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 1800 },
        { descripcion: 'Listón 2×2 + 5% merma', unidad: 'ml', cantidad: 1.26, pu: 547 },
        { descripcion: 'Perfiles de terminación', unidad: 'm2', cantidad: 1.0, pu: 1000 },
        { descripcion: 'Tornillos/Clavos', unidad: 'm2', cantidad: 1.0, pu: 500 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,80 h/m²)', unidad: 'm2', cantidad: 1, pu: 9000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 400 },
        { descripcion: 'Obs: holguras de dilatación; clavo sin apretar. Rendimiento: 1,25 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuCubiertaTejaAsfalticaOsbFieltro = () => ({
    id: 'apu_cubierta_teja_asfaltica_osb_fieltro_m2',
    descripcion: 'Cubierta teja asfáltica sobre OSB + fieltro',
    unidadSalida: 'm2',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.25 },
      materiales: [
        { descripcion: 'Shingle + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 9990 },
        { descripcion: 'Fieltro 15 lb', unidad: 'm2', cantidad: 1.0, pu: 647 },
        { descripcion: 'OSB 11 mm + 5% merma', unidad: 'm2', cantidad: 1.05, pu: 7000 },
        { descripcion: 'Clavos y tapajuntas', unidad: 'm2', cantidad: 1.0, pu: 600 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,80 h/m²)', unidad: 'm2', cantidad: 1, pu: 9000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 400 },
        { descripcion: 'Obs: pendientes ≥ 20% y líneas guía. Rendimiento: 1,25 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuRevestCeramicoMuro3060 = () => ({
    id: 'apu_revest_ceramico_muro_30x60_m2',
    descripcion: 'Revestimiento cerámico en muros 30×60',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.02 },
      materiales: [
        { descripcion: 'Cerámica 30×60 + 3% merma', unidad: 'm2', cantidad: 1.03, pu: 9000 },
        { descripcion: 'Adhesivo 25 kg prorr.', unidad: 'm2', cantidad: 1.0, pu: 622 },
        { descripcion: 'Fragüe', unidad: 'm2', cantidad: 1.0, pu: 327 },
        { descripcion: 'Crucetas', unidad: 'm2', cantidad: 1.0, pu: 200 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,98 h/m²)', unidad: 'm2', cantidad: 1, pu: 11000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 500 },
        { descripcion: 'Obs: doble encolado en formatos grandes. Rendimiento: 1,02 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuCieloPVCtab20cm = () => ({
    id: 'apu_cielo_pvc_tablilla_20cm_m2',
    descripcion: 'Cielo falso PVC tablilla 20 cm',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.73 },
      materiales: [
        { descripcion: 'Panel PVC 20 cm + 3% merma', unidad: 'm2', cantidad: 1.03, pu: 6990 },
        { descripcion: 'Perímetro y colgadores', unidad: 'm2', cantidad: 1.0, pu: 1200 },
        { descripcion: 'Tornillos', unidad: 'm2', cantidad: 1.0, pu: 200 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,58 h/m²)', unidad: 'm2', cantidad: 1, pu: 6500 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 300 },
        { descripcion: 'Obs: respetar ventilación y registros. Rendimiento: 1,73 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuCarpetaAutonivelante5mm = () => ({
    id: 'apu_carpeta_autonivelante_5mm_m2',
    descripcion: 'Carpeta autonivelante cementicia 5 mm',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 2.78 },
      materiales: [
        { descripcion: 'Mortero autonivelante 25 kg + 5% merma', unidad: 'saco', cantidad: 0.30, pu: 9990 },
        { descripcion: 'Imprimación', unidad: 'm2', cantidad: 1.0, pu: 400 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,36 h/m²)', unidad: 'm2', cantidad: 1, pu: 4000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 300 },
        { descripcion: 'Obs: controlar corrientes de aire; tiempos tránsito. Rendimiento: 2,78 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuPavimentoExteriorH25_8cmMalla = () => ({
    id: 'apu_pav_ext_h25_8cm_malla_m2',
    descripcion: 'Pavimento exterior H-25 8 cm con malla',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.41 },
      materiales: [
        { descripcion: 'Hormigón H-25', unidad: 'm3', cantidad: 0.08, pu: 202500 },
        { descripcion: 'Malla C-92', unidad: 'm2', cantidad: 0.077, pu: 22990 },
        { descripcion: 'Curado/agua', unidad: 'm2', cantidad: 1.0, pu: 200 },
        { descripcion: 'Juntas asfálticas prorr.', unidad: 'm2', cantidad: 1.0, pu: 400 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,71 h/m²)', unidad: 'm2', cantidad: 1, pu: 8000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'm2', cantidad: 1, pu: 400 },
        { descripcion: 'Obs: curado 3–7 días; juntas 2–3 m. Rendimiento: 1,41 m²/h', unidad: 'm2', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuCamaraInspeccionPVC50x50x60 = () => ({
    id: 'apu_camara_inspeccion_pvc_50x50x60_u',
    descripcion: 'Cámara de inspección PVC 50×50×60',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 0.63 },
      materiales: [
        { descripcion: 'Cámara PVC prefabricada 50×50×60', unidad: 'u', cantidad: 1.0, pu: 45000 },
        { descripcion: 'Tapa y marco reforzado', unidad: 'u', cantidad: 1.0, pu: 15000 },
        { descripcion: 'Mortero asiento (10 kg)', unidad: 'kg', cantidad: 10.0, pu: 300 },
        { descripcion: 'Tuberías y uniones prorr.', unidad: 'u', cantidad: 1.0, pu: 5000 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (1,60 h/u)', unidad: 'u', cantidad: 1, pu: 18000 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'u', cantidad: 1, pu: 500 },
        { descripcion: 'Obs: pendiente 1–2% y cama de asiento. Rendimiento: 0,63 u/h', unidad: 'u', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuTrampaGrasas50L = () => ({
    id: 'apu_trampa_grasas_50l_u',
    descripcion: 'Trampa de grasas prefabricada 50 L',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 0.50 },
      materiales: [
        { descripcion: 'Trampa de grasas 50 L', unidad: 'u', cantidad: 1.0, pu: 69990 },
        { descripcion: 'PVC y accesorios', unidad: 'u', cantidad: 1.0, pu: 5000 },
        { descripcion: 'Mortero (8 kg)', unidad: 'kg', cantidad: 8.0, pu: 300 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (2,00 h/u)', unidad: 'u', cantidad: 1, pu: 22500 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'u', cantidad: 1, pu: 600 },
        { descripcion: 'Obs: accesible para mantención; ventilación. Rendimiento: 0,50 u/h', unidad: 'u', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  const buildApuCierrePerimetralMalla2mPostes = () => ({
    id: 'apu_cierre_perimetral_malla_2m_postes_ml',
    descripcion: 'Cierre perimetral malla 2,0 m + postes imp. @2,5 m',
    unidadSalida: 'ml',
    categoria: 'Obras exteriores',
    codigoExterno: '',
    secciones: {
      __meta: { rendimiento: 1.50 },
      materiales: [
        { descripcion: 'Malla galvanizada 2,0 m + 5% merma', unidad: 'ml', cantidad: 1.05, pu: 7000 },
        { descripcion: 'Poste 4×4" @2,5 m + 5% merma', unidad: 'u', cantidad: 0.42, pu: 7500 },
        { descripcion: 'Tensor y grampas', unidad: 'ml', cantidad: 1.0, pu: 600 },
        { descripcion: 'Hormigón seco (12 kg)', unidad: 'kg', cantidad: 12.0, pu: 400 },
      ],
      manoObra: [ { descripcion: 'Cuadrilla (0,67 h/ml)', unidad: 'ml', cantidad: 1, pu: 7500 } ],
      equipos: [],
      varios: [
        { descripcion: 'Herramientas y misceláneos', unidad: 'ml', cantidad: 1, pu: 400 },
        { descripcion: 'Obs: curado bases; tensores a 3 niveles. Rendimiento: 1,50 ml/h', unidad: 'ml', cantidad: 1, pu: 0 }
      ]
    }
  } as any);

  // ===== APUs adicionales (nueva tanda) =====
  const buildApuLosa12cmMallaC92 = () => ({
    id: 'apu_losa_12cm_malla_c92',
    descripcion: 'Losa/entrepiso HºA 12 cm con malla C-92',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Hormigón preparado en saco (0,12 m³)', unidad: 'm2', cantidad: 1, pu: 24300 },
        { descripcion: 'Malla electrosoldada C-92 (1/13 paño)', unidad: 'm2', cantidad: 1, pu: 1769 },
        { descripcion: 'Acero adicional Ø10 (1 kg)', unidad: 'kg', cantidad: 1, pu: 1863 },
        { descripcion: 'Encofrado terciado 18 mm amort. (5 usos)', unidad: 'm2', cantidad: 1, pu: 2956 },
        { descripcion: 'Puntales y misceláneos', unidad: 'm2', cantidad: 1, pu: 999 },
      ],
      manoObra: [
        { descripcion: 'Maestro (1,0 h)', unidad: 'm2', cantidad: 1, pu: 5000 },
        { descripcion: 'Ayudante (1,0 h)', unidad: 'm2', cantidad: 1, pu: 5000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuEntramado2x8Osb18 = () => ({
    id: 'apu_entramado_2x8_osb18',
    descripcion: 'Entramado horizontal madera 2×8 @40 cm + OSB 18 mm',
    unidadSalida: 'm2',
    categoria: 'Estructura madera',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Pino 2×8 (2,5 ml)', unidad: 'm', cantidad: 1, pu: 12728 },
        { descripcion: 'OSB 18 mm', unidad: 'm2', cantidad: 1, pu: 9000 },
        { descripcion: 'Tornillos y fijaciones', unidad: 'm2', cantidad: 1, pu: 500 },
      ],
      manoObra: [
        { descripcion: 'Maestro (1,2 h)', unidad: 'm2', cantidad: 1, pu: 6000 },
        { descripcion: 'Ayudante (1,2 h)', unidad: 'm2', cantidad: 1, pu: 6000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuSobrecimiento20x20 = () => ({
    id: 'apu_sobrecimiento_20x20_h20',
    descripcion: 'Sobrecimiento 20×20 cm H-20 con protección superficial',
    unidadSalida: 'm',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Hormigón (0,04 m³)', unidad: 'm', cantidad: 1, pu: 8100 },
        { descripcion: 'Acero longitudinal + estribos (3 kg)', unidad: 'kg', cantidad: 1, pu: 5588 },
        { descripcion: 'Encofrado amort. (5 usos) 0,4 m²', unidad: 'm', cantidad: 1, pu: 1182 },
        { descripcion: 'Impermeabilizante asfáltico (2 manos)', unidad: 'm', cantidad: 1, pu: 1134 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,5 h)', unidad: 'm', cantidad: 1, pu: 2500 },
        { descripcion: 'Ayudante (0,5 h)', unidad: 'm', cantidad: 1, pu: 2500 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuBarreraHumedadVent = () => ({
    id: 'apu_barrera_humedad_vent_entretechos',
    descripcion: 'Barrera de humedad bajo techumbre + ventilación de entretechos',
    unidadSalida: 'm2',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Fieltro asfáltico 15 lb', unidad: 'm2', cantidad: 1, pu: 647 },
        { descripcion: 'Accesorios ventilación (prorrateo)', unidad: 'm2', cantidad: 1, pu: 500 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,2 h)', unidad: 'm2', cantidad: 1, pu: 1000 },
        { descripcion: 'Ayudante (0,2 h)', unidad: 'm2', cantidad: 1, pu: 1000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuCumbrerasMetalicas = () => ({
    id: 'apu_cumbreras_metalicas',
    descripcion: 'Aleros y cumbreras metálicas',
    unidadSalida: 'm',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Caballete zinc 3 m (prorrateo)', unidad: 'm', cantidad: 1, pu: 4997 },
        { descripcion: 'Tornillos autoperforantes con neopreno', unidad: 'm', cantidad: 1, pu: 600 },
        { descripcion: 'Cinta tapajuntas/flashband (prorrateo)', unidad: 'm', cantidad: 1, pu: 300 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,25 h)', unidad: 'm', cantidad: 1, pu: 1250 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'm', cantidad: 1, pu: 1250 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuImperMembrana3mm = () => ({
    id: 'apu_imper_membrana_3mm_losa',
    descripcion: 'Impermeabilización de losa/terraza con membrana asfáltica 3 mm',
    unidadSalida: 'm2',
    categoria: 'Impermeabilización',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Membrana 1×10 m JD2 Plus', unidad: 'm2', cantidad: 1, pu: 7899 },
        { descripcion: 'Imprimante asfáltico 5 L', unidad: 'm2', cantidad: 1, pu: 480 },
        { descripcion: 'Gas y misceláneos', unidad: 'm2', cantidad: 1, pu: 300 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1250 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1250 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuSaneamientoBasico = () => ({
    id: 'apu_saneamiento_basico_biodigestor',
    descripcion: 'Saneamiento individual básico (biodigestor + drenes)',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Biodigestor 600 L', unidad: 'u', cantidad: 1, pu: 119990 },
        { descripcion: 'Tuberías y fittings PVC 110 mm', unidad: 'u', cantidad: 1, pu: 36000 },
        { descripcion: 'Cámara de inspección prefabricada', unidad: 'u', cantidad: 1, pu: 50000 },
        { descripcion: 'Geotextil 1×10 m', unidad: 'u', cantidad: 1, pu: 11990 },
      ],
      manoObra: [
        { descripcion: 'Maestro (1,5 días)', unidad: 'u', cantidad: 1, pu: 60000 },
        { descripcion: 'Ayudante (1,5 días)', unidad: 'u', cantidad: 1, pu: 60000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuVentMecanicaLocal = () => ({
    id: 'apu_vent_mecanica_local_100mm',
    descripcion: 'Ventilación mecánica local (extractor baño 100 mm)',
    unidadSalida: 'u',
    categoria: 'Instalaciones eléctricas',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Extractor 4″ Klimber', unidad: 'u', cantidad: 1, pu: 21990 },
        { descripcion: 'Ducto 100 mm + rejilla', unidad: 'u', cantidad: 1, pu: 3000 },
        { descripcion: 'Cableado y anclajes', unidad: 'u', cantidad: 1, pu: 2000 },
      ],
      manoObra: [
        { descripcion: 'Maestro (2,0 h)', unidad: 'u', cantidad: 1, pu: 10000 },
        { descripcion: 'Ayudante (1,0 h)', unidad: 'u', cantidad: 1, pu: 5625 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuSellosHermeticidad = () => ({
    id: 'apu_sellos_hermeticidad_vanos',
    descripcion: 'Sellos de hermeticidad en vanos (silicona + espuma PU)',
    unidadSalida: 'm',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Silicona neutra (prorrateo)', unidad: 'm', cantidad: 1, pu: 549 },
        { descripcion: 'Espuma PU (prorrateo)', unidad: 'm', cantidad: 1, pu: 400 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,1 h)', unidad: 'm', cantidad: 1, pu: 500 },
        { descripcion: 'Ayudante (0,1 h)', unidad: 'm', cantidad: 1, pu: 500 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuSellosCortafuego = () => ({
    id: 'apu_sellos_cortafuego_pasamuros',
    descripcion: 'Sellos cortafuego en pasamuros (intumescente)',
    unidadSalida: 'u',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Masilla intumescente CP-25WB+ (prorrateo)', unidad: 'u', cantidad: 1, pu: 12500 },
        { descripcion: 'Rotulación/accesorios', unidad: 'u', cantidad: 1, pu: 1000 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,5 h)', unidad: 'u', cantidad: 1, pu: 1953 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'u', cantidad: 1, pu: 1953 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuMuroContencion20cm = () => ({
    id: 'apu_muro_contencion_hoa_20cm_dren',
    descripcion: 'Muro de contención HºA 20 cm con dren y geotextil (h≈1,5 m)',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Hormigón (0,20 m³)', unidad: 'm2', cantidad: 1, pu: 40500 },
        { descripcion: 'Acero (≈16 kg/m²)', unidad: 'm2', cantidad: 1, pu: 29803 },
        { descripcion: 'Tubo corrugado dren 110 mm (prorrateo)', unidad: 'm2', cantidad: 1, pu: 2100 },
        { descripcion: 'Geotextil 1×10 m', unidad: 'm2', cantidad: 1, pu: 1199 },
        { descripcion: 'Encofrado ambos lados amort.', unidad: 'm2', cantidad: 1, pu: 5911 },
      ],
      manoObra: [
        { descripcion: 'Maestro (1,5 h)', unidad: 'm2', cantidad: 1, pu: 7500 },
        { descripcion: 'Ayudante (1,5 h)', unidad: 'm2', cantidad: 1, pu: 7500 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuAcondTermMuros = () => ({
    id: 'apu_acond_termico_muros_lana100_bv',
    descripcion: 'Acondicionamiento térmico de muros (lana de vidrio 100 mm + BV)',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Lana de vidrio 100 mm', unidad: 'm2', cantidad: 1, pu: 4753 },
        { descripcion: 'Barrera de vapor PE 200 µm', unidad: 'm2', cantidad: 1, pu: 375 },
        { descripcion: 'Cinta/adhesivos', unidad: 'm2', cantidad: 1, pu: 100 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1250 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1250 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuAcondTermCielo = () => ({
    id: 'apu_acond_termico_cielo_lana100',
    descripcion: 'Acondicionamiento térmico de cielo entretechos (lana de vidrio 100 mm)',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Lana de vidrio 100 mm', unidad: 'm2', cantidad: 1, pu: 4753 } ],
      manoObra: [
        { descripcion: 'Maestro (0,2 h)', unidad: 'm2', cantidad: 1, pu: 1000 },
        { descripcion: 'Ayudante (0,2 h)', unidad: 'm2', cantidad: 1, pu: 1000 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuImperMurosBano2K = () => ({
    id: 'apu_imper_muros_bano_2k',
    descripcion: 'Impermeabilización muros de baño con membrana cementicia 2K (2 manos)',
    unidadSalida: 'm2',
    categoria: 'Impermeabilización',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Membrana 2K (prorrateo)', unidad: 'm2', cantidad: 1, pu: 10196 },
        { descripcion: 'Insumos', unidad: 'm2', cantidad: 1, pu: 500 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,3 h)', unidad: 'm2', cantidad: 1, pu: 1688 },
        { descripcion: 'Ayudante (0,3 h)', unidad: 'm2', cantidad: 1, pu: 1687 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuImperMurosExtAsfaltica = () => ({
    id: 'apu_imper_muros_ext_asfaltica',
    descripcion: 'Impermeabilización muros exteriores con pintura asfáltica (2 manos)',
    unidadSalida: 'm2',
    categoria: 'Impermeabilización',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Igol denso (prorrateo)', unidad: 'm2', cantidad: 1, pu: 3778 },
        { descripcion: 'Insumos', unidad: 'm2', cantidad: 1, pu: 300 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1407 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1406 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  // ===== Nuevos APUs: Piscina / Movimiento de tierras / Obra gruesa =====
  // 1) Excavación y retiro (por m³) — incluye retro c/operador, 2 ayudantes y transporte/disposición
  const buildApuExcavacionRetiroM3 = () => ({
    id: 'apu_excavacion_retiro_m3',
    descripcion: 'Excavación y retiro',
    unidadSalida: 'm3',
    categoria: 'Movimiento de tierras',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento base: 100–150 m³/día según suelo. Incluye carga, acopio y retiro.' },
      materiales: [],
      manoObra: [
        { descripcion: '2 ayudantes', unidad: 'm3', cantidad: 1, pu: 1186 },
      ],
      equipos: [
        { descripcion: 'Retroexcavadora c/operador', unidad: 'm3', cantidad: 1, pu: 5435 },
        { descripcion: 'Transporte y disposición', unidad: 'm3', cantidad: 1, pu: 12451 },
      ],
      varios: [
        { descripcion: 'Ajuste redondeo', unidad: 'm3', cantidad: 1, pu: -1 }, // Para cuadrar a 19.071
      ],
    }
  } as any);

  // 2) Base estabilizada 10 cm compactada (por m²)
  const buildApuBaseEstabilizada10cmM2 = () => ({
    id: 'apu_base_estabilizada_10cm_m2',
    descripcion: 'Base estabilizada 10 cm compactada',
    unidadSalida: 'm2',
    categoria: 'Movimiento de tierras',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento 35–50 m²/jornada. Incluye humectación y nivelación. (EST.)' },
      materiales: [ { descripcion: 'Gravilla 0,10 m³/m² @ $30.000/m³', unidad: 'm2', cantidad: 1, pu: 3000 } ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm2', cantidad: 1, pu: 1696 } ],
      equipos: [],
      varios: [],
    }
  } as any);

  // 3) Encofrado muros/cantos, doble cara (por m²)
  const buildApuEncofradoDobleCaraM2 = () => ({
    id: 'apu_encofrado_doble_cara_m2',
    descripcion: 'Encofrado muros/cantos, doble cara',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento: 12–18 m²/cuadrilla-día. Incluye armado y desencofrado.' },
      materiales: [
        { descripcion: 'Terciado estructural 18 mm prorrateo', unidad: 'm2', cantidad: 1, pu: 8129 },
        { descripcion: 'Listones/amarres/clavos', unidad: 'm2', cantidad: 1, pu: 2439 },
        { descripcion: 'Desmoldante', unidad: 'm2', cantidad: 1, pu: 280 },
      ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm2', cantidad: 1, pu: 4802 } ],
      equipos: [],
      varios: [],
    }
  } as any);

  // 4) Enfierradura (por kg colocado)
  const buildApuEnfierraduraKg = () => ({
    id: 'apu_enfierradura_kg',
    descripcion: 'Enfierradura colocada',
    unidadSalida: 'kg',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento: 120–160 kg/jornada-cuadrilla.' },
      materiales: [
        { descripcion: 'Acero A63/420', unidad: 'kg', cantidad: 1, pu: 1166 },
        { descripcion: 'Accesorios (alambre/separadores) 5%', unidad: 'kg', cantidad: 1, pu: 58 },
      ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'kg', cantidad: 1, pu: 198 } ],
      equipos: [],
      varios: [],
    }
  } as any);

  // 5) Hormigón H-25 hecho en obra + vibrado (por m³)
  const buildApuH25ObraVibradoM3 = () => ({
    id: 'apu_h25_obra_vibrado_m3',
    descripcion: 'Hormigón H-25 hecho en obra + vibrado',
    unidadSalida: 'm3',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Incluye cemento, arena, grava, aditivo y 5% mermas. Vibrado incluido.' },
      materiales: [ { descripcion: 'Materiales (c/5% mermas)', unidad: 'm3', cantidad: 1, pu: 109462 } ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm3', cantidad: 1, pu: 15456 } ],
      equipos: [ { descripcion: 'Betonera + vibrador', unidad: 'm3', cantidad: 1, pu: 6295 } ],
      varios: [ { descripcion: 'Ajuste redondeo', unidad: 'm3', cantidad: 1, pu: 26 } ], // Para cuadrar a 131.239
    }
  } as any);

  // 6) Curado húmedo (por m²)
  const buildApuCuradoHumedoM2 = () => ({
    id: 'apu_curado_humedo_m2',
    descripcion: 'Curado húmedo',
    unidadSalida: 'm2',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Procedimiento: riegos diarios 3–7 días.' },
      materiales: [],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm2', cantidad: 1, pu: 183 } ],
      equipos: [],
      varios: [],
    }
  } as any);

  // 7) Impermeabilización cementicia 2 capas (por m²)
  const buildApuImperCementicia2capasM2 = () => ({
    id: 'apu_imper_cementicia_2capas_m2',
    descripcion: 'Impermeabilización cementicia 2 capas',
    unidadSalida: 'm2',
    categoria: 'Impermeabilización',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento: 12–18 m²/jornada.' },
      materiales: [ { descripcion: 'Mortero bicomponente', unidad: 'm2', cantidad: 1, pu: 4436 } ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm2', cantidad: 1, pu: 2747 } ],
      equipos: [],
      varios: [],
    }
  } as any);

  // Pintura para piscina 2 manos (por m²)
  const buildApuPinturaPiscina2manosM2 = () => ({
    id: 'apu_pintura_piscina_2manos_m2',
    descripcion: 'Pintura para piscina 2 manos',
    unidadSalida: 'm2',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Rendimiento: 25–35 m²/jornada.' },
      materiales: [ { descripcion: 'Pintura base solvente/tineta', unidad: 'm2', cantidad: 1, pu: 3708 } ],
      manoObra: [ { descripcion: 'Mano de obra', unidad: 'm2', cantidad: 1, pu: 1829 } ],
      equipos: [],
      varios: [],
    }
  } as any);


  // 9) Red hidráulica y equipos — crear APUs unitarios por ítem
  const buildApuRedHid_PVC50_Tuberia_ml = () => ({
    id: 'apu_red_hid_pvc50_tuberia_ml',
    descripcion: 'Tubería PVC Ø50 mm instalada',
    unidadSalida: 'ml',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'ml', cantidad: 1, pu: 4056 } ] }
  } as any);
  const buildApuRedHid_Codo50_u = () => ({
    id: 'apu_red_hid_codo_50_u',
    descripcion: 'Codo Ø50 instalado',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 1500 } ] }
  } as any);
  const buildApuRedHid_Tee50_u = () => ({
    id: 'apu_red_hid_tee_50_u',
    descripcion: 'Tee Ø50 instalada',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 2790 } ] }
  } as any);
  const buildApuRedHid_ValvulaBola50_u = () => ({
    id: 'apu_red_hid_valvula_bola_50_u',
    descripcion: 'Válvula bola Ø50 instalada',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 10090 } ] }
  } as any);
  const buildApuRedHid_Skimmer_u = () => ({
    id: 'apu_red_hid_skimmer_u',
    descripcion: 'Skimmer instalado',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 67890 } ] }
  } as any);
  const buildApuRedHid_Retorno_u = () => ({
    id: 'apu_red_hid_retorno_u',
    descripcion: 'Retorno instalado',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 20000 } ] }
  } as any);
  const buildApuRedHid_DesagueFondo_u = () => ({
    id: 'apu_red_hid_desague_fondo_u',
    descripcion: 'Desagüe de fondo instalado',
    unidadSalida: 'u',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'u', cantidad: 1, pu: 41990 } ] }
  } as any);
  const buildApuRedHid_KitFiltroBomba_set = () => ({
    id: 'apu_red_hid_kit_filtro_bomba_set',
    descripcion: 'Filtro + bomba 11 m³/h instalado y PM',
    unidadSalida: 'set',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro e instalación', unidad: 'set', cantidad: 1, pu: 274990 } ] }
  } as any);
  const buildApuRedHid_ArenaFiltro_saco = () => ({
    id: 'apu_red_hid_arena_filtro_saco',
    descripcion: 'Arena de filtro 25 kg cargada',
    unidadSalida: 'saco',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Suministro y carga', unidad: 'saco', cantidad: 1, pu: 14990 } ] }
  } as any);
  const buildApuRedHid_PruebasLS = () => ({
    id: 'apu_red_hid_pruebas_ls',
    descripcion: 'Pruebas hidráulicas y cloración inicial',
    unidadSalida: 'LS',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: { __meta: { obs: 'Valores hidráulicos coherentes con combo y fittings típicos; algunos EST.' }, materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Servicio LS', unidad: 'LS', cantidad: 1, pu: 42000 } ] }
  } as any);

  // APU compuesto: Red hidráulica y equipos (conjunto)
  const buildApuRedHidConjuntoSet = () => ({
    id: 'apu_red_hid_conjunto_set',
    descripcion: 'Red hidráulica y equipos (conjunto)',
    unidadSalida: 'set',
    categoria: 'Instalaciones sanitarias',
    codigoExterno: '',
    secciones: {
      __meta: { obs: 'Conjunto base con 1 de cada ítem. Ajusta cantidades (ml/u) según diseño y largo de tendidos.' },
      materiales: [],
      manoObra: [],
      equipos: [],
      varios: [
        { descripcion: 'Tubería PVC Ø50 mm instalada', unidad: 'ml', cantidad: 30, pu: 4056 },
        { descripcion: 'Codo Ø50 instalado', unidad: 'u', cantidad: 10, pu: 1500 },
        { descripcion: 'Tee Ø50 instalada', unidad: 'u', cantidad: 2, pu: 2790 },
        { descripcion: 'Válvula bola Ø50 instalada', unidad: 'u', cantidad: 2, pu: 10090 },
        { descripcion: 'Skimmer instalado', unidad: 'u', cantidad: 2, pu: 67890 },
        { descripcion: 'Retorno instalado', unidad: 'u', cantidad: 3, pu: 20000 },
        { descripcion: 'Desagüe de fondo instalado', unidad: 'u', cantidad: 1, pu: 41990 },
        { descripcion: 'Filtro + bomba 11 m³/h instalado y PM', unidad: 'set', cantidad: 1, pu: 274990 },
        { descripcion: 'Arena de filtro 25 kg cargada', unidad: 'saco', cantidad: 4, pu: 14990 },
        { descripcion: 'Pruebas hidráulicas y cloración inicial', unidad: 'LS', cantidad: 1, pu: 42000 },
        { descripcion: 'Ajuste redondeo', unidad: 'LS', cantidad: 1, pu: -160 },
      ],
    }
  } as any);

  const buildApuAntepecho12x20 = () => ({
    id: 'apu_antepecho_12x20_hoa',
    descripcion: 'Antepecho HºA 12×20 cm armado',
    unidadSalida: 'm',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Hormigón en saco (0,024 m³/ml)', unidad: 'm', cantidad: 1, pu: 4860 },
        { descripcion: 'Acero Ø10 (≈3,4 kg/ml)', unidad: 'm', cantidad: 1, pu: 3960 },
        { descripcion: 'Encofrado amort. (5 usos)', unidad: 'm', cantidad: 1, pu: 832 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,5 h)', unidad: 'm', cantidad: 1, pu: 2813 },
        { descripcion: 'Ayudante (0,5 h)', unidad: 'm', cantidad: 1, pu: 2812 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuLimahoyaFlashband = () => ({
    id: 'apu_limahoya_metal_flashband',
    descripcion: 'Limahoya metálica + tapajuntas autoadhesivo',
    unidadSalida: 'm',
    categoria: 'Techumbre',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Limahoya metálica (prorrateo)', unidad: 'm', cantidad: 1, pu: 3663 },
        { descripcion: 'Cinta Flashband (prorrateo)', unidad: 'm', cantidad: 1, pu: 1800 },
        { descripcion: 'Tornillos techo', unidad: 'm', cantidad: 1, pu: 690 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,2 h)', unidad: 'm', cantidad: 1, pu: 1125 },
        { descripcion: 'Ayudante (0,2 h)', unidad: 'm', cantidad: 1, pu: 1125 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuDintel12x20 = () => ({
    id: 'apu_dintel_12x20_hoa',
    descripcion: 'Dintel HºA 12×20 cm sobre vano',
    unidadSalida: 'm',
    categoria: 'Obra gruesa',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Antepecho base (hormigón + acero + encofrado)', unidad: 'm', cantidad: 1, pu: 9652 },
        { descripcion: 'Pernos/amarres', unidad: 'm', cantidad: 1, pu: 500 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,5 h)', unidad: 'm', cantidad: 1, pu: 2813 },
        { descripcion: 'Ayudante (0,5 h)', unidad: 'm', cantidad: 1, pu: 2812 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuPasamanosMadera = () => ({
    id: 'apu_pasamanos_madera_interior',
    descripcion: 'Baranda y pasamanos interior madera',
    unidadSalida: 'm',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Pasamanos pino', unidad: 'm', cantidad: 1, pu: 7663 },
        { descripcion: 'Soportes pared (1,25 u/m)', unidad: 'm', cantidad: 1, pu: 14375 },
        { descripcion: 'Tornillería', unidad: 'm', cantidad: 1, pu: 375 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,3 h)', unidad: 'm', cantidad: 1, pu: 1688 },
        { descripcion: 'Ayudante (0,3 h)', unidad: 'm', cantidad: 1, pu: 1687 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuBarandaMetalSimple = () => ({
    id: 'apu_baranda_metal_simple',
    descripcion: 'Pasamanos/Baranda metálica simple 20×20×2 mm',
    unidadSalida: 'm',
    categoria: 'Terminaciones',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Tubo cuadrado 20×20×2 mm', unidad: 'm', cantidad: 1, pu: 1198 },
        { descripcion: 'Pintura', unidad: 'm', cantidad: 1, pu: 700 },
        { descripcion: 'Fijaciones', unidad: 'm', cantidad: 1, pu: 300 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,5 h)', unidad: 'm', cantidad: 1, pu: 2813 },
        { descripcion: 'Ayudante (0,5 h)', unidad: 'm', cantidad: 1, pu: 2812 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuConectorVigaApoyo = () => ({
    id: 'apu_conector_viga_apoyo',
    descripcion: 'Conector estructural viga a apoyo',
    unidadSalida: 'u',
    categoria: 'Estructura madera',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Soporte Simpson Strong-Tie', unidad: 'u', cantidad: 1, pu: 2490 },
        { descripcion: 'Tornillos (prorrateo)', unidad: 'u', cantidad: 1, pu: 203 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,1 h)', unidad: 'u', cantidad: 1, pu: 563 },
        { descripcion: 'Ayudante (0,1 h)', unidad: 'u', cantidad: 1, pu: 562 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuEstabilTaludGeotextil = () => ({
    id: 'apu_estabil_talud_geotextil',
    descripcion: 'Estabilización de talud con geotextil y estacas',
    unidadSalida: 'm2',
    categoria: 'Movimiento de tierras',
    codigoExterno: '',
    secciones: {
      materiales: [
        { descripcion: 'Geotextil 1×10 m (prorrateo)', unidad: 'm2', cantidad: 1, pu: 1200 },
        { descripcion: 'Estacas pino (0,5 u/m²)', unidad: 'm2', cantidad: 1, pu: 875 },
      ],
      manoObra: [
        { descripcion: 'Maestro (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1407 },
        { descripcion: 'Ayudante (0,25 h)', unidad: 'm2', cantidad: 1, pu: 1406 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  const buildApuServTopo = () => ({
    id: 'apu_serv_topografia_lote_urbano',
    descripcion: 'Levantamiento topográfico lote urbano <1.000 m²',
    unidadSalida: 'u',
    categoria: 'Servicios',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Servicio topográfico', unidad: 'u', cantidad: 1, pu: 180000 } ] }
  } as any);

  const buildApuServProctor = () => ({
    id: 'apu_serv_proctor_dr',
    descripcion: 'Ensayo Proctor/DR en obra chica',
    unidadSalida: 'u',
    categoria: 'Servicios',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Ensayo Proctor/DR', unidad: 'u', cantidad: 1, pu: 85000 } ] }
  } as any);

  const buildApuServMecanicaSuelos = () => ({
    id: 'apu_serv_mecanica_suelos_calicata',
    descripcion: 'Informe mecánica de suelos (1 calicata + recomendación)',
    unidadSalida: 'u',
    categoria: 'Servicios',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Mecánica de suelos', unidad: 'u', cantidad: 1, pu: 420000 } ] }
  } as any);

  const buildApuServTE1Empalme = () => ({
    id: 'apu_serv_te1_empalme_40a',
    descripcion: 'Trámite TE1 + empalme 40 A + puesta a tierra básica',
    unidadSalida: 'u',
    categoria: 'Servicios',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Servicio eléctrico', unidad: 'u', cantidad: 1, pu: 180000 } ] }
  } as any);

  const buildApuServEmpalmeSanitario = () => ({
    id: 'apu_serv_empalme_sanitario',
    descripcion: 'Empalme sanitario domiciliario',
    unidadSalida: 'u',
    categoria: 'Servicios',
    codigoExterno: '',
    secciones: { materiales: [], manoObra: [], equipos: [], varios: [ { descripcion: 'Servicio sanitario (estimado)', unidad: 'u', cantidad: 1, pu: 500000 } ] }
  } as any);

  const buildApuVentHigro = () => ({
    id: 'apu_vent_higroregulada_bano_cocina',
    descripcion: 'Ventilación higroregulada en baños/cocina (rejilla + mano de obra)',
    unidadSalida: 'u',
    categoria: 'Instalaciones',
    codigoExterno: '',
    secciones: {
      materiales: [ { descripcion: 'Rejilla admisión', unidad: 'u', cantidad: 1, pu: 6000 } ],
      manoObra: [
        { descripcion: 'Maestro (instalación)', unidad: 'u', cantidad: 1, pu: 1688 },
        { descripcion: 'Ayudante (instalación)', unidad: 'u', cantidad: 1, pu: 1687 },
      ],
      equipos: [],
      varios: [],
    }
  } as any);

  // Siembra automática del APU H-25 en biblioteca si no existe
  useEffect(() => {
    // Migración: dividir mano de obra única en Maestro/Ayudante preservando el total
    try {
      const raw = localStorage.getItem('apu-library');
      const lib = raw ? JSON.parse(raw) : [];
      if (Array.isArray(lib) && lib.length) {
        let changed = false;
        const migrated = lib.map((apu:any)=>{
          const sec = (apu && apu.secciones) ? apu.secciones : null;
          const mo = sec && Array.isArray(sec.manoObra) ? sec.manoObra : null;
          if (!mo || mo.length !== 1) return apu;
          const row = mo[0] || {};
          const desc = String(row.descripcion||'').trim();
          // Evitar migrar si ya parece estar separado o si es claramente vacío
          if (/^maestro|^ayudante/i.test(desc) || (!desc && !Number(row.pu))) return apu;
          const cantidad = Number(row.cantidad)||0;
          const pu = Number(row.pu)||0;
          // Si no tiene costo o cantidad, no migrar
          if (pu<=0 || cantidad<0) return apu;
          const maestroPu = Math.floor(pu/2);
          const ayudantePu = pu - maestroPu; // asegura suma exacta
          const baseUnidad = String(row.unidad||'');
          const maestroRow = { descripcion: `Maestro — ${desc||'MO'}`, unidad: baseUnidad, cantidad, pu: maestroPu };
          const ayudanteRow = { descripcion: `Ayudante — ${desc||'MO'}`, unidad: baseUnidad, cantidad, pu: ayudantePu };
          changed = true;
          return { ...apu, secciones: { ...sec, manoObra: [maestroRow, ayudanteRow] } };
        });
        if (changed) {
          // Reusar guardado que renumera códigos
          saveLibrary(migrated);
        }
      }
    } catch { /* noop */ }

    // Migración: completar categoría en APUs que no la tengan
    try {
      const raw2 = localStorage.getItem('apu-library');
      const lib2 = raw2 ? JSON.parse(raw2) : [];
      if (Array.isArray(lib2) && lib2.length) {
        let changed2 = false;
        const catFromDesc = (desc:string)=>{
          const d = (desc||'').toLowerCase();
          if(/excavación|relleno|talud|zanja/.test(d)) return 'Movimiento de tierras';
          if(/losa|radier|h-?25|h-?20|hormigón|hº|zapata|sobrecimiento|muro|dintel|antepecho|albañilería|ladrillo|contención/.test(d)) return 'Obra gruesa';
          if(/techumbre|cubierta|canaleta|cumbrera|limahoya|fieltro|barrera.*humedad/.test(d)) return 'Techumbre';
          if(/revestimiento.*exterior|fachada/.test(d)) return 'Fachada';
          if(/pintura|piso|cerámica|tabique|yeso|cielo|sello|pasamanos|baranda|acondicionamiento térmico|lana/.test(d)) return 'Terminaciones';
          if(/sanitaria|biodigestor|empalme sanitario/.test(d)) return 'Instalaciones sanitarias';
          if(/eléctric|te1|ventilación mecánica|extractor/.test(d)) return 'Instalaciones eléctricas';
          if(/impermeabiliz|membrana|asfáltica|igol/.test(d)) return 'Impermeabilización';
          if(/estructura.*madera|entramado|conector viga/.test(d)) return 'Estructura madera';
          if(/ventana|puerta|abertura/.test(d)) return 'Aberturas';
          if(/topograf|proctor|mecánica de suelos|servicio/.test(d)) return 'Servicios';
          if(/ventilación.*higro/.test(d)) return 'Instalaciones';
          return 'Otros';
        };
        const migrated2 = lib2.map((apu:any)=>{
          const cat = String((apu && apu.categoria) || '').trim();
          if(cat) return apu;
          const newCat = catFromDesc(String(apu?.descripcion||''));
          changed2 = true;
          return { ...apu, categoria: newCat };
        });
        if (changed2) saveLibrary(migrated2);
      }
    } catch { /* noop */ }

    const apuId = 'apu_h25_obra';
    const existing = allApus.find(a => a.id === apuId);
    if (!existing) {
      const next = [buildApuH25Obra(), ...customApus];
      saveLibrary(next);
    } else {
      try {
        const mo = (existing as any)?.secciones?.manoObra || [];
        const needsSplit = Array.isArray(mo) && mo.length === 1 && /maestro|cuadrilla|ayudante/i.test(String(mo[0]?.descripcion||''));
        if (needsSplit) {
          // Recalcular costos por m3 según supuestos y actualizar solo mano de obra
          const diasMes = 22;
          const rendimientoM3PorDia = 3;
          const maestroMensual = 827_327; // CLP/mes
          const ayudanteMensual = 480_457; // CLP/mes
          const costoMaestroPorM3 = Math.round(maestroMensual / diasMes / rendimientoM3PorDia);
          const costoAyudantePorM3 = Math.round(ayudanteMensual / diasMes / rendimientoM3PorDia);
          const updated = {
            ...existing,
            secciones: {
              ...((existing as any).secciones||{}),
              manoObra: [
                { descripcion: 'Maestro (rend. 3 m³/jornada)', unidad: 'm3', cantidad: 1, pu: costoMaestroPorM3 },
                { descripcion: 'Ayudante (rend. 3 m³/jornada)', unidad: 'm3', cantidad: 1, pu: costoAyudantePorM3 },
              ]
            }
          };
          const next = [updated, ...customApus.filter(a => a.id !== apuId)];
          saveLibrary(next);
        }
      } catch {}
      // Asegurar orden (H-25 primero) y renumeración 01-XXX aunque no haya migración
      const shouldReorder = customApus[0]?.id !== apuId;
      if (shouldReorder) {
        const base = customApus.map(a=> a.id===apuId ? existing : a);
        const reordered = [existing, ...base.filter(a=> a.id!==apuId)];
        saveLibrary(reordered);
      }
    }

    // Sembrar/ordenar APU Moldaje (segundo en la lista)
    const readLib = () => { try{ return JSON.parse(localStorage.getItem('apu-library')||'[]'); }catch{ return customApus; } };
    const moldId = 'apu_moldaje_terciado_m2';
    const ladrId = 'apu_muro_ladrillo_m2';
    const libNow = readLib();
    const hasMold = Array.isArray(libNow) && libNow.some((a:any)=> a.id===moldId);
    const hasLadr = Array.isArray(libNow) && libNow.some((a:any)=> a.id===ladrId);
    let tmp = libNow;
    if(!hasMold){ tmp = [...tmp, buildApuMoldajeTerciado()]; }
    if(!hasLadr){ tmp = [...tmp, buildApuMuroLadrillo()]; }
    const h25 = tmp.find((a:any)=> a.id===apuId);
    const mold = tmp.find((a:any)=> a.id===moldId);
    const ladr = tmp.find((a:any)=> a.id===ladrId);
    if(h25 || mold || ladr){
      const others = tmp.filter((a:any)=> a.id!==apuId && a.id!==moldId && a.id!==ladrId);
      const reordered2 = [h25, mold, ladr, ...others].filter(Boolean);
      saveLibrary(reordered2);
    }

    // Sembrar los 16 APUs nuevos solicitados y ordenar biblioteca completa
    const readLib2 = () => { try{ return JSON.parse(localStorage.getItem('apu-library')||'[]'); }catch{ return customApus; } };
    let lib2 = readLib2();
    const builders: Array<[string, ()=>any]> = [
      ['apu_exc_zanja_manual', buildApuExcavacionZanjaManual],
      ['apu_relleno_compact_manual', buildApuRellenoCompactManual],
      ['apu_hormigon_zapata_corrida_ml', buildApuZapataCorridaEnZanja],
      ['apu_radier_h25_10cm_malla_polietileno', buildApuRadierH25ConMalla],
      ['apu_albanileria_ladrillo_fiscal_m2', buildApuAlbanileriaLadrilloComun],
      ['apu_tabique_metalcon_90_doble_placa', buildApuTabiqueMetalconDoblePlaca],
      ['apu_cielo_yeso_carton_12_5_sobre_perf', buildApuCieloRasoYesoCarton],
      ['apu_estructura_techumbre_madera', buildApuEstructuraTechumbreMadera],
      ['apu_cubierta_zinc_0_35_fieltro', buildApuCubiertaZincFieltro],
  ['apu_techumbre_teja_asfaltica_m2', buildApuTechumbreTejaAsfaltica],
      ['apu_canaleta_pvc_4_instalada', buildApuCanaletaPVC4],
      ['apu_bajada_lluvias_pvc_75_instalada', buildApuBajadaAguasLLuvias75],
      ['apu_revestimiento_exterior_fibro_6mm_sobre_liston', buildApuRevestimientoFibrocemento],
  ['apu_muro_ext_2x4_osb11_lana80_fc6_pint', buildApuMuroExtMaderaOsbFc],
      ['apu_piso_ceramica_60x60', buildApuPisoCeramica],
  ['apu_piso_porcelanato_60x60', buildApuPorcelanato],
  ['apu_piso_ceramica_base', buildApuCeramicaPiso],
  ['apu_piso_flotante_7mm', buildApuPisoFlotante],
  ['apu_ceramica_muro_bano', buildApuCeramicaMuroBano],
      ['apu_pintura_interior_latex_muros', buildApuPinturaInteriorLatex],
  ['apu_pintura_exterior_fibro', buildApuPinturaExteriorFibro],
  ['apu_tabique_2x4_volcanita_simple', buildApuTabiqueMaderaVolcanitaSimple],
      ['apu_ventana_aluminio_120x100_instalada', buildApuVentanaAluminio],
      ['apu_puerta_interior_mdf_70x200_instalada', buildApuPuertaInteriorMdf],
      // Bloque agregado (estructuras/terminaciones adicionales)
      ['apu_losa_12cm_malla_c92', buildApuLosa12cmMallaC92],
      ['apu_entramado_2x8_osb18', buildApuEntramado2x8Osb18],
      ['apu_sobrecimiento_20x20_h20', buildApuSobrecimiento20x20],
      ['apu_barrera_humedad_vent_entretechos', buildApuBarreraHumedadVent],
      ['apu_cumbreras_metalicas', buildApuCumbrerasMetalicas],
      ['apu_imper_membrana_3mm_losa', buildApuImperMembrana3mm],
      ['apu_saneamiento_basico_biodigestor', buildApuSaneamientoBasico],
      ['apu_vent_mecanica_local_100mm', buildApuVentMecanicaLocal],
      ['apu_sellos_hermeticidad_vanos', buildApuSellosHermeticidad],
      ['apu_sellos_cortafuego_pasamuros', buildApuSellosCortafuego],
      ['apu_muro_contencion_hoa_20cm_dren', buildApuMuroContencion20cm],
      ['apu_acond_termico_muros_lana100_bv', buildApuAcondTermMuros],
      ['apu_acond_termico_cielo_lana100', buildApuAcondTermCielo],
      // Segundo bloque (impermeabilizaciones, pasamanos, servicios, etc.)
      ['apu_imper_muros_bano_2k', buildApuImperMurosBano2K],
      ['apu_imper_muros_ext_asfaltica', buildApuImperMurosExtAsfaltica],
      ['apu_antepecho_12x20_hoa', buildApuAntepecho12x20],
      ['apu_limahoya_metal_flashband', buildApuLimahoyaFlashband],
      ['apu_dintel_12x20_hoa', buildApuDintel12x20],
      ['apu_pasamanos_madera_interior', buildApuPasamanosMadera],
      ['apu_baranda_metal_simple', buildApuBarandaMetalSimple],
      ['apu_conector_viga_apoyo', buildApuConectorVigaApoyo],
      ['apu_estabil_talud_geotextil', buildApuEstabilTaludGeotextil],
      ['apu_serv_topografia_lote_urbano', buildApuServTopo],
      ['apu_serv_proctor_dr', buildApuServProctor],
      ['apu_serv_mecanica_suelos_calicata', buildApuServMecanicaSuelos],
      ['apu_serv_te1_empalme_40a', buildApuServTE1Empalme],
      ['apu_serv_empalme_sanitario', buildApuServEmpalmeSanitario],
      ['apu_vent_higroregulada_bano_cocina', buildApuVentHigro],
  ['apu_electrica_completa_gl', buildApuElectricaCompleta],
  ['apu_sanitaria_completa_gl', buildApuSanitariaCompleta],
  ['apu_terminaciones_menores_ml', buildApuTerminacionesMenoresML],
  ['apu_tramite_dom_permiso', buildApuTramiteDom],
  ['apu_tramite_calculo_estructural', buildApuTramiteCalculo],
  ['apu_tramite_recepcion_final', buildApuTramiteRecepcion],
  ['apu_tramite_te1_sec', buildApuTramiteTE1],
  // Nuevos: Excavación/Retiro, Base estabilizada 10 cm, Encofrado, Enfierradura, H25 obra+vibrado, Curado, Impermeabilización cementicia 2 capas, Pintura piscina
  ['apu_excavacion_retiro_m3', buildApuExcavacionRetiroM3],
  ['apu_base_estabilizada_10cm_m2', buildApuBaseEstabilizada10cmM2],
  ['apu_encofrado_doble_cara_m2', buildApuEncofradoDobleCaraM2],
  ['apu_enfierradura_kg', buildApuEnfierraduraKg],
  ['apu_h25_obra_vibrado_m3', buildApuH25ObraVibradoM3],
  ['apu_curado_humedo_m2', buildApuCuradoHumedoM2],
  ['apu_imper_cementicia_2capas_m2', buildApuImperCementicia2capasM2],
  ['apu_pintura_piscina_2manos_m2', buildApuPinturaPiscina2manosM2],
  // Red hidráulica y equipos (unitarios)
  ['apu_red_hid_pvc50_tuberia_ml', buildApuRedHid_PVC50_Tuberia_ml],
  ['apu_red_hid_codo_50_u', buildApuRedHid_Codo50_u],
  ['apu_red_hid_tee_50_u', buildApuRedHid_Tee50_u],
  ['apu_red_hid_valvula_bola_50_u', buildApuRedHid_ValvulaBola50_u],
  ['apu_red_hid_skimmer_u', buildApuRedHid_Skimmer_u],
  ['apu_red_hid_retorno_u', buildApuRedHid_Retorno_u],
  ['apu_red_hid_desague_fondo_u', buildApuRedHid_DesagueFondo_u],
  ['apu_red_hid_kit_filtro_bomba_set', buildApuRedHid_KitFiltroBomba_set],
  ['apu_red_hid_arena_filtro_saco', buildApuRedHid_ArenaFiltro_saco],
  ['apu_red_hid_pruebas_ls', buildApuRedHid_PruebasLS],
  ['apu_red_hid_conjunto_set', buildApuRedHidConjuntoSet],
      // Usuario: nuevos APUs
      ['apu_subbase_estab_15cm_m2', buildApuSubbaseEstabilizada15cm],
      ['apu_muro_ext_23_osb_house_lana_yeso_m2', buildApuMuroExt23OsbHousewrapLanaYeso],
      ['apu_eifs_40mm_m2', buildApuEIFS40mm],
      ['apu_siding_vinilico_m2', buildApuSidingVinilico],
      ['apu_cubierta_teja_asfaltica_osb_fieltro_m2', buildApuCubiertaTejaAsfalticaOsbFieltro],
      ['apu_revest_ceramico_muro_30x60_m2', buildApuRevestCeramicoMuro3060],
      ['apu_cielo_pvc_tablilla_20cm_m2', buildApuCieloPVCtab20cm],
      ['apu_carpeta_autonivelante_5mm_m2', buildApuCarpetaAutonivelante5mm],
      ['apu_pav_ext_h25_8cm_malla_m2', buildApuPavimentoExteriorH25_8cmMalla],
      ['apu_camara_inspeccion_pvc_50x50x60_u', buildApuCamaraInspeccionPVC50x50x60],
      ['apu_trampa_grasas_50l_u', buildApuTrampaGrasas50L],
      ['apu_cierre_perimetral_malla_2m_postes_ml', buildApuCierrePerimetralMalla2mPostes],
    ];
    const lib2Ids = new Set((lib2||[]).map((a:any)=>a.id));
    builders.forEach(([id, builder])=>{ if(!lib2Ids.has(id)) { lib2 = [...lib2, builder()]; lib2Ids.add(id); } });

    // Migración: si alguno de los 12 APUs nuevos ya existía pero con secciones/materiales vacíos, actualizarlo con el builder
    const builderMap = new Map<string, ()=>any>(builders);
    lib2 = (lib2||[]).map((apu:any)=>{
      if(!builderMap.has(apu.id)) return apu;
      try{
        const built = builderMap.get(apu.id)!();
        const sec = (apu as any).secciones || {};
        const hasMat = Array.isArray(sec.materiales) && sec.materiales.length > 0;
        const hasMO = Array.isArray(sec.manoObra) && sec.manoObra.length > 0;
        const hasVarios = Array.isArray(sec.varios) && sec.varios.length > 0;
        const needsUpdate = !sec || !hasMat || !hasMO || !hasVarios;
        if(needsUpdate){
          return { ...apu, secciones: built.secciones, unidadSalida: apu.unidadSalida || built.unidadSalida, categoria: apu.categoria || built.categoria };
        }
      }catch{}
      return apu;
    });

    const desiredOrder: string[] = [
      apuId,
      moldId,
      ladrId,
      // Nuevos solicitados (prioridad al principio de MT/OG)
      'apu_excavacion_retiro_m3',
      'apu_base_estabilizada_10cm_m2',
      'apu_encofrado_doble_cara_m2',
      'apu_enfierradura_kg',
      'apu_h25_obra_vibrado_m3',
      'apu_curado_humedo_m2',
  'apu_imper_cementicia_2capas_m2',
    'apu_pintura_piscina_2manos_m2',
      'apu_red_hid_pvc50_tuberia_ml',
      'apu_red_hid_codo_50_u',
      'apu_red_hid_tee_50_u',
      'apu_red_hid_valvula_bola_50_u',
      'apu_red_hid_skimmer_u',
      'apu_red_hid_retorno_u',
      'apu_red_hid_desague_fondo_u',
      'apu_red_hid_kit_filtro_bomba_set',
      'apu_red_hid_arena_filtro_saco',
      'apu_red_hid_pruebas_ls',
  'apu_red_hid_conjunto_set',
      'apu_exc_zanja_manual',
      'apu_relleno_compact_manual',
      'apu_hormigon_zapata_corrida_ml',
      'apu_radier_h25_10cm_malla_polietileno',
      'apu_albanileria_ladrillo_fiscal_m2',
      'apu_tabique_metalcon_90_doble_placa',
      'apu_cielo_yeso_carton_12_5_sobre_perf',
      'apu_estructura_techumbre_madera',
      'apu_cubierta_zinc_0_35_fieltro',
  'apu_techumbre_teja_asfaltica_m2',
      'apu_canaleta_pvc_4_instalada',
      'apu_bajada_lluvias_pvc_75_instalada',
      'apu_revestimiento_exterior_fibro_6mm_sobre_liston',
  'apu_muro_ext_2x4_osb11_lana80_fc6_pint',
  'apu_piso_ceramica_60x60', 'apu_piso_porcelanato_60x60', 'apu_piso_ceramica_base', 'apu_piso_flotante_7mm', 'apu_ceramica_muro_bano',
      'apu_pintura_interior_latex_muros',
  'apu_pintura_exterior_fibro',
  'apu_tabique_2x4_volcanita_simple',
      'apu_ventana_aluminio_120x100_instalada',
      'apu_puerta_interior_mdf_70x200_instalada',
      // Nuevos agregados en esta tanda
      'apu_losa_12cm_malla_c92',
      'apu_entramado_2x8_osb18',
      'apu_sobrecimiento_20x20_h20',
      'apu_barrera_humedad_vent_entretechos',
      'apu_cumbreras_metalicas',
      'apu_imper_membrana_3mm_losa',
      'apu_saneamiento_basico_biodigestor',
      'apu_vent_mecanica_local_100mm',
      'apu_sellos_hermeticidad_vanos',
      'apu_sellos_cortafuego_pasamuros',
      'apu_muro_contencion_hoa_20cm_dren',
      'apu_acond_termico_muros_lana100_bv',
      'apu_acond_termico_cielo_lana100',
      // Nuevos del segundo bloque
      'apu_imper_muros_bano_2k',
      'apu_imper_muros_ext_asfaltica',
      'apu_antepecho_12x20_hoa',
      'apu_limahoya_metal_flashband',
      'apu_dintel_12x20_hoa',
      'apu_pasamanos_madera_interior',
      'apu_baranda_metal_simple',
      'apu_conector_viga_apoyo',
      'apu_estabil_talud_geotextil',
      'apu_serv_topografia_lote_urbano',
      'apu_serv_proctor_dr',
      'apu_serv_mecanica_suelos_calicata',
      'apu_serv_te1_empalme_40a',
      'apu_serv_empalme_sanitario',
      'apu_vent_higroregulada_bano_cocina',
  'apu_electrica_completa_gl', 'apu_sanitaria_completa_gl', 'apu_terminaciones_menores_ml',
  'apu_tramite_dom_permiso', 'apu_tramite_calculo_estructural', 'apu_tramite_recepcion_final', 'apu_tramite_te1_sec',
      // Usuario: nuevos APUs
      'apu_subbase_estab_15cm_m2',
      'apu_muro_ext_23_osb_house_lana_yeso_m2',
      'apu_eifs_40mm_m2',
      'apu_siding_vinilico_m2',
      'apu_cubierta_teja_asfaltica_osb_fieltro_m2',
      'apu_revest_ceramico_muro_30x60_m2',
      'apu_cielo_pvc_tablilla_20cm_m2',
      'apu_carpeta_autonivelante_5mm_m2',
      'apu_pav_ext_h25_8cm_malla_m2',
      'apu_camara_inspeccion_pvc_50x50x60_u',
      'apu_trampa_grasas_50l_u',
      'apu_cierre_perimetral_malla_2m_postes_ml',
    ];
    const map2 = new Map<string, any>((lib2||[]).map((a:any)=>[a.id, a] as const));
    const ordered = desiredOrder.map(id=> map2.get(id)).filter(Boolean) as any[];
    const used = new Set(ordered.map(a=>a.id));
    const rest = (lib2||[]).filter((a:any)=> !used.has(a.id));
    saveLibrary([ ...ordered, ...rest ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Biblioteca UI state
  const [libScope, setLibScope] = useState<'all'|'mine'>('all');
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState<string>('all');
  const [showCreateApu, setShowCreateApu] = useState(false);
  const [showEditApu, setShowEditApu] = useState(false);
  const [apuEditing, setApuEditing] = useState<any|null>(null);
  // Expansión inline para edición estilo planilla
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [expandedForm, setExpandedForm] = useState<any|null>(null);
  // Consideramos "míos" solo los creados por el usuario (id inicia con custom_)
  const isMineById = (id:string)=> String(id||'').startsWith('custom_');
  const toggleExpandRow = (id:string)=>{
    if(expandedId === id){ setExpandedId(null); setExpandedForm(null); return; }
    const apu = getApuById(id);
    const sec0 = (apu as any).secciones || { materiales:[{descripcion:'',unidad:'',cantidad:0,pu:0}], equipos:[{descripcion:'',unidad:'',cantidad:0,pu:0}], manoObra:[{descripcion:'',unidad:'',cantidad:0,pu:0}], varios:[{descripcion:'',unidad:'',cantidad:0,pu:0}], __meta: {} };
    const form = {
      descripcion: apu.descripcion || '',
      unidadSalida: apu.unidadSalida || '',
      categoria: (apu as any).categoria || '',
      
      secciones: sec0,
    };
    setExpandedId(id);
    setExpandedForm(form);
  };
  const updateFormSecRow = (secKey:string, index:number, patch:any)=>{
    setExpandedForm((f:any)=>{
      const rows = [...(f.secciones?.[secKey]||[])];
      rows[index] = { ...rows[index], ...patch };
      return { ...f, secciones: { ...f.secciones, [secKey]: rows } };
    });
  };
  const addFormSecRow = (secKey:string)=>{
    setExpandedForm((f:any)=>{
      const rows = [...(f.secciones?.[secKey]||[])];
      rows.push({ descripcion:'', unidad:'', cantidad:0, pu:0 });
      return { ...f, secciones: { ...f.secciones, [secKey]: rows } };
    });
  };
  const delFormSecRow = (secKey:string, index:number)=>{
    setExpandedForm((f:any)=>{
      const rows = [...(f.secciones?.[secKey]||[])];
      rows.splice(index,1);
      return { ...f, secciones: { ...f.secciones, [secKey]: rows } };
    });
  };
  const updateFormMeta = (patch:any)=>{
    setExpandedForm((f:any)=> ({ ...f, secciones: { ...(f.secciones||{}), __meta: { ...((f.secciones||{}).__meta||{}), ...patch } } }));
  };
  // Secciones extra (inline biblioteca)
  const addFormExtraSection = ()=>{
    const title = (prompt('Nombre de la nueva sección:')||'').trim();
    if(!title) return;
    setExpandedForm((f:any)=>{
      const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
      extras.push({ title, rows: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }]});
      return { ...f, secciones: { ...f.secciones, extras } };
    });
  };
  const updateFormExtraRow = (secIdx:number, rowIdx:number, patch:any)=>{
    setExpandedForm((f:any)=>{
      const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
      if(!extras[secIdx]) return f;
      const sec = { ...extras[secIdx] };
      const rows = Array.isArray(sec.rows)? [...sec.rows] : [];
      rows[rowIdx] = { ...rows[rowIdx], ...patch };
      extras[secIdx] = { ...sec, rows };
      return { ...f, secciones: { ...f.secciones, extras } };
    });
  };
  const addFormExtraRow = (secIdx:number)=>{
    setExpandedForm((f:any)=>{
      const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
      if(!extras[secIdx]) return f;
      const sec = { ...extras[secIdx] };
      const rows = Array.isArray(sec.rows)? [...sec.rows] : [];
      rows.push({ descripcion:'', unidad:'', cantidad:0, pu:0 });
      extras[secIdx] = { ...sec, rows };
      return { ...f, secciones: { ...f.secciones, extras } };
    });
  };
  const delFormExtraRow = (secIdx:number, rowIdx:number)=>{
    setExpandedForm((f:any)=>{
      const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
      if(!extras[secIdx]) return f;
      const sec = { ...extras[secIdx] };
      const rows = Array.isArray(sec.rows)? [...sec.rows] : [];
      rows.splice(rowIdx,1);
      extras[secIdx] = { ...sec, rows };
      return { ...f, secciones: { ...f.secciones, extras } };
    });
  };
  const saveExpanded = ()=>{
    if(!expandedId || !expandedForm) return;
    // Permitir editar cualquier APU que esté en la biblioteca actual
    const exists = allApus.find(a=>a.id===expandedId);
    if(exists){
  const next = allApus.map(x=> x.id===expandedId? { ...x, descripcion: expandedForm.descripcion, unidadSalida: expandedForm.unidadSalida, categoria: expandedForm.categoria || '', secciones: expandedForm.secciones } : x);
      saveLibrary(next);
      showNotification('APU actualizado','success');
    } else {
      showNotification('APU no encontrado','error');
    }
    setExpandedId(null); setExpandedForm(null);
  };

  const handleCreateApu = (apu:any)=>{
    if(!apu?.descripcion || !apu.descripcion.trim() || !apu?.unidadSalida || !apu.unidadSalida.trim()){
      setShowCreateApu(true);
      showNotification('Completa descripción y unidad','error');
      return;
    }
  const withId = { ...apu, id: 'custom_'+uid(), categoria: apu.categoria || '', items: apu.items || [] };
    const next = [...customApus, withId];
    saveLibrary(next);
    setShowCreateApu(false);
  if(pendingAssignRowId){
      const newRows = rows.map(r=>{
        if(r.id!==pendingAssignRowId) return r;
        const current: string[] = (r.apuIds && r.apuIds.length)? r.apuIds : (r.apuId? [r.apuId] : []);
        const nextIds = current.includes(withId.id) ? current : [...current, withId.id];
        return { ...r, apuIds: nextIds, apuId: nextIds[0] || null };
      });
      setRows(newRows); saveBudget(newRows);
      setPendingAssignRowId(null);
      setTab('presupuesto');
      showNotification('APU creado y asignado','success');
      setTimeout(()=> setApuDetail({ open:true, id: withId.id }), 0);
    } else {
      showNotification('APU creado','success');
      setTimeout(()=> setApuDetail({ open:true, id: withId.id }), 0);
    }
  };
  const handleOpenEditApu = (id:string)=>{
    const a = customApus.find(x=>x.id===id); if(!a) return; setApuEditing(a); setShowEditApu(true);
  };
  const handleSaveEditApu = (apu:any)=>{
    if(!apuEditing) return;
    // Actualizar APU existente (solo personalizados)
  const next = customApus.map(x=> x.id===apuEditing.id? { ...apuEditing, ...apu, categoria: apu.categoria ?? (apuEditing as any).categoria ?? '' } : x);
    saveLibrary(next); setShowEditApu(false); setApuEditing(null); showNotification('APU modificado','success');
  };

  // Navegación desde partidas para editar APU de biblioteca
  useEffect(()=>{
    const onEditReq = (e: any)=>{
      const id = e?.detail?.id;
      if(!id) return;
      setTab('biblioteca');
      handleOpenEditApu(id);
    };
    window.addEventListener('apu-edit-request', onEditReq as any);
    return ()=> window.removeEventListener('apu-edit-request', onEditReq as any);
  }, [customApus]);
  const handleDeleteApu = (id:string)=>{
    if(!isMineById(id)) { showNotification('Este APU es parte de la Biblioteca base y no puede eliminarse','info'); return; }
    if(!confirm('¿Eliminar este APU?')) return;
    const next = customApus.filter(x=>x.id!==id);
    saveLibrary(next);
    showNotification('APU eliminado','info');
  };
  const addBudgetRowWithApu = (apuId:string)=>{
    const newRows = [...rows, { id: uid(), apuId, metrados: 1 }]; setRows(newRows); saveBudget(newRows); setTab('presupuesto'); showNotification('Partida agregada','success');
  };

  // Presupuesto: partidas solo con APU (sin editor A-D en presupuesto)
  const [budgetExpandedId] = useState<string|null>(null);
  const [budgetExpandedForm] = useState<any|null>(null);
  const toggleExpandBudgetRow = (_rowId:string)=>{};
  const budgetUpdateFormSecRow = (_secKey:string, _index:number, _patch:any)=>{};
  const budgetAddFormSecRow = (_secKey:string)=>{};
  const budgetDelFormSecRow = (_secKey:string, _index:number)=>{};
  const saveBudgetExpanded = ()=>{};

  // Presupuesto
  // Capítulos (múltiples)
  type Chapter = { id:string; letter:string; title:string; subChapters?: { id:string; title:string }[] };
  const loadChapters = ():Chapter[]=>{ try{ return JSON.parse(localStorage.getItem('apu-chapters')||'[]'); }catch{ return []; } };
  const saveChapters = (list:Chapter[])=>{ try{ localStorage.setItem('apu-chapters', JSON.stringify(list)); }catch{} };
  const loadCurrentChapter = ()=>{ try{ return localStorage.getItem('apu-current-chapter') || ''; }catch{ return ''; } };
  const saveCurrentChapter = (id:string)=>{ try{ localStorage.setItem('apu-current-chapter', id); }catch{} };
  const [chapters, setChapters] = useState<Chapter[]>(()=> loadChapters());
  const [currentChapterId, setCurrentChapterId] = useState<string>(()=>{
    const c = loadCurrentChapter();
    if(c) return c;
    const list = loadChapters();
    return list[list.length-1]?.id || '';
  });
  const addChapter = ()=>{
    const letter = (prompt('Letra del capítulo (ej: A):') || '').trim();
    const title = (prompt('Título del capítulo:') || '').trim();
    if(!letter && !title) return;
    const ch:Chapter = { id: uid(), letter: letter || '-', title: title || 'TÍTULO' };
    const next = [...chapters, ch]; setChapters(next); saveChapters(next); setCurrentChapterId(ch.id); saveCurrentChapter(ch.id);
  };
  const addSubChapter = (chapterId:string)=>{
    const ch = chapters.find(c=>c.id===chapterId); if(!ch) return;
    const title = (prompt('Título del subcapítulo:')||'').trim();
    if(!title) return;
    const sc = { id: uid(), title };
    const upd = chapters.map(c=> c.id===chapterId? { ...c, subChapters: [ ...(c.subChapters||[]), sc ] } : c);
    setChapters(upd); saveChapters(upd); showNotification('Subcapítulo agregado','success');
  };
  const renameSubChapter = (chapterId:string, subId:string)=>{
    const ch = chapters.find(c=>c.id===chapterId); if(!ch) return;
    const sc = (ch.subChapters||[]).find(s=>s.id===subId); if(!sc) return;
    const title = (prompt('Nuevo título del subcapítulo:', sc.title)||'').trim();
    if(!title) return;
    const upd = chapters.map(c=> c.id===chapterId? { ...c, subChapters: (c.subChapters||[]).map(s=> s.id===subId? { ...s, title } : s) } : c);
    setChapters(upd); saveChapters(upd); showNotification('Subcapítulo renombrado','success');
  };
  const deleteSubChapter = (chapterId:string, subId:string)=>{
    const ch = chapters.find(c=>c.id===chapterId); if(!ch) return;
    if(!confirm('¿Eliminar este subcapítulo?')) return;
    const upd = chapters.map(c=> c.id===chapterId? { ...c, subChapters: (c.subChapters||[]).filter(s=> s.id!==subId) } : c);
    setChapters(upd); saveChapters(upd); showNotification('Subcapítulo eliminado','info');
  };
  const renameChapter = (id:string)=>{
    const ch = chapters.find(c=>c.id===id); if(!ch) return;
    const letter = (prompt('Nueva letra del capítulo:', ch.letter) || '').trim();
    const title = (prompt('Nuevo título del capítulo:', ch.title) || '').trim();
    if(!letter && !title) return;
    const upd = chapters.map(c=> c.id===id? { ...c, letter: letter || c.letter, title: title || c.title } : c);
    setChapters(upd); saveChapters(upd);
  };
  const deleteChapter = (id:string)=>{
    const ch = chapters.find(c=>c.id===id); if(!ch) return;
    const chRows = rows.filter(r=> r.chapterId===id);
    const others = chapters.filter(c=>c.id!==id);
    if(chRows.length>0 && others.length===0){ alert('No puedes eliminar el capítulo porque tiene partidas y no hay otro capítulo para moverlas. Crea otro capítulo primero.'); return; }
    if(!confirm(`¿Eliminar capítulo ${ch.letter} — ${ch.title}?${chRows.length>0? '\nLas partidas se moverán al capítulo activo.':''}`)) return;
    let targetId = currentChapterId && currentChapterId!==id ? currentChapterId : (others[0]?.id || '');
    if(chRows.length>0 && targetId){
      const moved = rows.map(r=> r.chapterId===id? { ...r, chapterId: targetId } : r);
      setRows(moved); saveBudget(moved);
    }
    const upd = chapters.filter(c=> c.id!==id);
    setChapters(upd); saveChapters(upd);
    if(currentChapterId===id){ const newCur = upd[upd.length-1]?.id || ''; setCurrentChapterId(newCur); saveCurrentChapter(newCur); }
  };
  const moveRowToChapter = (rowId:string, chapterId:string)=>{
    const next = rows.map(r=> r.id===rowId? { ...r, chapterId } : r);
    setRows(next); saveBudget(next);
  };
  const loadBudget = ()=>{ try{ return JSON.parse(localStorage.getItem('apu-budget')||'[]'); }catch{ return []; } };
  const saveBudget = (newRows:any[])=>{ try{ localStorage.setItem('apu-budget', JSON.stringify(newRows)); }catch{} };
  const [rows, setRows] = useState<any[]>(()=>{
    // Cargar todo lo guardado, incluyendo filas sin APU
    const saved = (loadBudget()||[]);
    return saved.length? saved : [];
  });

  // Seed inicial: APU vacío + capítulo/partida/subpartida de ejemplo si no existe nada
  useEffect(()=>{
    try{
      // 1) Biblioteca: asegurar al menos un APU vacío listo para rellenar
      let seedApuId: string | null = null;
      if((customApus||[]).length === 0){
        const demoApu = {
          id: 'custom_'+uid(),
          codigo: 'CUST',
          codigoExterno: '',
          descripcion: 'APU vacío (ejemplo)',
          unidadSalida: 'm2',
          items: [],
          secciones: {
            materiales: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
            equipos: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
            manoObra: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
            varios: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
            extras: [],
            __titles: {
              materiales: 'A.- MATERIALES',
              equipos: 'B.- EQUIPOS, MAQUINARIAS Y TRANSPORTES',
              manoObra: 'C.- MANO DE OBRA',
              varios: 'D.- VARIOS',
            }
          }
        } as any;
        const nextLib = [demoApu];
        saveLibrary(nextLib);
        seedApuId = demoApu.id;
      } else {
        const found = customApus.find(a=> (a.descripcion||'').toLowerCase().includes('apu vacío'));
        seedApuId = found?.id || null;
      }

      // 2) Capítulos: crear capítulo A y subcapítulo si no hay ninguno
      if((chapters||[]).length === 0){
        const chId = uid();
        const scId = uid();
        const ch = { id: chId, letter: 'A', title: 'CAPÍTULO 1', subChapters: [ { id: scId, title: 'Subcapítulo 1' } ] } as any;
        const list = [ch];
        setChapters(list); saveChapters(list);
        setCurrentChapterId(chId); saveCurrentChapter(chId);
      }

      // 3) Partidas: crear una partida 1 con subpartida 1 enlazada al APU vacío si no hay ninguna fila
      if((rows||[]).length === 0){
        const chId = (chapters[0]?.id) || loadChapters()[0]?.id || uid();
        if(!chapters.length){
          // En caso extremo de carrera, asegurar capítulo base
          const ch = { id: chId, letter: 'A', title: 'CAPÍTULO 1', subChapters: [ { id: uid(), title: 'Subcapítulo 1' } ] } as any;
          setChapters([ch]); saveChapters([ch]); setCurrentChapterId(chId); saveCurrentChapter(chId);
        }
        const sub = { id: uid(), descripcion: 'Subpartida 1', unidadSalida: 'm2', metrados: 1, apuIds: seedApuId? [seedApuId] : [] as string[], overrideUnitPrice: undefined as number|undefined, overrideTotal: undefined as number|undefined };
        const nueva = { id: uid(), chapterId: chId, codigo: '', descripcion: 'Partida 1', unidadSalida: 'm2', metrados: 0, apuId: null as any, apuIds: [] as string[], subRows: [sub] } as any;
        const list = [nueva];
        setRows(list); saveBudget(list);
      }
    }catch(err){ /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const addRow = ()=>{
    if(!chapters.length){ addChapter(); }
    if(!chapters.length){ return; }
    if(!currentChapterId){ const last = chapters[chapters.length-1]?.id; if(last){ setCurrentChapterId(last); saveCurrentChapter(last); } }
    const codigo = prompt('Código de la partida (opcional):') ?? '';
    const nombre = prompt('Nombre/Descripción de la partida:') ?? '';
    // Si el usuario cancela ambas, no crear
    if (codigo === '' && nombre.trim() === '') { return; }
    const nueva = { id: uid(), chapterId: currentChapterId || chapters[chapters.length-1].id, apuId: null, apuIds: [] as string[], metrados: 0, codigo: codigo.trim(), descripcion: nombre.trim(), unidadSalida: '' };
    const newRows = [...rows, nueva];
    setRows(newRows); saveBudget(newRows); showNotification('Partida agregada','success');
  };
  const updRow = (id:string, patch:any)=>{ const newRows = rows.map(r=> r.id===id? { ...r, ...patch }: r); setRows(newRows); saveBudget(newRows); };
  const delRow = (id:string)=>{ const newRows = rows.filter(r=> r.id!==id); setRows(newRows); saveBudget(newRows); showNotification('Partida eliminada','info'); };
  const duplicateRow = (id:string)=>{
    const idx = rows.findIndex(r=> r.id===id);
    if(idx<0) return;
    const src = rows[idx];
    const clone = { ...src, id: uid(), order: (typeof src.order === 'number' ? src.order + 1 : undefined) };
    const next = [...rows.slice(0, idx+1), clone, ...rows.slice(idx+1)];
    setRows(next); saveBudget(next); showNotification('Partida duplicada','success');
  };

  // Crear rápidamente una partida + subpartida que use el APU vacío (ejemplo)
  const addExampleEmptyApu = ()=>{
    // 1) Obtener o crear APU vacío
    let seed = customApus.find(a=> (a.descripcion||'').toLowerCase().includes('apu vacío')) as any;
    if(!seed){
      const demoApu = {
        id: 'custom_'+uid(),
        codigo: 'CUST',
        codigoExterno: '',
        descripcion: 'APU vacío (ejemplo)',
        unidadSalida: 'm2',
        items: [],
        secciones: {
          materiales: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
          equipos: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
          manoObra: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
          varios: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }],
          extras: [],
          __titles: {
            materiales: 'A.- MATERIALES',
            equipos: 'B.- EQUIPOS, MAQUINARIAS Y TRANSPORTES',
            manoObra: 'C.- MANO DE OBRA',
            varios: 'D.- VARIOS',
          }
        }
      } as any;
      const nextLib = [...customApus, demoApu];
      saveLibrary(nextLib);
      seed = demoApu;
    }
    // 2) Asegurar capítulo activo
    let chId = currentChapterId;
    if(!chId){
      if(chapters.length===0){
        const newChId = uid();
        const scId = uid();
        const ch = { id: newChId, letter: 'A', title: 'CAPÍTULO 1', subChapters: [ { id: scId, title: 'Subcapítulo 1' } ] } as any;
        const list = [ch];
        setChapters(list); saveChapters(list);
        setCurrentChapterId(newChId); saveCurrentChapter(newChId);
        chId = newChId;
      } else {
        chId = chapters[chapters.length-1].id;
        setCurrentChapterId(chId); saveCurrentChapter(chId);
      }
    }
    // 3) Crear partida con subpartida que usa el APU vacío
    const sub = { id: uid(), descripcion: 'Subpartida 1', unidadSalida: seed.unidadSalida || 'm2', metrados: 1, apuIds: [seed.id], overrideUnitPrice: undefined as number|undefined, overrideTotal: undefined as number|undefined };
    const nueva = { id: uid(), chapterId: chId, codigo: '', descripcion: 'Partida 1', unidadSalida: seed.unidadSalida || 'm2', metrados: 0, apuId: null as any, apuIds: [] as string[], subRows: [sub] } as any;
    const list = [...rows, nueva];
    setRows(list); saveBudget(list);
    showNotification('Partida y subpartida de ejemplo agregadas','success');
  };

  // Cargar preset: Casa 10×10 m (1 piso) — Octubre 14 de 2025
  const loadPresetCasa1010 = (opts?:{ replace?: boolean })=>{
    const replace = opts?.replace !== false; // por defecto reemplaza
    // 1) Ajustar parámetros de proyecto según brief: GG+U 12% + Imprevistos 3%, IVA 0% (el total informado excluye IVA)
    setGG(0.12); localStorage.setItem('apu-gg', String(0.12));
    setUtil(0.03); localStorage.setItem('apu-util', String(0.03));
    setIva(0.00); localStorage.setItem('apu-iva', String(0.00));
    // 2) Crear capítulo único "CASA 10×10 — 1 PISO"
  const chId = uid();
  const chapter = { id: chId, letter: 'A', title: 'CASA 10×10 — 1 PISO', subChapters: [] as { id:string; title:string }[] } as any;
    const chNext = replace ? [chapter] : [...chapters, chapter];
    setChapters(chNext); saveChapters(chNext); setCurrentChapterId(chId); saveCurrentChapter(chId);
    // Asegurar APUs requeridos en biblioteca antes de referenciarlos
    const ensureApu = (id:string, builder: ()=>any)=>{
      let lib = [...customApus];
      if(!lib.find(a=>a.id===id)){
        const created = builder();
        lib = [...lib, created];
        saveLibrary(lib);
      }
      return id;
    };
    // Utilidades de búsqueda (post-aseguramiento)
    const find = (k:string)=> (allApus.find(a=> a.id===k) || customApus.find(a=>a.id===k)) || null;
  const mkRow = (descr:string, unidad:string, codigo:string, subRows:any[])=> ({ id: uid(), chapterId: chId, codigo, descripcion: descr, unidadSalida: unidad, metrados: 0, apuId: null, apuIds: [], subRows } as any);
    const mkSub = (descr:string, unidad:string, qty:number, apuIds:string[] = [], overrideUnitPrice?:number, overrideTotal?:number)=> ({ id: uid(), descripcion: descr, unidadSalida: unidad, metrados: qty, apuIds, overrideUnitPrice, overrideTotal });
    // Asegurar y tomar ids
    const apuIds = {
      radier: ensureApu('apu_radier_h25_10cm_malla_polietileno', buildApuRadierH25ConMalla),
      cielo: ensureApu('apu_cielo_yeso_eps100', buildApuCieloYesoMasAislacion),
      canaleta: ensureApu('apu_canaleta_pvc_4_instalada', buildApuCanaletaPVC4),
      pinturaInt: ensureApu('apu_pintura_interior_latex_muros', buildApuPinturaInteriorLatex),
      puertaInt: ensureApu('apu_puerta_interior_mdf_70x200_instalada', buildApuPuertaInteriorMdf),
      puertaExt: ensureApu('apu_puerta_exterior_acero_90x200_instalada', buildApuPuertaExteriorAcero),
  ventana100x100: ensureApu('apu_ventana_aluminio_100x100_instalada', buildApuVentanaAluminio100x100),
      ventana60x40: ensureApu('apu_ventana_aluminio_60x40_instalada', buildApuVentanaAluminio6040),
      pisoCeramica: ensureApu('apu_piso_ceramica_60x60', buildApuPisoCeramica),
      muroExt: ensureApu('apu_muro_ext_2x4_osb11_lana80_fc6_pint', buildApuMuroExtMaderaOsbFc),
      tabique: ensureApu('apu_tabique_2x4_volcanita_simple', buildApuTabiqueMaderaVolcanitaSimple),
      techTeja: ensureApu('apu_techumbre_teja_asfaltica_m2', buildApuTechumbreTejaAsfaltica),
      porcelanato: ensureApu('apu_piso_porcelanato_60x60', buildApuPorcelanato),
      ceramicaBase: ensureApu('apu_piso_ceramica_base', buildApuCeramicaPiso),
      pisoFlot: ensureApu('apu_piso_flotante_7mm', buildApuPisoFlotante),
      ceramMuro: ensureApu('apu_ceramica_muro_bano', buildApuCeramicaMuroBano),
      pintExt: ensureApu('apu_pintura_exterior_fibro', buildApuPinturaExteriorFibro),
      electricaGl: ensureApu('apu_electrica_completa_gl', buildApuElectricaCompleta),
      sanitariaGl: ensureApu('apu_sanitaria_completa_gl', buildApuSanitariaCompleta),
      termMen: ensureApu('apu_terminaciones_menores_ml', buildApuTerminacionesMenoresML),
      tramDom: ensureApu('apu_tramite_dom_permiso', buildApuTramiteDom),
      tramCalc: ensureApu('apu_tramite_calculo_estructural', buildApuTramiteCalculo),
      tramRecep: ensureApu('apu_tramite_recepcion_final', buildApuTramiteRecepcion),
      tramTE1: ensureApu('apu_tramite_te1_sec', buildApuTramiteTE1),
    } as const;
    // 3) Construir partidas según brief (códigos A.1 … A.13)
    const presetRows: any[] = [];
    // PARTIDA 1 — Movimiento de tierras y radier H-20 10 cm
    chapter.subChapters.push({ id: uid(), title: 'A.1 · Movimiento de tierras y radier H-20 10 cm' });
    presetRows.push(mkRow('Movimiento de tierras y radier H-20 10 cm', 'm2', 'A.1', [
      mkSub('Radier H-20 10 cm terminado', 'm2', 100, [apuIds.radier])
    ]));
    // PARTIDA 2 — Muros exteriores madera + OSB + aislación + fibrocemento pintado
    chapter.subChapters.push({ id: uid(), title: 'A.2 · Muros exteriores 2×4 @40 + OSB 11 mm + aislación + fibrocemento pintado' });
    presetRows.push(mkRow('Muros exteriores 2×4 @40 + OSB 11 mm + aislación + fibrocemento pintado', 'm2', 'A.2', [
      mkSub('Muro exterior completo', 'm2', 96, [apuIds.muroExt], 52400)
    ]));
    // PARTIDA 3 — Tabiques interiores 2×4 + volcanita simple
    chapter.subChapters.push({ id: uid(), title: 'A.3 · Tabiques interiores 2×4 + volcanita simple' });
    presetRows.push(mkRow('Tabiques interiores 2×4 + volcanita simple', 'm2', 'A.3', [
      mkSub('Tabique interior', 'm2', 168, [apuIds.tabique], 28630)
    ]));
    // PARTIDA 4 — Techumbre + OSB 11 + fieltro + teja asfáltica
    chapter.subChapters.push({ id: uid(), title: 'A.4 · Techumbre 25% + alero 40 cm + OSB 11 mm + fieltro + teja asfáltica' });
    presetRows.push(mkRow('Techumbre 25% + alero 40 cm + OSB 11 mm + fieltro + teja asfáltica', 'm2', 'A.4', [
      mkSub('Cubierta completa', 'm2', 120, [apuIds.techTeja])
    ]));
    // PARTIDA 5 — Cielos rasos + aislación EPS 100 mm
    chapter.subChapters.push({ id: uid(), title: 'A.5 · Cielos rasos + aislación EPS 100 mm' });
    presetRows.push(mkRow('Cielos rasos + aislación EPS 100 mm', 'm2', 'A.5', [
      mkSub('Cielo raso yeso-cartón + EPS 100 mm', 'm2', 100, [apuIds.cielo])
    ]));
    // PARTIDA 6 — Aberturas (detallado por tipo)
    chapter.subChapters.push({ id: uid(), title: 'A.6 · Aberturas' });
    presetRows.push(mkRow('Aberturas', 'u', 'A.6', [
      mkSub('Puerta exterior acero 90×200', 'u', 1, [apuIds.puertaExt]),
      mkSub('Puertas interiores MDF 70×200', 'u', 6, [apuIds.puertaInt]),
      mkSub('Ventanas termopanel 100×100', 'u', 8, [apuIds.ventana100x100]),
      mkSub('Ventanas termopanel 60×40', 'u', 2, [apuIds.ventana60x40]),
    ]));
    // PARTIDA 7 — Revestimientos de pisos y muros húmedos (usar total global para calzar resumen)
    chapter.subChapters.push({ id: uid(), title: 'A.7 · Revestimientos de pisos y muros húmedos' });
    presetRows.push(mkRow('Revestimientos de pisos y muros húmedos', 'm2', 'A.7', [
      mkSub('Porcelanato estar-comedor', 'm2', 36, [apuIds.porcelanato]),
      mkSub('Cerámica cocina', 'm2', 10, [apuIds.ceramicaBase]),
      mkSub('Cerámica pasillos', 'm2', 10, [apuIds.ceramicaBase]),
      mkSub('Cerámica piso baños', 'm2', 8, [apuIds.ceramicaBase]),
      mkSub('Piso flotante dormitorios', 'm2', 36, [apuIds.pisoFlot]),
      mkSub('Cerámica muros baños (hasta 2,10 m)', 'm2', 33.6, [apuIds.ceramMuro]),
    ]));
    // PARTIDA 8 — Pinturas (interior y exterior)
    chapter.subChapters.push({ id: uid(), title: 'A.8 · Pinturas' });
    presetRows.push(mkRow('Pinturas', 'm2', 'A.8', [
      mkSub('Interior (muros y cielos)', 'm2', 364, [apuIds.pinturaInt]),
      mkSub('Exterior (fibrocemento)', 'm2', 96, [apuIds.pintExt]),
    ]));
    // PARTIDA 9 — Instalación eléctrica completa
    chapter.subChapters.push({ id: uid(), title: 'A.9 · Instalación eléctrica completa' });
    presetRows.push(mkRow('Instalación eléctrica completa', 'u', 'A.9', [
      mkSub('Sistema completo (materiales + MO)', 'u', 1, [apuIds.electricaGl])
    ]));
    // PARTIDA 10 — Instalación sanitaria agua y desagüe + artefactos + calefón
    chapter.subChapters.push({ id: uid(), title: 'A.10 · Instalación sanitaria agua y desagüe + artefactos + calefón' });
    presetRows.push(mkRow('Instalación sanitaria agua y desagüe + artefactos + calefón', 'u', 'A.10', [
      mkSub('Sistema completo (materiales + MO)', 'u', 1, [apuIds.sanitariaGl])
    ]));
    // PARTIDA 11 — Canaletas y bajadas (se calza con 40 m de canaleta a $6.250/ml)
    chapter.subChapters.push({ id: uid(), title: 'A.11 · Canaletas y bajadas' });
    presetRows.push(mkRow('Canaletas y bajadas', 'ml', 'A.11', [
      mkSub('Canaleta PVC instalada', 'ml', 40, [apuIds.canaleta])
    ]));
    // PARTIDA 12 — Terminaciones menores
    chapter.subChapters.push({ id: uid(), title: 'A.12 · Terminaciones menores' });
    presetRows.push(mkRow('Terminaciones menores (guardapolvos, zócalos, cornisas)', 'ml', 'A.12', [
      mkSub('Suministro e instalación', 'ml', 150, [apuIds.termMen])
    ]));
    // PARTIDA 13 — Trámites y profesionales
    chapter.subChapters.push({ id: uid(), title: 'A.13 · Trámites y profesionales' });
    presetRows.push(mkRow('Trámites y profesionales', 'u', 'A.13', [
      mkSub('Permiso de edificación y derechos DOM', 'u', 1, [apuIds.tramDom]),
      mkSub('Cálculo estructural vivienda liviana', 'u', 1, [apuIds.tramCalc]),
      mkSub('Recepción final, certificados, copias planas', 'u', 1, [apuIds.tramRecep]),
      mkSub('SEC/TE1 eléctrica', 'u', 1, [apuIds.tramTE1]),
    ]));
    // 4) Persistir presupuesto
    const finalRows = replace ? presetRows : [...rows, ...presetRows];
    setRows(finalRows); saveBudget(finalRows);
    // 5) Notificación
    showNotification('Preset “Casa 10×10” cargado en Presupuesto','success');
  };

  // Preset: Piscina — crea un presupuesto con partidas específicas
  const loadPresetPiscina = (opts?:{ replace?: boolean })=>{
    const replace = opts?.replace !== false; // por defecto reemplaza
    // 1) Crear capítulo único "pisicna"
    const chId = uid();
    const chapter = { id: chId, letter: 'P', title: 'pisicna', subChapters: [] as { id:string; title:string }[] } as any;
    const chNext = replace ? [chapter] : [...chapters, chapter];
    setChapters(chNext); saveChapters(chNext); setCurrentChapterId(chId); saveCurrentChapter(chId);

    // 2) Asegurar APUs requeridos en biblioteca
    const ensureApu = (id:string, builder: ()=>any)=>{
      let lib = [...customApus];
      if(!lib.find(a=>a.id===id)){
        const created = builder();
        lib = [...lib, created];
        saveLibrary(lib);
      }
      return id;
    };
    const find = (k:string)=> (allApus.find(a=> a.id===k) || customApus.find(a=>a.id===k)) || null;
  const mkRow = (descr:string, unidad:string, codigo:string, subRows:any[])=> ({ id: uid(), chapterId: chId, codigo, descripcion: descr, unidadSalida: unidad, metrados: 0, apuId: null, apuIds: [], subRows } as any);
    const mkSub = (descr:string, unidad:string, qty:number, apuIds:string[] = [], overrideUnitPrice?:number, overrideTotal?:number)=> ({ id: uid(), descripcion: descr, unidadSalida: unidad, metrados: qty, apuIds, overrideUnitPrice, overrideTotal });

    const apuIds = {
      exc: ensureApu('apu_excavacion_retiro_m3', buildApuExcavacionRetiroM3),
      base10: ensureApu('apu_base_estabilizada_10cm_m2', buildApuBaseEstabilizada10cmM2),
      encof: ensureApu('apu_encofrado_doble_cara_m2', buildApuEncofradoDobleCaraM2),
      enfi: ensureApu('apu_enfierradura_kg', buildApuEnfierraduraKg),
      h25v: ensureApu('apu_h25_obra_vibrado_m3', buildApuH25ObraVibradoM3),
      curado: ensureApu('apu_curado_humedo_m2', buildApuCuradoHumedoM2),
      imper: ensureApu('apu_imper_cementicia_2capas_m2', buildApuImperCementicia2capasM2),
      pinturaPiscina: ensureApu('apu_pintura_piscina_2manos_m2', buildApuPinturaPiscina2manosM2),
      hidConjunto: ensureApu('apu_red_hid_conjunto_set', buildApuRedHidConjuntoSet),
    } as const;

    // 3) Construir partidas
    const presetRows: any[] = [];
    // Movimiento de tierras y hormigón
    chapter.subChapters.push({ id: uid(), title: 'P.1 · Obra piscina' });
    presetRows.push(mkRow('Excavación y retiro', 'm3', 'P.1', [ mkSub('Excavación y retiro', 'm3', 101.2, [apuIds.exc]) ]));
    presetRows.push(mkRow('Base estabilizada 10 cm', 'm2', 'P.2', [ mkSub('Base estabilizada 10 cm', 'm2', 35.36, [apuIds.base10]) ]));
    presetRows.push(mkRow('Encofrado muros/cantos doble cara', 'm2', 'P.3', [ mkSub('Encofrado doble cara', 'm2', 109.2, [apuIds.encof]) ]));
    presetRows.push(mkRow('Enfierradura colocada', 'kg', 'P.4', [ mkSub('Enfierradura', 'kg', 2271, [apuIds.enfi]) ]));
    presetRows.push(mkRow('Hormigón H-25 hecho en obra + vibrado', 'm3', 'P.5', [ mkSub('Hormigón H-25 + vibrado', 'm3', 17.472, [apuIds.h25v]) ]));
    presetRows.push(mkRow('Curado húmedo', 'm2', 'P.6', [ mkSub('Curado húmedo', 'm2', 82, [apuIds.curado]) ]));
    presetRows.push(mkRow('Impermeabilización cementicia 2 capas', 'm2', 'P.7', [ mkSub('Impermeabilización cementicia 2 capas', 'm2', 82, [apuIds.imper]) ]));
    presetRows.push(mkRow('Pintura para piscina 2 manos', 'm2', 'P.8', [ mkSub('Pintura para piscina 2 manos', 'm2', 82, [apuIds.pinturaPiscina]) ]));

    // Hidráulica (agrupada en una fila con subpartidas)
    chapter.subChapters.push({ id: uid(), title: 'P.9 · Hidráulica' });
    presetRows.push(mkRow('Hidráulica', 'set', 'P.9', [
      // Solo el APU conjunto; total sale de sus filas internas
      mkSub('Red hidráulica y equipos (conjunto)', 'set', 1, [apuIds.hidConjunto]),
    ]));

    // 4) Persistir presupuesto
    const finalRows = replace ? presetRows : [...rows, ...presetRows];
    setRows(finalRows); saveBudget(finalRows);
    showNotification('Preset “pisicna” cargado en Presupuesto','success');
  };
  // Calcula el total directo por partida (respeta overrides y subpartidas)
  const calcRowTotal = (r: any) => {
    if (Array.isArray(r.subRows) && r.subRows.length > 0) {
      return (r.subRows || []).reduce((acc: number, s: any) => {
        const sQty = Number(s.metrados || 0);
        const sPu = (s.apuIds || []).reduce((sum: number, id: string) => {
          try { return sum + unitCost(getApuById(id), resources).unit; } catch { return sum; }
        }, 0);
        const sEffPu = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : sPu;
        const sTot = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : (sEffPu * sQty);
        return acc + (Number.isFinite(sTot) ? sTot : 0);
      }, 0);
    }
    const qty = Number(r.metrados || 0);
    const ids: string[] = r.apuIds?.length ? r.apuIds : (r.apuId ? [r.apuId] : []);
    const pu = ids.reduce((acc: number, id: string) => { try { return acc + unitCost(getApuById(id), resources).unit; } catch { return acc; } }, 0);
    const effPu = (typeof r.overrideUnitPrice === 'number' && Number.isFinite(r.overrideUnitPrice)) ? r.overrideUnitPrice : pu;
    const total = (typeof r.overrideTotal === 'number' && Number.isFinite(r.overrideTotal)) ? r.overrideTotal : (effPu * qty);
    return Number.isFinite(total) ? total : 0;
  };

  // Suma directa del presupuesto (usa la misma lógica que la tabla)
  const sumDirecto = rows.reduce((acc, r) => acc + calcRowTotal(r), 0);
  const bGG = sumDirecto * gg; const bSub1 = sumDirecto + bGG; const bUtil = bSub1 * util; const bSubtotal = bSub1 + bUtil; const bIVA = bSubtotal * iva; const bTotal = bSubtotal + bIVA;

  // Modal de detalle APU (A–D)
  const [apuDetail, setApuDetail] = useState<{open:boolean; id:string|null}>({open:false, id:null});
  const openApuDetail = (id:string)=> setApuDetail({open:true, id});
  const closeApuDetail = ()=> setApuDetail({open:false, id:null});
  const handleSaveApuDetail = (id:string, secciones:any)=>{
    const mine = !!customApus.find(a=>a.id===id);
    if(mine){
      const next = customApus.map(x=> x.id===id? { ...x, secciones } : x);
      saveLibrary(next);
      showNotification('APU actualizado','success');
      // Mantener modal abierto y refrescar datos
      setApuDetail({ open:true, id });
    } else {
      showNotification('APU no encontrado','error');
    }
  };

  // Plantillas presupuesto eliminadas

  // Modal seleccionar APU para partida sin APU
  const [selectApuOpen, setSelectApuOpen] = useState<{open:boolean; rowId:string|null}>({open:false, rowId:null});
  const [pendingAssignRowId, setPendingAssignRowId] = useState<string|null>(null);
  const assignApuToRow = (apuId:string)=>{
    const rowId = selectApuOpen.rowId; if(!rowId) return;
    if(rowId === '__new__'){
      const newRow = { id: uid(), apuId, apuIds: [apuId], metrados: 1 } as any;
      const next = [...rows, newRow]; setRows(next); saveBudget(next); setSelectApuOpen({open:false, rowId:null}); showNotification('Partida agregada','success'); return;
    }
    let handled = false;
    const newRows = rows.map(r=> {
      if(r.id===rowId){
        const current: string[] = (r.apuIds && r.apuIds.length) ? r.apuIds : (r.apuId ? [r.apuId] : []);
        handled = true;
        if(current.includes(apuId)) return { ...r, apuIds: current };
        return { ...r, apuIds: [...current, apuId] };
      }
      if(Array.isArray(r.subRows)){
        const idx = r.subRows.findIndex((s:any)=> s.id===rowId);
        if(idx>=0){
          handled = true;
          const sub = r.subRows[idx];
          const current: string[] = (sub.apuIds && sub.apuIds.length) ? sub.apuIds : [];
          const nextIds = current.includes(apuId)? current : [...current, apuId];
          const newSubs = [...r.subRows]; newSubs[idx] = { ...sub, apuIds: nextIds };
          return { ...r, subRows: newSubs };
        }
      }
      return r;
    });
    if(!handled){ try{ console.warn('No se encontró fila o subfila para asignar APU'); }catch{} }
    setRows(newRows); saveBudget(newRows); setSelectApuOpen({open:false, rowId:null}); showNotification('APU asignado a la partida','success');
  };

  // Importador de partidas (pegado desde texto/CSV)
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importReplace, setImportReplace] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const norm = (s:string)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const findApuByKey = (key:string)=>{
    const k = norm(key);
    if(!k) return null as any;
    // id exacto
    const byId = allApus.find(a=> norm(a.id)===k);
    if(byId) return byId;
    // sin búsqueda por código externo; usar solo id/descripcion
    // match por descripción (mejor startsWith)
    const starts = allApus.find(a=> norm(a.descripcion).startsWith(k));
    if(starts) return starts;
    const contains = allApus.find(a=> norm(a.descripcion).includes(k));
    return contains || null;
  };
  const parseImport = (text:string)=>{
    const lines = (text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const sepSplit = (line:string)=>{
      // Soporta ; , o tabulador
      const parts = line.includes('\t')? line.split('\t') : line.includes(';')? line.split(';') : line.split(',');
      return parts.map(p=>p.trim());
    };
    // Estructura: Capítulo; Subcapítulo; Código; Partida; Unidad; Cantidad; APU
    type Item = { cap:string; sub:string; codigo:string; partida:string; unidad:string; cant:number; apus:string[] };
    const items: Item[] = [];
    for(const raw of lines){
      const cols = sepSplit(raw);
      if(cols.length < 6) { continue; }
      // Detectar encabezado
      const head = norm(cols[0]); if(head.startsWith('capitulo')||head.startsWith('capítulo')) continue;
      const cap = (cols[0]||'').trim();
      const sub = (cols[1]||'').trim();
      const codigo = (cols[2]||'').trim();
      const partida = (cols[3]||'').trim();
      const unidad = (cols[4]||'').trim();
      const cant = Number(String(cols[5]||'').replace(/\./g,'').replace(',','.'))||0;
      const apuCol = (cols[6]||'').trim();
      const apus = apuCol ? apuCol.split('|').map(s=>s.trim()).filter(Boolean) : [];
      items.push({ cap, sub, codigo, partida, unidad, cant, apus });
    }
    return items;
  };
  const handleProcessImport = ()=>{
    const items = parseImport(importText);
    if(!items.length){ setImportLog(['No se detectaron filas válidas.']); return; }
    // Asegurar capítulos
    let chList = [...chapters];
    const ensureChapter = (letter:string, title:string)=>{
      const let2 = (letter||'').trim() || '-';
      let ch = chList.find(c=> (c.letter||'-')===let2);
      if(!ch){
        ch = { id: uid(), letter: let2, title: (title||'CAPÍTULO') } as any;
        chList = [...chList, ch];
      }
      return ch.id;
    };
  type GroupKey = string;
  const groups = new Map<GroupKey, any[]>();
    items.forEach(it=>{
      const key = [it.cap||'-', it.codigo||'', it.partida||'', it.unidad||''].join('||');
      const arr = groups.get(key)||[]; arr.push(it); groups.set(key, arr);
    });
    const newRows: any[] = [];
    const missing: string[] = [];
    for(const [key, arr] of groups){
      const first = arr[0];
      const chapterId = ensureChapter(first.cap, 'CAPÍTULO '+(first.cap||''));
      const subRows = arr.map((it)=>{
        const apuIds: string[] = [];
        for(const apuKey of it.apus){
          const ap = findApuByKey(apuKey);
          if(ap) apuIds.push(ap.id); else missing.push(`APU no encontrado: "${apuKey}" en partida "${it.partida}"`);
        }
        return { id: uid(), descripcion: it.partida, unidadSalida: it.unidad, metrados: it.cant, apuIds, overrideUnitPrice: undefined, overrideTotal: undefined };
      });
      const row = { id: uid(), chapterId, codigo: first.codigo||'', descripcion: first.partida||'PARTIDA', unidadSalida: first.unidad||'', metrados: 0, apuId: null, apuIds: [], subRows } as any;
      newRows.push(row);
    }
    // Unir con presupuesto actual
    const merged = importReplace ? newRows : [...rows, ...newRows];
    setChapters(chList); saveChapters(chList);
    setRows(merged); saveBudget(merged);
    const logMsg = [`Importadas ${newRows.length} partidas (${items.length} filas).`, ...(missing.length? missing.slice(0,50): [])];
    setImportLog(logMsg);
    showNotification(`Importadas ${newRows.length} partidas`, missing.length? 'info' : 'success');
  };

  // Se removieron pruebas rápidas

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-600' : 
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{notification.message}</span>
            <button onClick={()=>setNotification({ show:false, message:'', type:'success' })} className="text-white hover:text-gray-200">×</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid gap-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Encabezado con efecto glitch + logo */}
          <div className="flex-1">
            <div className="flex items-center gap-5">
              <GlitchImage src={logoMark} alt="Logo Presupuestos" className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px] rounded-xl shadow-sm" speed={1} enableOnHover={false} />
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            {/* GlitchText acepta children como texto a reflejar en data-text */}
            <GlitchText speed={1} enableShadows enableOnHover={false} className="leading-none">
              PRESUPUESTO
            </GlitchText>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'presupuesto' && (
              <>
              <button onClick={()=>{
                // Export CSV (simple)
              const header = ['APU','Descripcion','Unidad','Cantidad','Unitario','Directo'];
                const body = rows.map(r=>{
                  const ids: string[] = (r.apuIds && r.apuIds.length) ? r.apuIds : (r.apuId ? [r.apuId] : []);
                  const uc = ids.reduce((sum:number, id:string)=>{
                    try{ return sum + unitCost(getApuById(id), resources).unit; }catch{ return sum; }
                  }, 0);
                  const dir = uc * (r.metrados||0);
                  const first = ids[0] ? getApuById(ids[0]) : null;
                  return [
                    (first?.id || (r.codigo||'')),
                    (r.descripcion || first?.descripcion || ''),
                    (r.unidadSalida || first?.unidadSalida || ''),
                    r.metrados||0,
                    uc,
                    dir
                  ];
                });
                const csv = [header, ...body].map(row=>row.join(';')).join('\n');
                const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const aEl = document.createElement('a'); aEl.href = url; aEl.download = 'presupuesto.csv'; aEl.click(); URL.revokeObjectURL(url);
              }} className="px-3 py-1 rounded-xl bg-green-700 hover:bg-green-600 text-xs">📊 Exportar CSV</button>
              <button onClick={()=>{ window.print(); }} className="px-3 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs inline-flex items-center gap-1"><PrinterIcon className="h-4 w-4"/> Imprimir</button>
              {/* Botón Importar partidas removido por solicitud */}
              <button onClick={()=>{
                const name = (projectInfo?.nombreProyecto || prompt('Nombre para guardar este presupuesto:','Presupuesto sin título') || 'Presupuesto sin título').toString();
                const snap = {
                  id: uid(),
                  name,
                  createdAt: Date.now(),
                  gg, util, iva,
                  projectInfo,
                  // Guardar contexto para poder recalcular valores más adelante
                  apuLibrary: [...allApus],
                  resourcesSnapshot: { ...resources },
                  // Guardar directo al momento del snapshot para mostrar aunque cambie la biblioteca
                  sumDirecto: sumDirecto,
                  chapters,
                  rows
                };
                const curr = ensureArrayProjects(projects);
                const list = [snap, ...curr];
                saveProjects(list);
                showNotification('Presupuesto guardado en Proyectos','success');
                setTab('proyecto');
              }} className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs">💾 Guardar</button>
              <button onClick={()=>{
                if(!confirm('¿Borrar TODO el presupuesto (capítulos y partidas)? Esta acción no se puede deshacer.')) return;
                try{ localStorage.removeItem('apu-budget'); }catch{}
                try{ localStorage.removeItem('apu-chapters'); }catch{}
                try{ localStorage.removeItem('apu-current-chapter'); }catch{}
                setRows([]);
                setChapters([]);
                setCurrentChapterId('');
                showNotification('Presupuesto borrado','info');
              }} className="px-3 py-1 rounded-xl bg-red-800 hover:bg-red-700 text-xs">🗑️ Borrar presupuesto</button>
              <button onClick={()=>{
                const mode = prompt('Cargar preset Casa 10×10. Escribe R para REEMPLAZAR el presupuesto o A para AGREGAR al final (R/A):','R')||'R';
                const replace = (mode.trim().toUpperCase()!=='A');
                loadPresetCasa1010({ replace });
              }} className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-xs">🏠 Cargar preset Casa 10×10</button>
              <button onClick={()=>{
                const mode = prompt('Cargar preset pisicna. Escribe R para REEMPLAZAR el presupuesto o A para AGREGAR al final (R/A):','R')||'R';
                const replace = (mode.trim().toUpperCase()!=='A');
                loadPresetPiscina({ replace });
              }} className="px-3 py-1 rounded-xl bg-teal-700 hover:bg-teal-600 text-xs">💧 Cargar preset pisicna</button>
              </>
            )}
            {/* Botón de pruebas y badge de demo removidos */}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit">
          <button onClick={()=>setTab('proyecto')} className={`px-3 py-1 rounded-xl ${tab==='proyecto'?'bg-slate-900':'hover:bg-slate-700'}`}>Proyecto</button>
          <button onClick={()=>setTab('biblioteca')} className={`px-3 py-1 rounded-xl ${tab==='biblioteca'?'bg-slate-900':'hover:bg-slate-700'}`}>Biblioteca de APU</button>
          <button onClick={()=>setTab('presupuesto')} className={`px-3 py-1 rounded-xl ${tab==='presupuesto'?'bg-slate-900':'hover:bg-slate-700'}`}>Presupuesto</button>
        </div>

        {/* Sección Proyecto se declara más abajo (bloque corregido) */}

  {tab==='proyecto' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold">Proyectos guardados</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={()=>setShowProjectModal(true)} className="px-3 py-1.5 rounded-xl text-sm bg-slate-800 hover:bg-slate-700">Editar info proyecto</button>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-4 shadow">
              {projects.length===0 ? (
                <div className="text-slate-400 text-sm">No hay proyectos guardados aún. Ve a Presupuesto y usa “Guardar”.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-300">
                      <th className="py-2 px-3">Nombre</th>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Capítulos</th>
                      <th className="py-2 px-3">Partidas</th>
                      <th className="py-2 px-3 text-right">Directo</th>
                      <th className="py-2 px-3 text-right">Total c/ IVA</th>
                      <th className="py-2 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ensureArrayProjects(projects).map((p:any)=>{
                      const parts = (p.rows||[]).length;
                      const chs = (p.chapters||[]).length;
                      const direct = (()=>{
                        const list = p.rows||[];
                        // Usar librería y recursos del snapshot si existen; si no, usar actuales
                        const lib: any[] = Array.isArray(p.apuLibrary) ? p.apuLibrary : allApus;
                        const resSnap: Record<string, any> = (p.resourcesSnapshot && typeof p.resourcesSnapshot==='object') ? p.resourcesSnapshot : resources;
                        const getById = (id:string)=> (lib.find(a=>a.id===id) || getApuById(id));
                        const calc = (r:any)=>{
                          const qty = Number(r.metrados||0);
                          const pu = (Array.isArray(r.subRows) && r.subRows.length>0)
                            ? (r.subRows||[]).reduce((acc:number, s:any)=>{
                                const sQty = Number(s.metrados || 0);
                                const sIds: string[] = (Array.isArray(s.apuIds) && s.apuIds.length>0) ? s.apuIds : (s.apuId ? [s.apuId] : []);
                                const sPu = sIds.reduce((sum:number, id:string)=>{
                                  try{ return sum + unitCost(getById(id), resSnap).unit; }catch{ return sum; }
                                }, 0);
                                const sEffPu = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : sPu;
                                const sTot = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : (sEffPu * sQty);
                                return acc + sTot;
                              }, 0)
                            : ((r.apuIds||[]).reduce((sum:number, id:string)=>{
                                try{ return sum + unitCost(getById(id), resSnap).unit; }catch{ return sum; }
                              }, 0));
                          const effPu = (typeof r.overrideUnitPrice === 'number' && Number.isFinite(r.overrideUnitPrice)) ? r.overrideUnitPrice : pu;
                          const total = (typeof r.overrideTotal === 'number' && Number.isFinite(r.overrideTotal)) ? r.overrideTotal : (effPu * qty);
                          return total;
                        };
                        const computed = list.reduce((acc:number, r:any)=> acc + calc(r), 0);
                        const snapFallback = Number.isFinite(Number(p.sumDirecto)) ? Number(p.sumDirecto) : 0;
                        return computed>0 ? computed : snapFallback;
                      })();
                      // Tasas para cálculo y display (fallback a actuales si faltan en snapshot)
                      const _g = Number.isFinite(Number(p.gg)) ? Number(p.gg) : gg;
                      const _u = Number.isFinite(Number(p.util)) ? Number(p.util) : util;
                      const _iv = Number.isFinite(Number(p.iva)) ? Number(p.iva) : iva;
                      const totalConIva = (()=>{
                        const g = Number(_g||0); const u = Number(_u||0); const iv = Number(_iv||0);
                        const bGGp = direct * g; const bSub1p = direct + bGGp; const bUtilp = bSub1p * u; const bSubtotalp = bSub1p + bUtilp; const bIVAp = bSubtotalp * iv; return bSubtotalp + bIVAp;
                      })();
                      const gPct = `${((_g||0)*100).toFixed(1)}%`;
                      const uPct = `${((_u||0)*100).toFixed(1)}%`;
                      const iPct = `${((_iv||0)*100).toFixed(1)}%`;

                      return (
                        <tr key={p.id} className="border-t border-slate-700">
                          <td className="py-2 px-3">{p.name}</td>
                          <td className="py-2 px-3">{new Date(p.createdAt||Date.now()).toLocaleString()}</td>
                          <td className="py-2 px-3">{chs}</td>
                          <td className="py-2 px-3">{parts}</td>
                          <td className="py-2 px-3 text-right">{fmt(direct)}</td>
                          <td className="py-2 px-3 text-right">
                            <div>{fmt(totalConIva)}</div>
                            <div className="text-[10px] text-slate-400">GG {gPct} · Util {uPct} · IVA {iPct}</div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="inline-flex gap-2">
                              <button title="Cargar" onClick={()=>{
                                // Cargar este snapshot en el presupuesto (reemplazar)
                                const chNext = p.chapters||[];
                                const rowsNext = p.rows||[];
                                setChapters(chNext); saveChapters(chNext);
                                setRows(rowsNext); saveBudget(rowsNext);
                                setCurrentChapterId(chNext[chNext.length-1]?.id || ''); saveCurrentChapter(chNext[chNext.length-1]?.id || '');
                                showNotification('Proyecto cargado en Presupuesto','success');
                                setTab('presupuesto');
                              }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs" aria-label="Cargar"><EyeIcon className="h-4 w-4"/></button>
                              <button title="Imprimir" onClick={()=>{
                                // Cargar y mandar a imprimir
                                const chNext = p.chapters||[];
                                const rowsNext = p.rows||[];
                                setChapters(chNext); saveChapters(chNext);
                                setRows(rowsNext); saveBudget(rowsNext);
                                setCurrentChapterId(chNext[chNext.length-1]?.id || ''); saveCurrentChapter(chNext[chNext.length-1]?.id || '');
                                setTab('presupuesto');
                                setTimeout(()=> window.print(), 250);
                              }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs" aria-label="Imprimir"><PrinterIcon className="h-4 w-4"/></button>
                              <button title="Eliminar" onClick={()=>{
                                if(!confirm('¿Eliminar este proyecto guardado?')) return;
                                const list = (projects||[]).filter(x=> x.id!==p.id);
                                saveProjects(list);
                                showNotification('Proyecto eliminado','info');
                              }} className="p-2 rounded-lg bg-red-800 hover:bg-red-700 text-xs" aria-label="Eliminar"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal de proyecto */}
            <ProjectModal open={showProjectModal} initial={projectInfo} onClose={()=>setShowProjectModal(false)} onSave={handleSaveProjectInfo} />
          </>
        )}

  {tab==='biblioteca' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold">Biblioteca de APUs</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Buscar:</span>
                  <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Categoría:</span>
                  {(() => {
                    const apus = libScope==='mine'? customApus : allApus;
                    const cats = Array.from(new Set((apus||[]).map((a:any)=> (a.categoria||'').trim()).filter(Boolean))).sort();
                    return (
                      <select className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm" value={libCategory} onChange={e=>setLibCategory(e.target.value)}>
                        <option value="all">Todas</option>
                        {cats.map(c=> <option key={c} value={c}>{c}</option>)}
                      </select>
                    );
                  })()}
                </div>
                <button onClick={()=>setShowCreateApu(true)} className="ml-auto px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-sm">+ Crear nuevo APU</button>
              </div>
            </div>

            <div className="mt-3 bg-slate-800 rounded-2xl p-0 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="py-2 px-3 w-16">N°</th>
                    
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 w-32">Categoría</th>
                    <th className="py-2 px-3 w-24">Unidad</th>
                    <th className="py-2 px-3 w-28">P. Unitario</th>
                    <th className="py-2 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  
                  {(libScope==='mine'? customApus : allApus)
                    .filter(a => !libSearch || (a.descripcion||'').toLowerCase().includes(libSearch.toLowerCase()))
                    .filter(a => libCategory==='all' || (String(a.categoria||'').trim()===libCategory))
                    .map((a, i)=> (
                      <React.Fragment key={a.id}>
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-3">{i+1}</td>
                          
                          <td className="py-2 px-3">
                            <button onClick={()=>toggleExpandRow(a.id)} className="text-left hover:underline">
                              {a.descripcion}
                            </button>
                          </td>
                          <td className="py-2 px-3">{a.categoria||''}</td>
                          <td className="py-2 px-3">{a.unidadSalida}</td>
                          <td className="py-2 px-3 text-right">{fmt(unitCost(a, resources).unit)}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={()=>toggleExpandRow(a.id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Ver/Editar APU" aria-label="Ver/Editar APU">
                                <PencilSquareIcon className="h-4 w-4"/>
                              </button>
                              {isMineById(a.id) && (
                                <button onClick={()=>handleDeleteApu(a.id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar APU" aria-label="Eliminar APU"><TrashIcon className="h-4 w-4"/></button>
                              )}

                              {/* Modal Importación */}
                              {importOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                                  <div className="w-[min(920px,95vw)] max-h-[90vh] overflow-auto bg-slate-800 rounded-2xl border border-slate-700 p-4 grid gap-3">
                                    <div className="text-lg font-semibold">Importar partidas al presupuesto</div>
                                    <div className="text-sm text-slate-300">Formato por línea: Capítulo; Subcapítulo; Código; Descripción Partida; Unidad; Cantidad; APU (id o nombre). Acepta separador ; , o tab. Para múltiples APUs por línea, separa con |</div>
                                    <textarea className="min-h-[220px] bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono text-xs" value={importText} onChange={e=>setImportText(e.target.value)} placeholder={'A; Movimiento de Tierras; 01-001; Excavación de zanjas; m3; 12; apu_exc_zanja_manual\nA; Movimiento de Tierras; 01-002; Relleno y compactación; m3; 8; Relleno y compactación manual'} />
                                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={importReplace} onChange={e=>setImportReplace(e.target.checked)} />Reemplazar presupuesto actual</label>
                                    {!!importLog.length && (
                                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300">
                                        {importLog.map((l,i)=>(<div key={i}>• {l}</div>))}
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                      <button onClick={()=>setImportOpen(false)} className="px-3 py-2 rounded-xl border border-slate-600">Cerrar</button>
                                      <button onClick={handleProcessImport} className="px-3 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Procesar</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === a.id && expandedForm && (
                          <tr className="border-t border-slate-800 bg-slate-900/60">
                            <td colSpan={6} className="p-3">
                              <div className="grid gap-3">
                                <div className="grid md:grid-cols-3 gap-2">
                                  <label className="text-sm text-slate-300 grid gap-1">
                                    <span>Descripción</span>
                                    <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={expandedForm.descripcion} onChange={e=>setExpandedForm((f:any)=>({...f, descripcion:e.target.value}))} />
                                  </label>
                                  <label className="text-sm text-slate-300 grid gap-1">
                                    <span>Unidad</span>
                                    <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={expandedForm.unidadSalida} onChange={e=>setExpandedForm((f:any)=>({...f, unidadSalida:e.target.value}))} />
                                  </label>
                                  <label className="text-sm text-slate-300 grid gap-1">
                                    <span>Categoría</span>
                                    <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={expandedForm.categoria||''} onChange={e=>setExpandedForm((f:any)=>({...f, categoria:e.target.value}))} />
                                  </label>
                                  
                                </div>
                                <div className="flex items-center justify-end">
                                  <div className="flex items-center gap-2">
                                    {isMineById(expandedId||'') && (
                                    <button onClick={()=>{
                                      if(!confirm('¿Borrar TODAS las secciones y dejar solo una vacía?')) return;
                                      const name = (prompt('Nombre de la única sección que quedará:', 'SECCIÓN')||'').trim() || 'SECCIÓN';
                                      setExpandedForm((f:any)=> ({
                                        ...f,
                                        secciones: {
                                          materiales: [],
                                          equipos: [],
                                          manoObra: [],
                                          varios: [],
                                          extras: [ { title: name, rows: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }] } ],
                                          __titles: {},
                                        }
                                      }));
                                    }} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Borrar todas las secciones" aria-label="Borrar todas las secciones"><TrashIcon className="h-4 w-4"/></button>
                                    )}
                                    {isMineById(expandedId||'') && (
                                      <button onClick={addFormExtraSection} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">+ Agregar sección</button>
                                    )}
                                  </div>
                                </div>
                                <div className="grid gap-4">
                                  {([
                                    {key:'materiales', title:'A.- MATERIALES'},
                                    {key:'equipos', title:'B.- EQUIPOS, MAQUINARIAS Y TRANSPORTES'},
                                    {key:'manoObra', title:'C.- MANO DE OBRA'},
                                    {key:'varios', title:'D.- VARIOS'},
                                  ] as any[]).map(sec => {
                                    const rows = (expandedForm.secciones?.[sec.key]||[]);
                                    if(!rows.length) return null;
                                    const subt = rows.reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
                                    const curTitle = (expandedForm.secciones?.__titles?.[sec.key]) || sec.title;
                                    return (
                                      <div key={sec.key} className="bg-slate-900 rounded-xl border border-slate-700">
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                                          <div className="font-medium text-slate-200 text-sm">{curTitle}</div>
                                          <div className="flex items-center gap-2">
                                            {isMineById(expandedId||'') && (
                                            <button onClick={()=>{
                                              const name = (prompt('Nuevo nombre de la sección:', curTitle)||'').trim();
                                              if(!name) return;
                                              setExpandedForm((f:any)=>{
                                                const titles = { ...((f.secciones||{}).__titles||{}) };
                                                titles[sec.key] = name;
                                                return { ...f, secciones: { ...(f.secciones||{}), __titles: titles } };
                                              });
                                            }} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">Renombrar</button>
                                            )}
                                            {isMineById(expandedId||'') && (
                                            <button onClick={()=>{
                                              setExpandedForm((f:any)=> ({ ...f, secciones: { ...(f.secciones||{}), [sec.key]: [] } }));
                                            }} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar sección" aria-label="Eliminar sección"><TrashIcon className="h-4 w-4"/></button>
                                            )}
                                            {isMineById(expandedId||'') && (
                                              <button onClick={()=>addFormSecRow(sec.key)} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">+ Fila</button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full text-xs">
                                            <thead>
                                              <tr className="text-left text-slate-300">
                                                <th className="py-2 px-3">Descripción</th>
                                                <th className="py-2 px-3 w-24">Unidad</th>
                                                <th className="py-2 px-3 w-24">Cantidad</th>
                                                <th className="py-2 px-3 w-28">P. Unitario</th>
                                                <th className="py-2 px-3 w-28">Total</th>
                                                <th className="py-2 px-3 w-12"></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(rows.length ? rows : [{descripcion:'',unidad:'',cantidad:0,pu:0}]).map((r:any, i:number)=>{
                                                const total = (Number(r.cantidad)||0) * (Number(r.pu)||0);
                                                return (
                                                  <tr key={i} className="border-t border-slate-800">
                                                    <td className="py-2 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1" value={r.descripcion} onChange={e=>updateFormSecRow(sec.key, i, {descripcion:e.target.value})} /></td>
                                                    <td className="py-2 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1" value={r.unidad} onChange={e=>updateFormSecRow(sec.key, i, {unidad:e.target.value})} /></td>
                                                    <td className="py-2 px-3"><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right" value={r.cantidad} onChange={e=>updateFormSecRow(sec.key, i, {cantidad: Number(e.target.value)||0})} /></td>
                                                    <td className="py-2 px-3">
                                                      <CurrencyInput
                                                        value={Number.isFinite(Number(r.pu)) ? Number(r.pu) : undefined}
                                                        onChange={(val)=>updateFormSecRow(sec.key, i, { pu: Number(val||0) })}
                                                      />
                                                    </td>
                                                    <td className="py-2 px-3 text-right">{fmt(total)}</td>
                                                    <td className="py-2 px-3 text-right"><button onClick={()=>delFormSecRow(sec.key, i)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar fila" aria-label="Eliminar fila"><TrashIcon className="h-4 w-4"/></button></td>
                                                  </tr>
                                                );
                                              })}
                                              <tr className="border-t border-slate-800">
                                                <td colSpan={4} className="py-2 px-3 text-right font-medium">TOTAL</td>
                                                <td className="py-2 px-3 text-right font-semibold">{fmt(subt)}</td>
                                                <td className="py-2 px-3"></td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* Extras */}
                                  {(expandedForm.secciones?.extras||[]).map((sec:any, secIdx:number)=>{
                                    const rows = Array.isArray(sec.rows) && sec.rows.length? sec.rows : [{descripcion:'',unidad:'',cantidad:0,pu:0}];
                                    const subt = rows.reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
                                    return (
                                      <div key={`extra2_${secIdx}`} className="bg-slate-900 rounded-xl border border-slate-700">
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                                          <div className="font-medium text-slate-200 text-sm">{sec.title || 'SECCIÓN'}</div>
                                          <div className="flex items-center gap-2">
                                            <button onClick={()=>{
                                              const name = (prompt('Nuevo nombre de la sección:', sec.title || 'SECCIÓN')||'').trim();
                                              if(!name) return;
                                              setExpandedForm((f:any)=>{
                                                const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
                                                if(!extras[secIdx]) return f;
                                                extras[secIdx] = { ...extras[secIdx], title: name };
                                                return { ...f, secciones: { ...f.secciones, extras } };
                                              });
                                            }} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">Renombrar</button>
                                            <button onClick={()=>{
                                              if(!confirm('¿Eliminar esta sección completa?')) return;
                                              setExpandedForm((f:any)=>{
                                                const extras = Array.isArray(f.secciones?.extras)? [...f.secciones.extras] : [];
                                                extras.splice(secIdx,1);
                                                return { ...f, secciones: { ...f.secciones, extras } };
                                              });
                                            }} className="px-2 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-xs">Eliminar</button>
                                            <button onClick={()=>addFormExtraRow(secIdx)} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">+ Fila</button>
                                          </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full text-xs">
                                            <thead>
                                              <tr className="text-left text-slate-300">
                                                <th className="py-2 px-3">Descripción</th>
                                                <th className="py-2 px-3 w-24">Unidad</th>
                                                <th className="py-2 px-3 w-24">Cantidad</th>
                                                <th className="py-2 px-3 w-28">P. Unitario</th>
                                                <th className="py-2 px-3 w-28">Total</th>
                                                <th className="py-2 px-3 w-12"></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {rows.map((r:any, i:number)=>{
                                                const total = (Number(r.cantidad)||0) * (Number(r.pu)||0);
                                                return (
                                                  <tr key={i} className="border-t border-slate-800">
                                                    <td className="py-2 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1" value={r.descripcion||''} onChange={e=>updateFormExtraRow(secIdx, i, {descripcion:e.target.value})} /></td>
                                                    <td className="py-2 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1" value={r.unidad||''} onChange={e=>updateFormExtraRow(secIdx, i, {unidad:e.target.value})} /></td>
                                                    <td className="py-2 px-3"><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right" value={Number(r.cantidad||0)} onChange={e=>updateFormExtraRow(secIdx, i, {cantidad: Number(e.target.value)||0})} /></td>
                                                    <td className="py-2 px-3">
                                                      <CurrencyInput
                                                        value={Number.isFinite(Number(r.pu)) ? Number(r.pu) : undefined}
                                                        onChange={(val)=>updateFormExtraRow(secIdx, i, { pu: Number(val||0) })}
                                                      />
                                                    </td>
                                                    <td className="py-2 px-3 text-right">{fmt(total)}</td>
                                                    <td className="py-2 px-3 text-right"><button onClick={()=>delFormExtraRow(secIdx, i)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar fila" aria-label="Eliminar fila"><TrashIcon className="h-4 w-4"/></button></td>
                                                  </tr>
                                                );
                                              })}
                                              <tr className="border-t border-slate-800">
                                                <td colSpan={4} className="py-2 px-3 text-right font-medium">TOTAL</td>
                                                <td className="py-2 px-3 text-right font-semibold">{fmt(subt)}</td>
                                                <td className="py-2 px-3"></td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {(() => {
                                  const obs = String((expandedForm.secciones?.__meta?.obs)||'');
                                  return (
                                    <div className="grid gap-3 items-end">
                                      <label className="text-sm text-slate-300 grid gap-1">
                                        <span>Observaciones</span>
                                        <textarea rows={2} value={obs} onChange={e=> updateFormMeta({ obs: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-xl p-2" placeholder="Notas/observaciones del APU" />
                                      </label>
                                    </div>
                                  );
                                })()}
                                <div className="flex justify-end gap-2">
                                  <button onClick={()=>{ setExpandedId(null); setExpandedForm(null); }} className="px-3 py-2 rounded-xl border border-slate-600">Cerrar</button>
                                  <button onClick={saveExpanded} className="px-3 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Guardar</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>

            <CreateApuModal open={showCreateApu} onClose={()=>setShowCreateApu(false)} onSave={handleCreateApu} />
            <CreateApuModal open={showEditApu} onClose={()=>{setShowEditApu(false); setApuEditing(null);} } onSave={handleSaveEditApu} initial={apuEditing} />
          </>
        )}

        {tab==='presupuesto' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold">Partidas</h2>
              <div className="flex flex-wrap gap-2">
                {/* Se eliminó la UI de Plantillas */}
                <div className="flex items-center gap-2">
                  <select
                    className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                    value={currentChapterId}
                    onChange={(e)=>{ setCurrentChapterId(e.target.value); saveCurrentChapter(e.target.value); }}
                  >
                    <option value="">Capítulos…</option>
                    {chapters.map(c=> <option key={c.id} value={c.id}>{c.letter} — {c.title}</option>)}
                  </select>
                    <button onClick={addChapter} className="px-3 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 text-sm">+ Capítulo</button>
                    {currentChapterId && (
                      <>
                        <button onClick={()=>renameChapter(currentChapterId)} className="px-3 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 text-sm">Renombrar</button>
                        <button onClick={()=>deleteChapter(currentChapterId)} className="px-3 py-2 bg-red-700 rounded-xl hover:bg-red-600 text-sm">Eliminar</button>
                      </>
                    )}
                  <button onClick={addRow} className="px-3 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">+ Partida</button>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-4 shadow">
              {/* Vista móvil - Cards por capítulo (se mantiene) */}
              <div className="block lg:hidden space-y-6">
                {chapters.map(ch=>{
                  const chRows = rows.filter(r=> r.chapterId===ch.id);
                  return (
                    <div key={ch.id} className="space-y-3">
                      {chRows.map((r, idx)=>{
                  const ids: string[] = (r.apuIds && r.apuIds.length) ? r.apuIds : (r.apuId ? [r.apuId] : []);
                  const hasApu = ids.length>0;
                  return (
                    <div key={r.id} className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">{idx+1}</div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="grid gap-2 w-full">
                          <label className="text-xs text-slate-400">Nombre de la partida</label>
                          <button
                            className={`w-full text-left rounded-lg p-2 text-sm border bg-slate-800 border-slate-600 hover:bg-slate-700/40 cursor-pointer`}
                            onClick={()=>{ setSelectApuOpen({open:true, rowId:r.id}); }}
                          >
                            {(r.descripcion && r.descripcion.trim()) || 'Sin nombre'}
                            {/* hint removido */}
                          </button>
                          {hasApu && (
                            <div className="mt-2 overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-slate-300">
                                    <th className="px-2 py-1 text-left w-8">#</th>
                                    <th className="px-2 py-1 text-left">PARTIDA</th>
                                    <th className="px-2 py-1 text-center w-12">UN</th>
                                    <th className="px-2 py-1 text-center w-16">CANT.</th>
                                    <th className="px-2 py-1 text-right w-24">P. UNIT.</th>
                                    <th className="px-2 py-1 text-right w-24">TOTAL</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ids.map((id, i)=>{
                                    try{
                                      const apu = getApuById(id);
                                      const un = apu.unidadSalida || 'GL';
                                      const qty = r.metrados||0;
                                      const pu = unitCost(apu, resources).unit;
                                      const tot = pu * qty;
                                      return (
                                        <tr key={id} className="border-t border-slate-700">
                                          <td className="px-2 py-1">{i+1}</td>
                                          <td className="px-2 py-1">
                                            <button
                                              onClick={()=> openApuDetail(id)}
                                              className="text-slate-200 hover:underline text-left"
                                              title={apu.descripcion}
                                            >
                                              {apu.descripcion}
                                            </button>
                                          </td>
                                          <td className="px-2 py-1 text-center">{un}</td>
                                          <td className="px-2 py-1 text-center">{qty.toFixed(1)}</td>
                                          <td className="px-2 py-1 text-right">{fmt(pu)}</td>
                                          <td className="px-2 py-1 text-right">{fmt(tot)}</td>
                                        </tr>
                                      );
                                    }catch{return null;}
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={()=>{ if(!confirm('¿Eliminar esta partida completa?')) return; delRow(r.id); }}
                          className="ml-3 p-1 h-8 w-8 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700/40"
                          title="Eliminar partida"
                          aria-label="Eliminar partida"
                        >
                          <TrashIcon className="h-5 w-5"/>
                        </button>
                      </div>
                      {/* Se removieron Unidad, Cantidad, Unitario y Total en móvil */}
                    </div>
                   );
                 })}
                    </div>
                  );
                })}
              </div>

              {/* Vista desktop - Tabla por capítulo (nuevo componente presentacional) */}
              <div className="hidden lg:block">
                <BudgetTable
                  chapters={chapters}
                  rows={rows}
                  getApuById={getApuById}
                  unitCost={unitCost}
                  resources={resources}
                  fmt={fmt}
                  onPickApu={(rowId)=> setSelectApuOpen({open:true, rowId})}
                  onAddSubRow={(rowId)=>{
                    // Agregar subpartida al hacer click en la partida (pidiendo nombre)
                    const name = (prompt('Nombre de la subpartida:') || '').trim();
                    if(!name) return;
                    const sub = { id: uid(), descripcion: name, apuIds: [] as string[], metrados: 1, unidadSalida: '', overrideUnitPrice: undefined as number|undefined, overrideTotal: undefined as number|undefined };
                    const next = rows.map(r=> r.id===rowId? { ...r, subRows: [ ...(r.subRows||[]), sub ] } : r);
                    setRows(next); saveBudget(next); showNotification('Subpartida agregada','success');
                  }}
                  onUpdateSubRow={(parentId, subId, patch)=>{
                    const next = rows.map(r=>{
                      if(r.id!==parentId) return r;
                      const subs = (r.subRows||[]).map((s:any)=> s.id===subId? { ...s, ...patch } : s);
                      return { ...r, subRows: subs };
                    });
                    setRows(next); saveBudget(next);
                  }}
                  onRemoveSubRow={(parentId, subId)=>{
                    const next = rows.map(r=> r.id===parentId? { ...r, subRows: (r.subRows||[]).filter((s:any)=> s.id!==subId) } : r);
                    setRows(next); saveBudget(next); showNotification('Subpartida eliminada','info');
                  }}
                  onMoveChapter={moveRowToChapter}
                  onDelete={delRow}
                  onUpdateRow={updRow}
                  onDuplicate={duplicateRow}
                  onShowApuDetail={(id)=> openApuDetail(id)}
                  onAddSubChapter={addSubChapter}
                  onRenameSubChapter={renameSubChapter}
                  onDeleteSubChapter={deleteSubChapter}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-2xl p-4 shadow grid grid-cols-2 gap-3 md:col-span-2">
                <div>
                  <label className="text-sm text-slate-300">Gastos generales (%)</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={Number.isFinite(gg) ? Math.round(gg * 1000) / 10 : 0}
                      onChange={e=>{
                        const v = parseFloat(e.target.value);
                        const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                        setGG(pct / 100);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Utilidad (%)</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={Number.isFinite(util) ? Math.round(util * 1000) / 10 : 0}
                      onChange={e=>{
                        const v = parseFloat(e.target.value);
                        const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                        setUtil(pct / 100);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">IVA (%)</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={Number.isFinite(iva) ? Math.round(iva * 1000) / 10 : 0}
                      onChange={e=>{
                        const v = parseFloat(e.target.value);
                        const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                        setIva(pct / 100);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-2">
                <div className="flex items-center justify-between"><span className="text-slate-300">Directo</span><b>{fmt(sumDirecto)}</b></div>
                <div className="flex items-center justify-between"><span className="text-slate-300">Gastos generales ({(gg*100).toFixed(1)}%)</span><b>{fmt(bGG)}</b></div>
                <div className="flex items-center justify-between"><span className="text-slate-300">Sub-Total</span><b>{fmt(bSub1)}</b></div>
                <div className="flex items-center justify-between"><span className="text-slate-300">Utilidad ({(util*100).toFixed(1)}%)</span><b>{fmt(bUtil)}</b></div>
                <div className="flex items-center justify-between"><span className="text-slate-300">IVA ({(iva*100).toFixed(1)}%)</span><b>{fmt(bIVA)}</b></div>
                <div className="mt-2 p-3 rounded-xl bg-slate-900 flex items-center justify-between">
                  <span>Total</span><span className="text-xl font-extrabold">{fmt(bTotal)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Se eliminó la sección de Ajuste de Precios de Recursos */}

        <footer className="text-xs text-slate-500 text-center pt-6">
          MVP de vista y cálculo. Próximos pasos: catálogo persistente, listas de precios, UF, plantillas de capítulos y exportación PDF/XLSX.
        </footer>
      {/* Selector de APU para partidas sin APU */}
      <SelectApuModal
        open={selectApuOpen.open}
        onClose={()=>setSelectApuOpen({open:false, rowId:null})}
        onPick={(id:string)=>{ assignApuToRow(id); }}
        apus={customApus}
        onCreateNew={()=>{
          const rowId = selectApuOpen.rowId; if(!rowId) return;
          setPendingAssignRowId(rowId);
          setSelectApuOpen({open:false, rowId:null});
          setTab('biblioteca');
          setShowCreateApu(true);
        }}
      />
      {/* Modal detalle APU A–D */}
      <ApuDetailModal
        open={apuDetail.open}
        onClose={closeApuDetail}
        apu={apuDetail.id ? getApuById(apuDetail.id) : null}
        fmt={fmt}
        resources={resources}
        onSave={(secciones:any)=>{ if(apuDetail.id) handleSaveApuDetail(apuDetail.id, secciones); }}
      />
    </div>
  </div>
  );
}

function SelectApuModal({open, onClose, onPick, apus, onCreateNew}:{open:boolean; onClose:()=>void; onPick:(id:string)=>void; apus:any[]; onCreateNew?: ()=>void}){
  const [term, setTerm] = React.useState('');
  if(!open) return null;
  const list = (apus||[]).filter(a=> !term || (a.descripcion||'').toLowerCase().includes(term.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Seleccionar APU</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
        </div>
        <div className="p-4 grid gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Buscar:</span>
            <input value={term} onChange={e=>setTerm(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm w-full" placeholder="Descripción del APU" />
          </div>
          {list.length === 0 ? (
            <div className="text-sm text-slate-300">
              No hay APUs creados para seleccionar. Puedes crear uno nuevo.
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 w-28">Cat.</th>
                    <th className="py-2 px-3 w-24">Unidad</th>
                    <th className="py-2 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a:any)=> (
                    <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                          
                          <td className="py-2 px-3">{a.descripcion}</td>
                      <td className="py-2 px-3">{a.categoria||''}</td>
                      <td className="py-2 px-3">{a.unidadSalida}</td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={()=>onPick(a.id)} className="px-2 py-1 rounded bg-green-700 hover:bg-green-600 text-xs">Seleccionar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {onCreateNew && (
              <button onClick={onCreateNew} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm">+ Crear nuevo APU</button>
            )}
            <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-600 text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApuDetailModal({open, onClose, apu, fmt, resources, onSave}:{open:boolean; onClose:()=>void; apu:any; fmt:(n:number)=>string; resources:Record<string,any>; onSave:(secciones:any)=>void}){
  if(!open || !apu) return null;
  // Construir secciones si no existen, derivando desde items
  const buildFromItems = () => {
    const secs: any = { materiales: [], equipos: [], manoObra: [], varios: [] };
    (apu.items || []).forEach((it: any) => {
      const r = resources[it.resourceId]; if (!r) return;
      const isCoef = it.tipo === 'coef';
      const cantidad = isCoef ? (Number(it.coef||0) * (1 + Number(it.merma||0))) : (1 / Math.max(1, Number(it.rendimiento||1)));
      const pu = Number(r.precio||0);
      const total = cantidad * pu;
      const row = { descripcion: r.nombre, unidad: r.unidad, cantidad, pu, total };
      switch(r.tipo){
        case 'material': secs.materiales.push(row); break;
        case 'equipo': secs.equipos.push(row); break;
        case 'mano_obra': secs.manoObra.push(row); break;
        default: secs.varios.push(row); break;
      }
    });
    return secs;
  };
  const secciones = (apu as any).secciones || buildFromItems();
  const metaInit = (secciones as any)?.__meta || {};
  const sectionsOrder = [
    { key: 'materiales', title: 'A.- MATERIALES' },
    { key: 'equipos', title: 'B.- EQUIPOS, MAQUINARIAS Y TRANSPORTES' },
    { key: 'manoObra', title: 'C.- MANO DE OBRA' },
    { key: 'varios', title: 'D.- VARIOS' },
  ] as const;
  // Soporte de secciones extra personalizadas
  const [formSecs, setFormSecs] = React.useState<any>({ materiales:[], equipos:[], manoObra:[], varios:[], extras: [] as Array<{ title: string; rows: any[] }>, __meta: { ...(metaInit||{}) } });
  const [sectionTitles, setSectionTitles] = React.useState<Record<string,string>>({});
  React.useEffect(()=>{
    // Normalizar claves y clonar
    const knownKeys = ['materiales','equipos','manoObra','varios'];
    const base = (secciones as any) || {};
    const norm: any = {
      materiales: Array.isArray(base.materiales) ? [...base.materiales] : [],
      equipos: Array.isArray(base.equipos) ? [...base.equipos] : [],
      manoObra: Array.isArray(base.manoObra) ? [...base.manoObra] : [],
      varios: Array.isArray(base.varios) ? [...base.varios] : [],
      __meta: { ...(base.__meta||{}) },
      extras: [] as Array<{ title:string; rows:any[] }>,
    };
    // Cargar extras si viene como arreglo [{title, rows}]
    if (Array.isArray(base.extras)) {
      norm.extras = base.extras.map((s:any)=> ({
        title: s?.title || 'SECCIÓN',
        rows: Array.isArray(s?.rows) ? [...s.rows] : [],
      }));
    } else {
      // Generar extras a partir de claves desconocidas o heredadas
      Object.keys(base)
        .filter(k => !knownKeys.includes(k) && k !== '__meta' && k !== '__titles' && k !== 'extras')
        .forEach(k => {
          const val = (base as any)[k];
          const rows = Array.isArray(val) ? [...val] : (val && Array.isArray(val.rows) ? [...val.rows] : []);
          norm.extras.push({ title: String(k).toUpperCase(), rows });
        });
    }
    // Asegurar al menos una fila vacía en cada sección al abrir el modal
    const ensureOne = (arr:any[]) => (arr && arr.length > 0 ? arr : [{ descripcion:'', unidad:'', cantidad:0, pu:0 }]);
    setFormSecs({
      materiales: ensureOne(norm.materiales),
      equipos: ensureOne(norm.equipos),
      manoObra: ensureOne(norm.manoObra),
      varios: ensureOne(norm.varios),
      __meta: { ...(norm.__meta||{}) },
      extras: (norm.extras||[]).map((s:any)=> ({ title: s.title || 'SECCIÓN', rows: ensureOne(Array.isArray(s.rows) ? s.rows : []) })),
    });
    // Títulos personalizados guardados
    const savedTitles = (secciones as any)?.__titles || {};
    setSectionTitles(savedTitles && typeof savedTitles==='object'? savedTitles : {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apu?.id, open]);
  const updRow = (key:string, idx:number, patch:any)=>{
    setFormSecs((f:any)=>{
      const rows = [...(f[key]||[])];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...f, [key]: rows };
    });
  };
  const addRow = (key:string)=> setFormSecs((f:any)=> ({ ...f, [key]: [...(f[key]||[]), { descripcion:'', unidad:'', cantidad:0, pu:0 }] }));
  const delRow = (key:string, idx:number)=> setFormSecs((f:any)=> ({ ...f, [key]: (f[key]||[]).filter((_:any,i:number)=>i!==idx) }));
  const setMeta = (patch:any)=> setFormSecs((f:any)=> ({ ...f, __meta: { ...(f.__meta||{}), ...patch } }));
  // Ops para secciones extras
  const addExtraSection = ()=>{
    const title = prompt('Nombre de la nueva sección:')?.trim();
    if(!title) return;
    setFormSecs((f:any)=> ({ ...f, extras: [ ...(f.extras||[]), { title, rows: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }] } ] }));
  };
  const updExtraRow = (secIdx:number, rowIdx:number, patch:any)=>{
    setFormSecs((f:any)=>{
      const extras = [...(f.extras||[])];
      const sec = { ...extras[secIdx] };
      const rows = [...(sec.rows||[])];
      rows[rowIdx] = { ...rows[rowIdx], ...patch };
      extras[secIdx] = { ...sec, rows };
      return { ...f, extras };
    });
  };
  const addExtraRow = (secIdx:number)=> setFormSecs((f:any)=>{
    const extras = [...(f.extras||[])];
    const sec = { ...extras[secIdx] };
    const rows = [...(sec.rows||[])];
    rows.push({ descripcion:'', unidad:'', cantidad:0, pu:0 });
    extras[secIdx] = { ...sec, rows };
    return { ...f, extras };
  });
  const delExtraRow = (secIdx:number, rowIdx:number)=> setFormSecs((f:any)=>{
    const extras = [...(f.extras||[])];
    const sec = { ...extras[secIdx] };
    const rows = [...(sec.rows||[])];
    rows.splice(rowIdx,1);
    extras[secIdx] = { ...sec, rows };
    return { ...f, extras };
  });
  const renameExtraSection = (secIdx:number)=>{
    setFormSecs((f:any)=>{
      const extras = [...(f.extras||[])];
      const cur = extras[secIdx]; if(!cur) return f;
      const name = prompt('Nuevo nombre de la sección:', cur.title || 'SECCIÓN')?.trim();
      if(!name) return f;
      extras[secIdx] = { ...cur, title: name };
      return { ...f, extras };
    });
  };
  const deleteExtraSection = (secIdx:number)=>{
    if(!confirm('¿Eliminar esta sección completa?')) return;
    setFormSecs((f:any)=>{
      const extras = [...(f.extras||[])];
      extras.splice(secIdx,1);
      return { ...f, extras };
    });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <div className="text-lg font-semibold">{apu.descripcion}</div>
            <div className="text-xs text-slate-400">Unidad salida: {apu.unidadSalida || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={()=>{
                if(!confirm('¿Borrar TODAS las secciones y dejar solo una vacía?')) return;
                const name = (prompt('Nombre de la única sección que quedará:', 'SECCIÓN')||'').trim() || 'SECCIÓN';
                setFormSecs({
                  materiales: [],
                  equipos: [],
                  manoObra: [],
                  varios: [],
                  extras: [ { title: name, rows: [{ descripcion:'', unidad:'', cantidad:0, pu:0 }] } ],
                });
                setSectionTitles({});
              }}
              className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-xs"
            >
              Borrar todas las secciones
            </button>
            <button onClick={addExtraSection} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">+ Agregar sección</button>
            <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
          </div>
        </div>
        <div className="p-4 grid gap-3 max-h-[75vh] overflow-y-auto">
          {sectionsOrder.map((s)=>{
            const rows = (formSecs as any)?.[s.key] || [];
            const subt = rows.reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            const title = sectionTitles[s.key] || s.title;
            if(!rows.length) return null; // ocultar secciones vacías
            return (
              <div key={s.key} className="bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-300 font-medium border-b border-slate-800">
                  <div>{title}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{
                      const name = prompt('Nuevo nombre de la sección:', title)?.trim();
                      if(!name) return;
                      setSectionTitles(t=> ({ ...t, [s.key]: name }));
                    }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">Renombrar</button>
                    <button onClick={()=> setFormSecs((f:any)=> ({ ...f, [s.key]: [] }))} className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-[11px]">Eliminar</button>
                    <button onClick={()=>addRow(s.key)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">+ Fila</button>
                  </div>
                </div>
                <table className="min-w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-slate-300">
                      <th className="py-1.5 px-3">Descripción</th>
                      <th className="py-1.5 px-3 w-20">Unidad</th>
                      <th className="py-1.5 px-3 w-24 text-right tabular-nums">Cantidad</th>
                      <th className="py-1.5 px-3 w-28 text-right tabular-nums">P. Unit.</th>
                      <th className="py-1.5 px-3 w-28 text-right tabular-nums">Total</th>
                      <th className="py-1.5 px-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((r:any, i:number) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={r.descripcion||''} onChange={e=>updRow(s.key, i, { descripcion: e.target.value })} /></td>
                        <td className="py-1.5 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={r.unidad||''} onChange={e=>updRow(s.key, i, { unidad: e.target.value })} /></td>
                        <td className="py-1.5 px-3 text-right tabular-nums"><input type="number" className="w-full text-right bg-slate-900 border border-slate-700 rounded px-2 py-1" value={Number(r.cantidad||0)} onChange={e=>updRow(s.key, i, { cantidad: Number(e.target.value)||0 })} /></td>
                        <td className="py-1.5 px-3 text-right tabular-nums">
                          <CurrencyInput
                            value={Number.isFinite(Number(r.pu)) ? Number(r.pu) : undefined}
                            onChange={(val)=>updRow(s.key, i, { pu: Number(val||0) })}
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(Number(r.cantidad||0) * Number(r.pu||0))}</td>
                        <td className="py-1.5 px-3 text-right"><button onClick={()=>delRow(s.key, i)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar fila" aria-label="Eliminar fila"><TrashIcon className="h-4 w-4"/></button></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900/50">
                      <td colSpan={5} className="py-2 px-3 text-right font-medium">TOTAL</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">{fmt(subt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
          {/* Secciones extra personalizadas */}
          {(formSecs.extras||[]).map((sec:any, secIdx:number)=>{
            const rows = sec.rows || [];
            const subt = rows.reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            return (
              <div key={`extra_${secIdx}`} className="bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-300 font-medium border-b border-slate-800">
                  <div>{sec.title || 'SECCIÓN'}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>renameExtraSection(secIdx)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">Renombrar</button>
                    <button onClick={()=>deleteExtraSection(secIdx)} className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-[11px]">Eliminar</button>
                    <button onClick={()=>addExtraRow(secIdx)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">+ Fila</button>
                  </div>
                </div>
                <table className="min-w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-slate-300">
                      <th className="py-1.5 px-3">Descripción</th>
                      <th className="py-1.5 px-3 w-20">Unidad</th>
                      <th className="py-1.5 px-3 w-24 text-right tabular-nums">Cantidad</th>
                      <th className="py-1.5 px-3 w-28 text-right tabular-nums">P. Unit.</th>
                      <th className="py-1.5 px-3 w-28 text-right tabular-nums">Total</th>
                      <th className="py-1.5 px-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((r:any, i:number) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={r.descripcion||''} onChange={e=>updExtraRow(secIdx, i, { descripcion: e.target.value })} /></td>
                        <td className="py-1.5 px-3"><input className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={r.unidad||''} onChange={e=>updExtraRow(secIdx, i, { unidad: e.target.value })} /></td>
                        <td className="py-1.5 px-3 text-right tabular-nums"><input type="number" className="w-full text-right bg-slate-900 border border-slate-700 rounded px-2 py-1" value={Number(r.cantidad||0)} onChange={e=>updExtraRow(secIdx, i, { cantidad: Number(e.target.value)||0 })} /></td>
                        <td className="py-1.5 px-3 text-right tabular-nums">
                          <CurrencyInput
                            value={Number.isFinite(Number(r.pu)) ? Number(r.pu) : undefined}
                            onChange={(val)=>updExtraRow(secIdx, i, { pu: Number(val||0) })}
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(Number(r.cantidad||0) * Number(r.pu||0))}</td>
                        <td className="py-1.5 px-3 text-right"><button onClick={()=>delExtraRow(secIdx, i)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar fila" aria-label="Eliminar fila"><TrashIcon className="h-4 w-4"/></button></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900/50">
                      <td colSpan={5} className="py-2 px-3 text-right font-medium">TOTAL</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">{fmt(subt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
          {(() => {
            const a = ((formSecs as any)?.materiales||[]).reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            const b = ((formSecs as any)?.equipos||[]).reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            const c = ((formSecs as any)?.manoObra||[]).reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            const d = ((formSecs as any)?.varios||[]).reduce((acc:number, r:any)=> acc + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0);
            const ext = ((formSecs as any)?.extras||[]).reduce((acc:number, s:any)=> acc + (s.rows||[]).reduce((a2:number, r:any)=> a2 + (Number(r.cantidad)||0) * (Number(r.pu)||0), 0), 0);
            const directo = a + b + c + d + ext;
            return (
              <div className="mt-1 flex items-center justify-end">
                <div className="text-sm">Costo directo unitario:&nbsp;<b>{fmt(directo)}</b></div>
              </div>
            );
          })()}
        </div>
        {/* Pie del modal: solo Observaciones */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 border-t border-slate-800">
          <div className="grid gap-3 w-full md:w-auto">
            <label className="text-sm text-slate-300 grid gap-1">
              <span>Observaciones</span>
              <textarea rows={2} value={(formSecs as any).__meta?.obs || ''} onChange={e=> setMeta({ obs: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl p-2" placeholder="Notas/observaciones del APU" />
            </label>
          </div>
          <div className="flex justify-end gap-2 w-full md:w-auto">
            <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-600">Cerrar</button>
            <button onClick={()=>onSave({ ...formSecs, __titles: sectionTitles })} className="px-3 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Guardar</button>
          </div>
        </div>
        {/* Fin pie */}
      </div>
    </div>
  );
}

// ====== Etiquetas ======
function label2D(p){
  switch(p){
    case 'rect': return 'Rectángulo';
    case 'tabique': return 'Tabique';
    case 'muro': return 'Muro';
    case 'muro_curvo': return 'Muro curvo';
    case 'pintura': return 'Pintura';
    case 'piso': return 'Piso/Cerámica';
    case 'cielo': return 'Cielo falso';
    case 'techumbre': return 'Techumbre';
    case 'fachada': return 'Revestimiento fachada';
    default: return p;
  }
}
function label3D(p){
  switch(p){
    case 'generico': return 'Genérico';
    case 'radier': return 'Radier';
    case 'losa': return 'Losa';
    case 'zanja': return 'Zanja';
    case 'relleno': return 'Relleno compactado';
    case 'zapata': return 'Zapata aislada';
    case 'zapata_corrida': return 'Zapata corrida';
    case 'viga': return 'Viga';
    case 'columna': return 'Columna';
    case 'escalera': return 'Escalera de hormigón';
    default: return p;
  }
}
function label1D(p){
  switch(p){
    case 'generico': return 'Genérico';
    case 'tuberia': return 'Tubería/trayecto';
    case 'perimetro': return 'Perímetro';
    case 'cerchas': return 'Cerchas por nave';
    case 'cumbrera': return 'Cumbrera por ml';
    default: return p;
  }
}

function labelKg(p){
  switch(p){
    case 'generico': return 'Genérico';
    case 'barras_rectas': return 'Barras rectas';
    case 'malla': return 'Malla electrosoldada';
    case 'estribos': return 'Estribos';
    default: return p;
  }
}

// ====== Componentes auxiliares ======
function Num({label, value, onChange}){
  return (
    <label className="text-sm text-slate-300 grid gap-1">
      <span>{label}</span>
      <input type="number" step={0.01} value={value}
             onChange={e=>onChange(Math.max(0, parseFloat(e.target.value)||0))}
             className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2" />
    </label>
  );
}
function Preview({value, unidad, onUse}){
  const [justUsed, setJustUsed] = useState(false);

  const handleUse = () => {
    onUse();
    setJustUsed(true);
    setTimeout(() => setJustUsed(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 h-full grid content-between">
      <div className="text-slate-300 text-sm">Resultado</div>
      <div className="text-xl font-bold">{Number(value||0).toFixed(4)} {unidad}</div>
      <button 
        onClick={handleUse} 
        className={`mt-2 px-3 py-2 rounded-xl transition-colors ${
          justUsed 
            ? 'bg-green-600 text-white' 
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        {justUsed ? '✓ Aplicado' : 'Usar en Metrados'}
      </button>
    </div>
  );
}
function Seg({on, onClick, children}){
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-xl border ${on? 'bg-slate-900 border-slate-600' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
      {children}
    </button>
  );
}
function Chk({label, checked, onChange}){
  return (
    <label className="text-sm text-slate-300 grid gap-1 items-center">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="w-5 h-5 accent-slate-500"/>
    </label>
  );
}

// ===== Modales Proyecto / Usuario =====
function Modal({open, title, children, onClose}){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ProjectModal({open, initial, onClose, onSave}){
  const [form, setForm] = useState(initial);
  useEffect(()=>{ setForm(initial); }, [initial]);
  const bind = (k) => ({
    value: form[k] ?? '',
    onChange: (e) => setForm({...form, [k]: e.target.value}),
  });
  const bindNum = (k) => ({
    value: form[k] ?? 0,
    onChange: (e) => setForm({...form, [k]: Number(e.target.value)||0}),
  });

  return (
    <Modal open={open} title="Información del Proyecto" onClose={onClose}>
      <div className="grid gap-3">
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Nombre del Proyecto *</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('nombreProyecto')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Propietario *</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('propietario')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Dirección</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('direccion')} />
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Ciudad</span>
            <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('ciudad')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Comuna</span>
            <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('comuna')} />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Fecha entrega/apertura</span>
            <input type="date" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('fecha')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Plazo de Ejecución (días)</span>
            <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bindNum('plazoDias')} />
          </label>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>% de Leyes Sociales</span>
            <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bindNum('pctLeyes')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>% IVA</span>
            <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bindNum('pctIVA')} />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-xl p-3 grid gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="ggmode" checked={form.ggMode==='separados'} onChange={()=>setForm({...form, ggMode:'separados'})} />
              GG y Utilidades separados
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-300 grid gap-1">
                <span>% Gastos Generales</span>
                <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bindNum('pctGG')} />
              </label>
              <label className="text-sm text-slate-300 grid gap-1">
                <span>% de Utilidades</span>
                <input type="number" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bindNum('pctUtil')} />
              </label>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 grid gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="ggmode" checked={form.ggMode==='agrupados'} onChange={()=>setForm({...form, ggMode:'agrupados'})} />
              GG y Utilidades agrupadas
            </label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="showgg" checked={form.mostrarGGEn==='itemizado'} onChange={()=>setForm({...form, mostrarGGEn:'itemizado'})} />
            Mostrar GG y Utilidades en Itemizado
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="showgg" checked={form.mostrarGGEn==='apu'} onChange={()=>setForm({...form, mostrarGGEn:'apu'})} />
            Mostrar GG y Utilidades en APU
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-red-500/40 text-red-300 hover:border-red-400">Cerrar</button>
          <button onClick={()=>onSave(form)} className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Grabar</button>
        </div>
      </div>
    </Modal>
  );
}

function UserModal({open, onClose, onSave}){
  const [form, setForm] = useState({ nombre:'', email:'', telefono:'', password:'', ciudad:'', tipo:'admin', profesion:'' });
  const bind = (k) => ({
    value: form[k] ?? '',
    onChange: (e) => setForm({...form, [k]: e.target.value}),
  });
  return (
    <Modal open={open} title="Creación de Usuarios" onClose={onClose}>
      <div className="grid gap-3">
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Nombre</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('nombre')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Email</span>
          <input placeholder="Será usado como NOMBRE DE USUARIO" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('email')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Telefono</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('telefono')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Password</span>
          <input type="password" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('password')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Ciudad</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('ciudad')} />
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUsuario" checked={form.tipo==='admin'} onChange={()=>setForm({...form, tipo:'admin'})} />
              Administrador
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUsuario" checked={form.tipo==='normal'} onChange={()=>setForm({...form, tipo:'normal'})} />
              Usuario normal
            </label>
          </div>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Profesión</span>
            <input placeholder="Seleccione" className="bg-slate-800 border border-slate-700 rounded-xl p-2" {...bind('profesion')} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-red-500/40 text-red-300 hover:border-red-400">Cerrar</button>
          <button onClick={()=>onSave(form)} className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Grabar</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateApuModal({open, onClose, onSave, initial}:{open:boolean; onClose:()=>void; onSave:(apu:any)=>void; initial?:any}){
  const [form, setForm] = useState<{ descripcion:string; unidadSalida:string; categoria?:string }>({ descripcion:'', unidadSalida:'m2', categoria:'' });
  useEffect(()=>{
    if(initial){
      setForm({ descripcion: initial.descripcion || '', unidadSalida: initial.unidadSalida || 'm2', categoria: initial.categoria || '' });
    } else {
      setForm({ descripcion:'', unidadSalida:'m2', categoria:'' });
    }
  }, [initial]);
  return (
    <Modal open={open} title={initial? 'Modificación APU' : 'Creación APU'} onClose={onClose}>
      <div className="grid gap-3">
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Descripción</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Unidad</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" value={form.unidadSalida} onChange={e=>setForm({...form, unidadSalida:e.target.value})} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Categoría</span>
          <input className="bg-slate-800 border border-slate-700 rounded-xl p-2" value={form.categoria||''} onChange={e=>setForm({...form, categoria:e.target.value})} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-red-500/40 text-red-300 hover:border-red-400">Cerrar</button>
          <button onClick={()=>onSave({ descripcion: form.descripcion, unidadSalida: form.unidadSalida, categoria: form.categoria||'', items: [], secciones: undefined })} className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Grabar</button>
        </div>
      </div>
    </Modal>
  );
}

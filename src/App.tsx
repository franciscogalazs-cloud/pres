import React, { useEffect, useMemo, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import BudgetTable from "./components/BudgetTable";
import GlitchText from "./components/GlitchText";
// Vista previa de logo desde el pack proporcionado (bundled por Vite)
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
  const saveLibrary = (arr:any[])=>{ try{ localStorage.setItem('apu-library', JSON.stringify(arr)); }catch{}; setCustomApus(arr); };
  const [customApus, setCustomApus] = useState<any[]>(loadLibrary);
  const allApus = useMemo(()=>[...customApus], [customApus]);
  const getApuById = (id:string)=> allApus.find(a=>a.id===id);

  // Biblioteca UI state
  const [libScope, setLibScope] = useState<'all'|'mine'>('all');
  const [libSearch, setLibSearch] = useState('');
  const [showCreateApu, setShowCreateApu] = useState(false);
  const [showEditApu, setShowEditApu] = useState(false);
  const [apuEditing, setApuEditing] = useState<any|null>(null);
  // Expansión inline para edición estilo planilla
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [expandedForm, setExpandedForm] = useState<any|null>(null);
  const isMineById = (id:string)=> !!customApus.find(a=>a.id===id);
  const toggleExpandRow = (id:string)=>{
    if(expandedId === id){ setExpandedId(null); setExpandedForm(null); return; }
    const apu = getApuById(id);
    const form = {
      descripcion: apu.descripcion || '',
      unidadSalida: apu.unidadSalida || '',
      codigoExterno: (apu as any).codigoExterno || (apu as any).codigo || '',
      secciones: (apu as any).secciones || { materiales:[{descripcion:'',unidad:'',cantidad:0,pu:0}], equipos:[{descripcion:'',unidad:'',cantidad:0,pu:0}], manoObra:[{descripcion:'',unidad:'',cantidad:0,pu:0}], varios:[{descripcion:'',unidad:'',cantidad:0,pu:0}] },
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
    const mine = isMineById(expandedId);
    if(mine){
      const next = customApus.map(x=> x.id===expandedId? { ...x, descripcion: expandedForm.descripcion, unidadSalida: expandedForm.unidadSalida, codigoExterno: expandedForm.codigoExterno, codigo: expandedForm.codigoExterno || x.codigo || 'CUST', secciones: expandedForm.secciones } : x);
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
    const withId = { ...apu, id: 'custom_'+uid(), codigo: apu.codigoExterno||'CUST', items: apu.items || [] };
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
    const next = customApus.map(x=> x.id===apuEditing.id? { ...apuEditing, ...apu, codigo: (apu.codigoExterno || (apuEditing as any).codigo || 'CUST') } : x);
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
    if(!confirm('¿Eliminar este APU?')) return; const next = customApus.filter(x=>x.id!==id); saveLibrary(next); showNotification('APU eliminado','info');
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
            <div className="flex items-center gap-3">
              <img src={logoMark} alt="Logo Presupuestos" className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg shadow-sm object-contain" />
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
              <button onClick={()=>{
                // Export CSV (simple)
                const header = ['Codigo','Descripcion','Unidad','Cantidad','Unitario','Directo'];
                const body = rows.map(r=>{
                  const ids: string[] = (r.apuIds && r.apuIds.length) ? r.apuIds : (r.apuId ? [r.apuId] : []);
                  const uc = ids.reduce((sum:number, id:string)=>{
                    try{ return sum + unitCost(getApuById(id), resources).unit; }catch{ return sum; }
                  }, 0);
                  const dir = uc * (r.metrados||0);
                  const first = ids[0] ? getApuById(ids[0]) : null;
                  return [
                    (first?.codigo || first?.codigoExterno || first?.id || (r.codigo||'')),
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

        {tab==='proyecto' && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-3">
                <h2 className="text-lg font-semibold">Información del Proyecto</h2>
                <div className="text-sm text-slate-300 grid gap-1">
                  <div><span className="text-slate-400">Nombre: </span><b>{projectInfo.nombreProyecto || '—'}</b></div>
                  <div><span className="text-slate-400">Propietario: </span>{projectInfo.propietario || '—'}</div>
                  <div><span className="text-slate-400">Ciudad/Comuna: </span>{projectInfo.ciudad || '—'}{projectInfo.comuna ? `, ${projectInfo.comuna}` : ''}</div>
                  <div><span className="text-slate-400">Dirección: </span>{projectInfo.direccion || '—'}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-slate-400">Fecha: </span>{projectInfo.fecha || '—'}</div>
                    <div><span className="text-slate-400">Plazo (días): </span>{projectInfo.plazoDias || 0}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-slate-400">% Leyes: </span>{projectInfo.pctLeyes || 0}</div>
                    <div><span className="text-slate-400">% IVA: </span>{projectInfo.pctIVA ?? 19}</div>
                    <div><span className="text-slate-400">GG/Util: </span>{projectInfo.ggMode === 'agrupados' ? 'Agrupados' : 'Separados'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-slate-400">% GG: </span>{projectInfo.pctGG ?? 0}</div>
                    <div><span className="text-slate-400">% Utilidad: </span>{projectInfo.pctUtil ?? 0}</div>
                  </div>
                  <div><span className="text-slate-400">Mostrar GG/Util en: </span>{projectInfo.mostrarGGEn === 'itemizado' ? 'Itemizado' : 'APU'}</div>
                </div>
                <div className="pt-2">
                  <button onClick={()=>setShowProjectModal(true)} className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-sm">Editar</button>
                </div>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-3">
                <h2 className="text-lg font-semibold">Usuarios</h2>
                {users.length === 0 ? (
                  <div className="text-sm text-slate-400">No hay usuarios aún.</div>
                ) : (
                  <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
                    {users.map((u, i)=> (
                      <li key={i}><b>{u.nombre}</b> · {u.email} · {u.tipo === 'admin' ? 'Administrador' : 'Usuario'}{u.profesion ? ` · ${u.profesion}` : ''}</li>
                    ))}
                  </ul>
                )}
                <div>
                  <button onClick={()=>setShowUserModal(true)} className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-sm">Crear usuario</button>
                </div>
              </div>
            </div>

            {/* Modales */}
            <ProjectModal
              open={showProjectModal}
              initial={projectInfo}
              onClose={()=>setShowProjectModal(false)}
              onSave={handleSaveProjectInfo}
            />
            <UserModal
              open={showUserModal}
              onClose={()=>setShowUserModal(false)}
              onSave={handleSaveUser}
            />
          </>
        )}

  {tab==='biblioteca' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold">Biblioteca de APUs</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={()=>setLibScope('all')} className={`px-3 py-1.5 rounded-xl text-sm ${libScope==='all'?'bg-sky-700 text-white':'bg-slate-800 hover:bg-slate-700'}`}>Ver todos los APUs</button>
                <button onClick={()=>setLibScope('mine')} className={`px-3 py-1.5 rounded-xl text-sm ${libScope==='mine'?'bg-green-700 text-white':'bg-slate-800 hover:bg-slate-700'}`}>Ver mis APUs</button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Buscar:</span>
                  <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm" />
                </div>
                <button onClick={()=>setShowCreateApu(true)} className="ml-auto px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-sm">+ Crear nuevo APU</button>
              </div>
            </div>

            <div className="mt-3 bg-slate-800 rounded-2xl p-0 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="py-2 px-3 w-16">N°</th>
                    <th className="py-2 px-3 w-28">Código</th>
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 w-24">Unidad</th>
                    <th className="py-2 px-3 w-28">P. Unitario</th>
                    <th className="py-2 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  
                  {customApus
                    .filter(a => !libSearch || a.descripcion.toLowerCase().includes(libSearch.toLowerCase()))
                    .map((a, i)=> (
                      <React.Fragment key={a.id}>
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-3">{i+1}</td>
                          <td className="py-2 px-3">{a.codigo || a.codigoExterno || 'CUST'}</td>
                          <td className="py-2 px-3">
                            <button onClick={()=>toggleExpandRow(a.id)} className="text-left hover:underline">
                              {a.descripcion}
                            </button>
                          </td>
                          <td className="py-2 px-3">{a.unidadSalida}</td>
                          <td className="py-2 px-3 text-right">{fmt(unitCost(a, resources).unit)}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={()=>toggleExpandRow(a.id)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">Ver/Editar</button>
                              <button onClick={()=>handleDeleteApu(a.id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar APU" aria-label="Eliminar APU"><TrashIcon className="h-4 w-4"/></button>
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
                                    <span>Código Externo</span>
                                    <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={expandedForm.codigoExterno||''} onChange={e=>setExpandedForm((f:any)=>({...f, codigoExterno:e.target.value}))} />
                                  </label>
                                </div>
                                <div className="flex items-center justify-end">
                                  <div className="flex items-center gap-2">
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
                                    <button onClick={addFormExtraSection} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">+ Agregar sección</button>
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
                                            <button onClick={()=>{
                                              const name = (prompt('Nuevo nombre de la sección:', curTitle)||'').trim();
                                              if(!name) return;
                                              setExpandedForm((f:any)=>{
                                                const titles = { ...((f.secciones||{}).__titles||{}) };
                                                titles[sec.key] = name;
                                                return { ...f, secciones: { ...(f.secciones||{}), __titles: titles } };
                                              });
                                            }} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">Renombrar</button>
                                            <button onClick={()=>{
                                              setExpandedForm((f:any)=> ({ ...f, secciones: { ...(f.secciones||{}), [sec.key]: [] } }));
                                            }} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Eliminar sección" aria-label="Eliminar sección"><TrashIcon className="h-4 w-4"/></button>
                                            <button onClick={()=>addFormSecRow(sec.key)} className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs">+ Fila</button>
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
                                                    <td className="py-2 px-3"><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right" value={r.pu} onChange={e=>updateFormSecRow(sec.key, i, {pu: Number(e.target.value)||0})} /></td>
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
                                                    <td className="py-2 px-3"><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right" value={Number(r.pu||0)} onChange={e=>updateFormExtraRow(secIdx, i, {pu: Number(e.target.value)||0})} /></td>
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
                                  const a2 = (expandedForm.secciones?.materiales||[]).reduce((acc:number,r:any)=>acc + (Number(r.cantidad)||0)*(Number(r.pu)||0),0);
                                  const b2 = (expandedForm.secciones?.equipos||[]).reduce((acc:number,r:any)=>acc + (Number(r.cantidad)||0)*(Number(r.pu)||0),0);
                                  const c2 = (expandedForm.secciones?.manoObra||[]).reduce((acc:number,r:any)=>acc + (Number(r.cantidad)||0)*(Number(r.pu)||0),0);
                                    const d2 = (expandedForm.secciones?.varios||[]).reduce((acc:number,r:any)=>acc + (Number(r.cantidad)||0)*(Number(r.pu)||0),0);
                                    const ext2 = (expandedForm.secciones?.extras||[]).reduce((acc:number, s:any)=> acc + (Array.isArray(s.rows)? s.rows : []).reduce((a3:number, r:any)=> a3 + (Number(r.cantidad)||0)*(Number(r.pu)||0), 0), 0);
                                    const directo = a2+b2+c2+d2+ext2;
                                  return (
                                    <div className="grid gap-2">
                                      <div className="text-right text-base font-semibold">COSTO DIRECTO UNITARIO: <b>{fmt(directo)}</b></div>
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
                  <button onClick={addExampleEmptyApu} className="px-3 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 text-sm">Ejemplo (APU vacío)</button>
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
                                    try{ const apu = getApuById(id); const un = apu.unidadSalida || 'GL'; const qty = r.metrados||0; const pu = unitCost(apu, resources).unit; const tot = pu * qty; return (
                                      <tr key={id} className="border-t border-slate-700">
                                        <td className="px-2 py-1">{i+1}</td>
                                        <td className="px-2 py-1">APU</td>
                                        <td className="px-2 py-1 text-center">{un}</td>
                                        <td className="px-2 py-1 text-center">{qty.toFixed(1)}</td>
                                        <td className="px-2 py-1 text-right">{fmt(pu)}</td>
                                        <td className="px-2 py-1 text-right">{fmt(tot)}</td>
                                      </tr>
                                    ); }catch{return null;}
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <button onClick={()=>delRow(r.id)} className="ml-3 p-1 h-8 w-8 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700/40" title="Eliminar partida" aria-label="Eliminar partida"><TrashIcon className="h-5 w-5"/></button>
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
                    <th className="py-2 px-3 w-28">Código</th>
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 w-24">Unidad</th>
                    <th className="py-2 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a:any)=> (
                    <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="py-2 px-3">{a.codigo || a.codigoExterno || 'CUST'}</td>
                      <td className="py-2 px-3">{a.descripcion}</td>
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
  const sectionsOrder = [
    { key: 'materiales', title: 'A.- MATERIALES' },
    { key: 'equipos', title: 'B.- EQUIPOS, MAQUINARIAS Y TRANSPORTES' },
    { key: 'manoObra', title: 'C.- MANO DE OBRA' },
    { key: 'varios', title: 'D.- VARIOS' },
  ] as const;
  // Soporte de secciones extra personalizadas
  const [formSecs, setFormSecs] = React.useState<any>({ materiales:[], equipos:[], manoObra:[], varios:[], extras: [] as Array<{ title: string; rows: any[] }> });
  const [sectionTitles, setSectionTitles] = React.useState<Record<string,string>>({});
  React.useEffect(()=>{
    // Normalizar claves y clonar
    const knownKeys = ['materiales','equipos','manoObra','varios'];
    const norm = {
      materiales: [...((secciones as any)?.materiales||[])],
      equipos: [...((secciones as any)?.equipos||[])],
      manoObra: [...((secciones as any)?.manoObra||[])],
      varios: [...((secciones as any)?.varios||[])],
      // Intentar recuperar extras si existen en el objeto de entrada
      extras: Array.isArray((secciones as any)?.extras) ? [ ...((secciones as any).extras) ] : Object.keys(secciones || {})
        .filter(k => !knownKeys.includes(k))
        .map(k => ({ title: String(k).toUpperCase(), rows: [...((secciones as any)?.[k]||[])] })),
    } as any;
    // Asegurar al menos una fila vacía en cada sección al abrir el modal
    const ensureOne = (arr:any[]) => (arr && arr.length > 0 ? arr : [{ descripcion:'', unidad:'', cantidad:0, pu:0 }]);
    setFormSecs({
      materiales: ensureOne(norm.materiales),
      equipos: ensureOne(norm.equipos),
      manoObra: ensureOne(norm.manoObra),
      varios: ensureOne(norm.varios),
      extras: (norm.extras||[]).map((s:any)=> ({ title: s.title || 'SECCIÓN', rows: ensureOne(s.rows||[]) })),
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
                        <td className="py-1.5 px-3 text-right tabular-nums"><input type="number" className="w-full text-right bg-slate-900 border border-slate-700 rounded px-2 py-1" value={Number(r.pu||0)} onChange={e=>updRow(s.key, i, { pu: Number(e.target.value)||0 })} /></td>
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
                        <td className="py-1.5 px-3 text-right tabular-nums"><input type="number" className="w-full text-right bg-slate-900 border border-slate-700 rounded px-2 py-1" value={Number(r.pu||0)} onChange={e=>updExtraRow(secIdx, i, { pu: Number(e.target.value)||0 })} /></td>
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
        <div className="flex justify-end gap-2 p-4 border-t border-slate-800">
          <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-600">Cerrar</button>
          <button onClick={()=>onSave({ ...formSecs, __titles: sectionTitles })} className="px-3 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Guardar</button>
        </div>
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
  const [form, setForm] = useState<{ descripcion:string; unidadSalida:string }>({ descripcion:'', unidadSalida:'m2' });
  useEffect(()=>{
    if(initial){
      setForm({ descripcion: initial.descripcion || '', unidadSalida: initial.unidadSalida || 'm2' });
    } else {
      setForm({ descripcion:'', unidadSalida:'m2' });
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
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-red-500/40 text-red-300 hover:border-red-400">Cerrar</button>
          <button onClick={()=>onSave({ descripcion: form.descripcion, unidadSalida: form.unidadSalida, items: [], codigoExterno: '', secciones: undefined })} className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white">Grabar</button>
        </div>
      </div>
    </Modal>
  );
}

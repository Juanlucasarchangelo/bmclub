export const spaces = [
  { id: 'cinema', name: 'Cinema 165”', type: 'Cinema', capacity: 12, description: 'Experiência audiovisual premium com tela de 165 polegadas e som imersivo.' },
  { id: 'reuniao', name: 'Sala de Reunião', type: 'Reunião', capacity: 6, description: 'Ambiente executivo para reuniões, apresentações e encontros reservados.' },
  { id: 'ht1', name: 'Home Theater 1', type: 'Home Theater', capacity: 6, description: 'Sala dedicada para cinema, música e demonstrações.' },
  { id: 'ht2', name: 'Home Theater 2', type: 'Home Theater', capacity: 6, description: 'Home theater exclusivo com experiência audiovisual de referência.' },
  { id: 'stereo1', name: 'Sala Estéreo 1', type: 'Estéreo', capacity: 4, description: 'Audição crítica e experiências musicais em sistema estéreo.' },
  { id: 'stereo2', name: 'Sala Estéreo 2', type: 'Estéreo', capacity: 4, description: 'Espaço intimista dedicado à alta fidelidade.' },
  { id: 'ambiente', name: 'Som Ambiente', type: 'Lounge', capacity: 20, description: 'Área social para experiências, encontros e demonstrações.' },
];

export const reservations = [
  { id:'R-1048', space:'Cinema 165”', date:'09 OUT', weekday:'SEX', time:'19:30 — 22:00', guests:8, status:'CONFIRMADA' },
  { id:'R-1051', space:'Sala de Reunião', date:'14 OUT', weekday:'QUA', time:'10:00 — 11:30', guests:5, status:'CONFIRMADA' },
  { id:'R-1058', space:'Sala Estéreo 1', date:'22 OUT', weekday:'QUI', time:'16:00 — 17:00', guests:2, status:'PENDENTE' },
];

export const events = [
  { id:'E-201', day:'16', month:'OUT', title:'Master Class — Alta Fidelidade', room:'Sala Estéreo 1', time:'19:30', seats:'8 vagas', category:'MASTER CLASS', description:'Uma noite dedicada à música e à alta fidelidade com audição comentada.' },
  { id:'E-202', day:'23', month:'OUT', title:'Cinema Experience', room:'Cinema 165”', time:'20:00', seats:'4 vagas', category:'EXPERIÊNCIA', description:'Sessão exclusiva BMClub com apresentação do sistema e conteúdo selecionado.' },
  { id:'E-203', day:'29', month:'OUT', title:'Business Connection', room:'Sala de Reunião', time:'18:30', seats:'6 vagas', category:'NETWORKING', description:'Encontro reservado para membros e empresas do ecossistema BMClub.' },
];

// Sidebar + topbar shared chrome

function StatusChip({ status }) {
  const map = {
    aberto: { cls: 'chip-aberto', label: 'Aberto' },
    agendado: { cls: 'chip-agendado', label: 'Agendado' },
    solucionado: { cls: 'chip-solucionado', label: 'Solucionado' },
  };
  const s = map[status] || map.aberto;
  return <span className={`chip ${s.cls}`}><span className="dot"/>{s.label}</span>;
}

function Sidebar({ route, tickets, onNav, open, onClose }) {
  const counts = {
    all: tickets.length,
    aberto: tickets.filter(t => t.status === 'aberto').length,
    agendado: tickets.filter(t => t.status === 'agendado').length,
    solucionado: tickets.filter(t => t.status === 'solucionado').length,
  };
  const onClick = (r) => { onNav(r); onClose && onClose(); };
  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose}/>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo-mark">AS</div>
          <div className="brand-text">
            <div className="t1">Sala Arthur Saboya</div>
            <div className="t2">Atendimento • Pré‑projeto</div>
          </div>
        </div>

        <button className={`nav-item ${route.name === 'list' ? 'active' : ''}`} onClick={() => onClick({ name: 'list', filter: 'all' })}>
          <Icons.Inbox size={17}/> Todos os pedidos
          <span className="count">{counts.all}</span>
        </button>
        <button className={`nav-item ${route.name === 'list' && route.filter === 'aberto' ? 'active' : ''}`} onClick={() => onClick({ name: 'list', filter: 'aberto' })}>
          <span style={{width: 17, display:'grid', placeItems:'center'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#5CC9BD'}}/></span>
          Abertos
          <span className="count">{counts.aberto}</span>
        </button>
        <button className={`nav-item ${route.name === 'list' && route.filter === 'agendado' ? 'active' : ''}`} onClick={() => onClick({ name: 'list', filter: 'agendado' })}>
          <span style={{width: 17, display:'grid', placeItems:'center'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#E56E14'}}/></span>
          Agendados
          <span className="count">{counts.agendado}</span>
        </button>
        <button className={`nav-item ${route.name === 'list' && route.filter === 'solucionado' ? 'active' : ''}`} onClick={() => onClick({ name: 'list', filter: 'solucionado' })}>
          <span style={{width: 17, display:'grid', placeItems:'center'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#D1EBE8'}}/></span>
          Solucionados
          <span className="count">{counts.solucionado}</span>
        </button>

        <div className="section-label">Ações</div>
        <button className={`nav-item ${route.name === 'new' ? 'active' : ''}`} onClick={() => onClick({ name: 'new' })}>
          <Icons.Plus size={17}/> Novo chamado
        </button>
        <button className="nav-item" onClick={() => onClick({ name: 'list', filter: 'all' })}>
          <Icons.Calendar size={17}/> Agenda
        </button>

        <div className="user-card">
          <div className="avatar">AS</div>
          <div style={{minWidth:0, flex:1}}>
            <div className="name">Arthur Saboya</div>
            <div className="role">Atendente · Saboya</div>
          </div>
          <Icons.Settings size={15}/>
        </div>
      </aside>
    </>
  );
}

function Topbar({ crumbs, actions, onToggleMenu }) {
  return (
    <div className="topbar">
      <button className="mobile-menu-btn" onClick={onToggleMenu} aria-label="Menu">
        <Icons.Menu size={18}/>
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icons.Chevron size={14}/>}
            {c.onClick ? (
              <button className="link" onClick={c.onClick} style={{padding:0}}>{c.label}</button>
            ) : (
              <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, StatusChip });

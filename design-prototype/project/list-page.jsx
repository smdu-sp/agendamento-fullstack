// List page — all tickets with filters + search

function ListPage({ tickets, route, onOpen, onNav }) {
  const [search, setSearch] = React.useState('');
  const filter = route.filter || 'all';

  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.id.toLowerCase().includes(q)
      || t.assunto.toLowerCase().includes(q)
      || t.municipe.toLowerCase().includes(q)
      || t.natureza.toLowerCase().includes(q);
  });

  const counts = {
    all: tickets.length,
    aberto: tickets.filter(t => t.status === 'aberto').length,
    agendado: tickets.filter(t => t.status === 'agendado').length,
    solucionado: tickets.filter(t => t.status === 'solucionado').length,
  };

  return (
    <div className="page">
      <div className="page-head" style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
        <div>
          <h1>Pedidos de pré‑projeto</h1>
          <p>Chamados recebidos na Sala Arthur Saboya — oriente, agende ou solucione.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNav({ name: 'new' })}>
          <Icons.Plus size={15}/> Novo chamado
        </button>
      </div>

      <div className="list-stats">
        <div className="stat accent-navy">
          <div className="label">Total</div>
          <div className="value">{counts.all}</div>
          <div className="trend">Todos os chamados registrados</div>
        </div>
        <div className="stat accent-teal">
          <div className="label">Abertos</div>
          <div className="value">{counts.aberto}</div>
          <div className="trend">Aguardando primeira resposta</div>
        </div>
        <div className="stat accent-orange">
          <div className="label">Agendados</div>
          <div className="value">{counts.agendado}</div>
          <div className="trend">Na coordenadoria</div>
        </div>
        <div className="stat accent-peach">
          <div className="label">Solucionados</div>
          <div className="value">{counts.solucionado}</div>
          <div className="trend">Encerrados na sala</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Icons.Search size={16}/>
          <input className="input" placeholder="Buscar por ID, munícipe, assunto…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="filter-tabs">
          {[
            { k: 'all', label: 'Todos' },
            { k: 'aberto', label: 'Abertos' },
            { k: 'agendado', label: 'Agendados' },
            { k: 'solucionado', label: 'Solucionados' },
          ].map(f => (
            <button key={f.k}
              className={`filter-tab ${filter === f.k ? 'active' : ''}`}
              onClick={() => onNav({ name: 'list', filter: f.k })}>
              {f.label}<span className="badge">{counts[f.k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <table className="ticket-table">
          <thead>
            <tr>
              <th style={{width: 140}}>Protocolo</th>
              <th>Assunto</th>
              <th style={{width: 180}}>Munícipe</th>
              <th style={{width: 150}}>Natureza</th>
              <th style={{width: 130}}>Status</th>
              <th style={{width: 150}}>Abertura</th>
              <th style={{width: 40}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} onClick={() => onOpen(t.id)}>
                <td><span className="ticket-id">{t.id}</span></td>
                <td>
                  <div className="ticket-subject">{t.assunto}</div>
                  <div className="ticket-sub">{t.endereco}</div>
                </td>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div className="avatar" style={{width:28, height:28, fontSize:11, background:'var(--peach)'}}>
                      {t.municipe.split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                    <div>
                      <div style={{fontWeight:500}}>{t.municipe}</div>
                      <div style={{fontSize:11.5, color:'var(--ink-500)'}}>{t.formacao}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip chip-soft">{t.natureza}</span></td>
                <td><StatusChip status={t.status}/></td>
                <td style={{color:'var(--ink-500)', fontSize:12.5}}>{t.abertura}</td>
                <td style={{color:'var(--ink-400)'}}><Icons.Chevron size={16}/></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{textAlign:'center', padding:'40px', color:'var(--ink-500)'}}>
                Nenhum chamado encontrado para os filtros atuais.
              </td></tr>
            )}
          </tbody>
        </table>

        <div className="ticket-cards" style={{padding: 10}}>
          {filtered.map(t => (
            <div key={t.id} className="ticket-card" onClick={() => onOpen(t.id)}>
              <div className="ticket-card-row">
                <div>
                  <div className="ticket-id">{t.id}</div>
                  <div className="ticket-subject" style={{marginTop:2}}>{t.assunto}</div>
                </div>
                <StatusChip status={t.status}/>
              </div>
              <div className="ticket-card-meta">
                <span><strong>{t.municipe}</strong> · {t.formacao}</span>
                <span>{t.natureza}</span>
                <span>{t.abertura}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{textAlign:'center', padding:'30px', color:'var(--ink-500)'}}>Nenhum chamado encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}

window.ListPage = ListPage;

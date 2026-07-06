// Main app — routing + state

const { useState, useEffect } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "orange",
  "density": "comfortable",
  "sidebar": "left"
}/*EDITMODE-END*/;

function App() {
  const [route, setRoute] = useState(() => {
    try {
      const saved = localStorage.getItem('saboya-route');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: 'list', filter: 'all' };
  });
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useState(DEFAULTS);

  useEffect(() => { localStorage.setItem('saboya-route', JSON.stringify(route)); }, [route]);

  // Tweaks protocol
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const accents = {
      orange: '#E56E14',
      navy: '#0A328D',
      teal: '#5CC9BD',
      peach: '#EDBA94',
    };
    document.documentElement.style.setProperty('--orange', accents[tweaks.accent] || accents.orange);
  }, [tweaks.accent]);

  const showToast = (msg, kind = '') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  };

  const openTicket = (id) => setRoute({ name: 'detail', id });

  const updateTicket = (id, fn) => {
    setTickets(ts => ts.map(t => t.id === id ? fn(t) : t));
  };

  const addMessage = (id, msg) => updateTicket(id, t => ({ ...t, mensagens: [...t.mensagens, msg] }));

  const onReply = (id, text, imgs) => {
    const now = new Date();
    const hora = now.toLocaleDateString('pt-BR') + ' ' + now.toTimeString().slice(0,5);
    addMessage(id, {
      autor: 'Arthur Saboya',
      hora,
      texto: text || '(anexos)',
      outgoing: true,
      images: imgs,
    });
    showToast('Resposta enviada ao munícipe', 'success');
  };

  const onMarkSolved = (id) => {
    const now = new Date();
    const hora = now.toLocaleDateString('pt-BR') + ' ' + now.toTimeString().slice(0,5);
    updateTicket(id, t => ({
      ...t,
      status: 'solucionado',
      mensagens: [...t.mensagens, {
        autor: 'sistema', hora,
        texto: 'Chamado marcado como solucionado por Arthur Saboya.',
        system: true,
      }],
    }));
    showToast('Chamado marcado como solucionado', 'success');
  };

  const onSendCoord = (id) => {
    const now = new Date();
    const hora = now.toLocaleDateString('pt-BR') + ' ' + now.toTimeString().slice(0,5);
    updateTicket(id, t => ({
      ...t,
      status: 'agendado',
      mensagens: [...t.mensagens, {
        autor: 'sistema', hora,
        texto: 'Chamado enviado à coordenadoria para agendamento.',
        system: true,
      }],
    }));
    showToast('Enviado à coordenadoria', 'success');
  };

  const onCreate = (form) => {
    const id = 'PP-' + Math.random().toString(16).slice(2, 10).toUpperCase();
    const now = new Date();
    const hora = now.toLocaleDateString('pt-BR') + ' às ' + now.toTimeString().slice(0,5);
    const novo = {
      id,
      assunto: form.assunto,
      status: 'aberto',
      municipe: form.municipe,
      email: form.email,
      formacao: form.formacao,
      natureza: form.natureza,
      abertura: hora,
      atendente: 'Arthur Saboya',
      endereco: form.endereco || '—',
      resumo: form.descricao.slice(0, 140),
      mensagens: [
        { autor: form.municipe, hora, texto: form.descricao, outgoing: false, images: form.attachments },
      ],
    };
    setTickets(ts => [novo, ...ts]);
    setRoute({ name: 'detail', id });
    showToast('Chamado criado com sucesso', 'success');
  };

  const ticket = route.name === 'detail' ? tickets.find(t => t.id === route.id) : null;

  const crumbs = [
    { label: 'Sala Arthur Saboya', onClick: () => setRoute({ name: 'list', filter: 'all' }) },
    ...(route.name === 'list' ? [{ label: 'Pedidos' }] : []),
    ...(route.name === 'detail' ? [
      { label: 'Pedidos', onClick: () => setRoute({ name: 'list', filter: 'all' }) },
      { label: ticket ? ticket.id : 'Chamado' },
    ] : []),
    ...(route.name === 'new' ? [
      { label: 'Pedidos', onClick: () => setRoute({ name: 'list', filter: 'all' }) },
      { label: 'Novo chamado' },
    ] : []),
  ];

  const topActions = (
    <>
      <button className="btn btn-ghost btn-sm btn-icon-only" aria-label="Notificações">
        <Icons.Bell size={15}/>
      </button>
      {route.name !== 'new' && (
        <button className="btn btn-primary btn-sm" onClick={() => setRoute({ name: 'new' })}>
          <Icons.Plus size={14}/> <span className="tx">Novo chamado</span>
        </button>
      )}
    </>
  );

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  return (
    <div className="app" style={{ flexDirection: tweaks.sidebar === 'right' ? 'row-reverse' : 'row' }}>
      <Sidebar route={route} tickets={tickets} onNav={setRoute} open={menuOpen} onClose={() => setMenuOpen(false)}/>
      <div className="main">
        <Topbar crumbs={crumbs} actions={topActions} onToggleMenu={() => setMenuOpen(m => !m)}/>
        {route.name === 'list' && <ListPage tickets={tickets} route={route} onOpen={openTicket} onNav={setRoute}/>}
        {route.name === 'new' && <NewPage onCreate={onCreate} onBack={() => setRoute({ name: 'list', filter: 'all' })}/>}
        {route.name === 'detail' && ticket && (
          <DetailPage ticket={ticket}
            onBack={() => setRoute({ name: 'list', filter: 'all' })}
            onMarkSolved={onMarkSolved}
            onSendCoord={onSendCoord}
            onReply={onReply}
          />
        )}
        {route.name === 'detail' && !ticket && (
          <div className="page"><div className="card card-pad">Chamado não encontrado.</div></div>
        )}
      </div>

      {toast && <div className={`toast ${toast.kind}`}>
        <Icons.CheckCircle size={14}/> {toast.msg}
      </div>}

      {tweaksOpen && (
        <div className="tweaks">
          <div className="tweaks-head">
            Tweaks
            <button onClick={() => setTweaksOpen(false)} style={{color:'#fff'}}>
              <Icons.Close size={14}/>
            </button>
          </div>
          <div className="tweaks-body">
            <div className="tweak-row">
              <div className="label">Cor de destaque</div>
              <div className="tweak-options">
                {['orange','navy','teal','peach'].map(a => (
                  <button key={a} className={`tweak-opt ${tweaks.accent === a ? 'active' : ''}`} onClick={() => setTweak('accent', a)}>
                    {a === 'orange' ? 'Laranja' : a === 'navy' ? 'Azul' : a === 'teal' ? 'Verde-água' : 'Pêssego'}
                  </button>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <div className="label">Menu lateral</div>
              <div className="tweak-options">
                <button className={`tweak-opt ${tweaks.sidebar === 'left' ? 'active' : ''}`} onClick={() => setTweak('sidebar', 'left')}>Esquerda</button>
                <button className={`tweak-opt ${tweaks.sidebar === 'right' ? 'active' : ''}`} onClick={() => setTweak('sidebar', 'right')}>Direita</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

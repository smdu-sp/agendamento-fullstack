// Detail page — individual ticket view

function DetailPage({ ticket, onBack, onMarkSolved, onSendCoord, onReply, onAddNote }) {
  const [text, setText] = React.useState('');
  const [attachments, setAttachments] = React.useState([]);
  const [confirmModal, setConfirmModal] = React.useState(null);
  const fileRef = React.useRef(null);
  const timelineRef = React.useRef(null);

  React.useEffect(() => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [ticket.mensagens.length]);

  const handleFiles = (files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 4);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ url: e.target.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(imgs => setAttachments(a => [...a, ...imgs].slice(0, 4)));
  };

  const send = () => {
    if (!text.trim() && attachments.length === 0) return;
    onReply(ticket.id, text.trim(), attachments);
    setText(''); setAttachments([]);
  };

  const isSolved = ticket.status === 'solucionado';
  const isScheduled = ticket.status === 'agendado';

  return (
    <>
      <div className="page">
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap'}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <Icons.ArrowLeft size={14}/> Lista de pedidos
          </button>
          <span className="ticket-id" style={{fontSize:13}}>{ticket.id}</span>
          <StatusChip status={ticket.status}/>
          <div style={{marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" disabled={isSolved} onClick={() => setConfirmModal('solve')}>
              <Icons.CheckCircle size={14}/> <span className="tx">Marcar solucionado</span>
            </button>
            <button className="btn btn-accent btn-sm" disabled={isScheduled || isSolved} onClick={() => setConfirmModal('coord')}>
              <Icons.Send size={14}/> <span className="tx">Enviar à coordenadoria</span>
            </button>
          </div>
        </div>

        <div className="page-head">
          <h1>{ticket.assunto}</h1>
          <p>{ticket.resumo}</p>
        </div>

        <div className="detail-grid">
          <div className="card card-pad" style={{position:'sticky', top:80}}>
            <div className="requester-head">
              <div className="avatar" style={{background:'var(--peach)', color:'var(--navy)'}}>
                {ticket.municipe.split(' ').map(n=>n[0]).slice(0,2).join('')}
              </div>
              <div style={{minWidth:0}}>
                <div className="n">{ticket.municipe}</div>
                <div className="e" style={{display:'flex', alignItems:'center', gap:5}}>
                  <Icons.Mail size={11}/> {ticket.email}
                </div>
              </div>
            </div>
            <div className="info-list">
              <div className="info-item">
                <div className="label">Protocolo</div>
                <div className="value mono">{ticket.id}</div>
              </div>
              <div className="info-item">
                <div className="label">Abertura</div>
                <div className="value">{ticket.abertura}</div>
              </div>
              <div className="info-item">
                <div className="label">Formação</div>
                <div className="value">{ticket.formacao}</div>
              </div>
              <div className="info-item">
                <div className="label">Natureza</div>
                <div className="value">{ticket.natureza}</div>
              </div>
              <div className="info-item">
                <div className="label">Endereço do imóvel</div>
                <div className="value" style={{display:'flex', gap:6, alignItems:'flex-start'}}>
                  <Icons.MapPin size={13} style={{color:'var(--ink-400)', marginTop:2, flexShrink:0}}/>
                  {ticket.endereco}
                </div>
              </div>
              <div className="info-item">
                <div className="label">Atendente</div>
                <div className="value">{ticket.atendente}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{display:'flex', flexDirection:'column'}}>
            <div className="card-head">
              <div>
                <h3>Linha do tempo</h3>
                <div className="sub">Histórico completo do chamado — respostas, anexos e alterações de status.</div>
              </div>
              <div style={{marginLeft:'auto', fontSize:12, color:'var(--ink-500)'}}>{ticket.mensagens.length} interações</div>
            </div>

            <div className="timeline" ref={timelineRef}>
              {ticket.mensagens.map((m, i) => (
                m.system ? (
                  <div key={i} className="event">
                    <span className="line"/>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      <Icons.CheckCircle size={12}/> {m.texto} · {m.hora}
                    </span>
                    <span className="line"/>
                  </div>
                ) : (
                  <div key={i} className={`msg ${m.outgoing ? 'outgoing' : ''}`}>
                    <div className="avatar">
                      {m.autor.split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                    <div className="msg-body">
                      <div className="msg-meta">
                        <strong>{m.autor}</strong>
                        <span>·</span>
                        <span>{m.hora}</span>
                      </div>
                      <div className="msg-bubble">{m.texto}</div>
                      {m.anexos && m.anexos.length > 0 && (
                        <div className="msg-attachments">
                          {m.anexos.map((a, j) => (
                            <div key={j} className="msg-attach" style={{
                              background: `repeating-linear-gradient(45deg, var(--peach-50), var(--peach-50) 8px, #fff 8px, #fff 16px)`
                            }}>
                              <div className="label">croqui-esquina-{j+1}.jpg</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.images && m.images.length > 0 && (
                        <div className="msg-attachments">
                          {m.images.map((img, j) => (
                            <div key={j} className="msg-attach" style={{backgroundImage:`url(${img.url})`}}>
                              <div className="label">{img.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>

            {!isSolved ? (
              <div className="composer">
                <textarea className="textarea"
                  placeholder="Escreva a resposta ao munícipe (registrada no chamado)…"
                  value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(); }}
                />
                {attachments.length > 0 && (
                  <div className="composer-attachments" style={{marginTop:10}}>
                    {attachments.map((a, i) => (
                      <div key={i} className="attach-preview" style={{backgroundImage:`url(${a.url})`}}>
                        <button onClick={() => setAttachments(arr => arr.filter((_,j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="composer-row">
                  <div style={{display:'flex', gap:6, alignItems:'center', color:'var(--ink-500)', fontSize:12}}>
                    <button className="btn btn-subtle btn-sm" onClick={() => fileRef.current?.click()}>
                      <Icons.Image size={13}/> Anexar imagem
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden
                      onChange={e => handleFiles(e.target.files)}/>
                    <span style={{marginLeft:8}}>Ctrl/⌘+Enter para enviar</span>
                  </div>
                  <button className="btn btn-accent" onClick={send} disabled={!text.trim() && attachments.length === 0}>
                    <Icons.Send size={14}/> Enviar resposta
                  </button>
                </div>
              </div>
            ) : (
              <div style={{padding:'20px', borderTop:'1px solid var(--border)', background:'var(--teal-50)', display:'flex', alignItems:'center', gap:12}}>
                <Icons.CheckCircle size={18} style={{color:'#0f8578'}}/>
                <div style={{flex:1, fontSize:13, color:'#0f6b62'}}>
                  Este chamado foi marcado como <strong>solucionado</strong>. Para novas dúvidas o munícipe deve abrir um novo pedido.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmModal === 'solve' && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Marcar como solucionado?</h3>
            <p>O chamado {ticket.id} será encerrado na Sala Arthur Saboya. O munícipe receberá notificação por e-mail.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={() => { onMarkSolved(ticket.id); setConfirmModal(null); }}>
                <Icons.Check size={14}/> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal === 'coord' && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Enviar à coordenadoria?</h3>
            <p>O caso será encaminhado para agendamento de reunião técnica. O status muda para <strong>Agendado</strong> e o munícipe é notificado.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn btn-accent" onClick={() => { onSendCoord(ticket.id); setConfirmModal(null); }}>
                <Icons.Send size={14}/> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.DetailPage = DetailPage;

// New ticket page

function NewPage({ onCreate, onBack }) {
  const [form, setForm] = React.useState({
    municipe: '',
    email: '',
    formacao: '',
    natureza: '',
    endereco: '',
    assunto: '',
    descricao: '',
  });
  const [attachments, setAttachments] = React.useState([]);
  const fileRef = React.useRef(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFiles = (files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 4);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ url: e.target.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(imgs => setAttachments(a => [...a, ...imgs].slice(0, 4)));
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const valid = form.municipe && form.email && form.formacao && form.natureza && form.assunto && form.descricao;

  const submit = () => {
    if (!valid) return;
    onCreate({ ...form, attachments });
  };

  const getStep = () => {
    if (form.municipe && form.email && form.formacao) {
      if (form.assunto && form.descricao) return 3;
      return 2;
    }
    return 1;
  };
  const step = getStep();

  return (
    <div className="page">
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icons.ArrowLeft size={14}/> Voltar
        </button>
      </div>

      <div className="page-head">
        <h1>Novo chamado</h1>
        <p>Registre uma dúvida de pré‑projeto trazida pelo munícipe à Sala Arthur Saboya.</p>
      </div>

      <div className="new-form-grid">
        <div>
          <div className="card card-pad form-section">
            <h3 style={{margin:'0 0 4px', fontSize:14}}>Dados do munícipe</h3>
            <p style={{margin:'0 0 18px', color:'var(--ink-500)', fontSize:12.5}}>Identificação do solicitante.</p>

            <div className="form-row">
              <div className="field">
                <label className="field-label">Nome completo *</label>
                <input className="input" placeholder="Ex.: João Silva" value={form.municipe} onChange={set('municipe')}/>
              </div>
              <div className="field">
                <label className="field-label">E-mail *</label>
                <input className="input" type="email" placeholder="joao@exemplo.com" value={form.email} onChange={set('email')}/>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">Formação *</label>
                <select className="select" value={form.formacao} onChange={set('formacao')}>
                  <option value="">Selecione…</option>
                  {FORMACOES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Natureza do pedido *</label>
                <select className="select" value={form.natureza} onChange={set('natureza')}>
                  <option value="">Selecione…</option>
                  {NATUREZAS.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Endereço do imóvel</label>
              <input className="input" placeholder="Rua, número, bairro" value={form.endereco} onChange={set('endereco')}/>
              <div className="field-hint">Opcional — ajuda a identificar zoneamento.</div>
            </div>
          </div>

          <div className="card card-pad form-section">
            <h3 style={{margin:'0 0 4px', fontSize:14}}>Detalhes do pedido</h3>
            <p style={{margin:'0 0 18px', color:'var(--ink-500)', fontSize:12.5}}>Descreva a dúvida de forma clara para o atendente.</p>

            <div className="field">
              <label className="field-label">Assunto *</label>
              <input className="input" placeholder="Ex.: Dúvida sobre recuo frontal em lote de esquina" value={form.assunto} onChange={set('assunto')}/>
            </div>
            <div className="field">
              <label className="field-label">Descrição detalhada *</label>
              <textarea className="textarea" style={{minHeight:120}}
                placeholder="Explique a situação, o imóvel e o que precisa ser esclarecido…"
                value={form.descricao} onChange={set('descricao')}/>
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Anexos (somente imagens)</label>
              <div className="dropzone"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}>
                <div className="icon"><Icons.Upload size={18}/></div>
                <div className="title">Arraste imagens ou clique para selecionar</div>
                <div className="sub">PNG ou JPG até 4 arquivos · croquis, fotos, plantas</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)}/>
              {attachments.length > 0 && (
                <div className="composer-attachments" style={{marginTop:12}}>
                  {attachments.map((a, i) => (
                    <div key={i} className="attach-preview" style={{width:72, height:72, backgroundImage:`url(${a.url})`}}>
                      <button onClick={() => setAttachments(arr => arr.filter((_,j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20}}>
            <button className="btn btn-ghost" onClick={onBack}>Cancelar</button>
            <button className="btn btn-primary btn-lg" onClick={submit} disabled={!valid}>
              <Icons.Check size={15}/> Registrar chamado
            </button>
          </div>
        </div>

        <div>
          <div className="card card-pad" style={{position:'sticky', top:80}}>
            <h3 style={{margin:'0 0 4px', fontSize:14}}>Passos</h3>
            <p style={{margin:'0 0 18px', color:'var(--ink-500)', fontSize:12.5}}>Acompanhe o preenchimento.</p>

            <div className="step-list">
              <div className={`step ${step > 1 ? 'done' : 'active'}`}>
                <div className="num">{step > 1 ? <Icons.Check size={11}/> : '1'}</div>
                <div>
                  Identificar munícipe
                  <div className="desc">Nome, e-mail, formação, natureza.</div>
                </div>
              </div>
              <div className={`step ${step === 2 ? 'active' : (step > 2 ? 'done' : '')}`}>
                <div className="num">{step > 2 ? <Icons.Check size={11}/> : '2'}</div>
                <div>
                  Descrever a dúvida
                  <div className="desc">Assunto, descrição e anexos opcionais.</div>
                </div>
              </div>
              <div className={`step ${step === 3 ? 'active' : ''}`}>
                <div className="num">3</div>
                <div>
                  Registrar e atender
                  <div className="desc">Chamado é criado com status Aberto e fica disponível para resposta imediata do técnico.</div>
                </div>
              </div>
            </div>

            <div style={{marginTop:20, padding:12, background:'var(--peach-50)', borderRadius:10, fontSize:12, color:'#7a3a08', display:'flex', gap:8}}>
              <Icons.Info size={14} style={{flexShrink:0, marginTop:2}}/>
              <div>
                Se a dúvida exigir análise técnica mais profunda, após registrar use <strong>Enviar à coordenadoria</strong> para agendamento de reunião.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.NewPage = NewPage;

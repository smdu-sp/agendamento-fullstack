"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { enviarEmailPreview } from "@/services/email/client-functions/preview-send";

// ─── Template builder (espelha o backend) ────────────────────────────────────

type EventoEmailTipo =
  | "cadastro"
  | "novo-chamado"
  | "nova-mensagem"
  | "agendamento-confirmado"
  | "tecnico-atribuido"
  | "cancelamento"
  | "chamado-encerrado"
  | "redefinicao-senha";

const CORES: Record<EventoEmailTipo, string> = {
  "cadastro": "#16A34A",
  "novo-chamado": "#0A3299",
  "nova-mensagem": "#D97706",
  "agendamento-confirmado": "#EA580C",
  "tecnico-atribuido": "#4F46E5",
  "cancelamento": "#DC2626",
  "chamado-encerrado": "#0F766E",
  "redefinicao-senha": "#4B5563",
};

interface ListaItem { label: string; valor: string }
interface BotaoCta { texto: string; url: string }

function buildEmailHtml(opts: {
  evento: EventoEmailTipo;
  titulo: string;
  saudacao: string;
  paragrafos: string[];
  lista?: ListaItem[];
  botao?: BotaoCta;
}): string {
  const cor = CORES[opts.evento];

  const listaHtml = opts.lista?.length
    ? `<ul style="padding:0 0 0 20px;margin:16px 0;">
        ${opts.lista
          .map(
            (i) =>
              `<li style="margin-bottom:6px;color:#374151;font-size:15px;"><strong>${i.label}:</strong> ${i.valor}</li>`,
          )
          .join("")}
      </ul>`
    : "";

  const botaoHtml = opts.botao
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${opts.botao.url}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;padding:12px 28px;background:${cor};color:#ffffff;
                  text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          ${opts.botao.texto}
        </a>
      </div>`
    : "";

  const paragrafosHtml = opts.paragrafos
    .map((p) => `<p style="margin:0 0 12px;color:#374151;font-size:15px;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#0A3299;padding:20px 32px;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:0.3px;">Portal de Agendamentos</p>
            <p style="margin:4px 0 0;color:#93C5FD;font-size:12px;">SMUL — Prefeitura de São Paulo</p>
          </td>
        </tr>
        <tr><td style="background:${cor};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:bold;">${opts.titulo}</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">${opts.saudacao}</p>
            ${paragrafosHtml}
            ${listaHtml}
            ${botaoHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E4E4E7;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
              Este é um e-mail automático. Por favor, não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Dados de exemplo por template ───────────────────────────────────────────

interface TemplateDefinition {
  id: string;
  evento: EventoEmailTipo;
  label: string;
  assunto: string;
  para: string;
  bcc: boolean;
  html: string;
}

const MOCK_FROM = "SMUL - Saboya Atendimento <saboya_atendimento@PREFEITURA.SP.GOV.BR>";
const MOCK_BCC  = "saboya_atendimento@PREFEITURA.SP.GOV.BR";
const BASE_URL  = "https://smulweb.prefeitura.sp.gov.br/agendamento";

const TEMPLATES: TemplateDefinition[] = [
  {
    id: "cadastro",
    evento: "cadastro",
    label: "Cadastro confirmado",
    assunto: "Cadastro confirmado — Portal de Agendamentos",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "cadastro",
      titulo: "Cadastro realizado com sucesso!",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Seu cadastro no Portal de Agendamentos foi realizado com sucesso.",
        "Agora você pode acessar sua conta e submeter solicitações de pré-projeto para análise da Sala Arthur Saboya.",
      ],
      botao: { texto: "Enviar solicitação de pré-projeto", url: `${BASE_URL}/pre-projetos` },
    }),
  },
  {
    id: "novo-chamado",
    evento: "novo-chamado",
    label: "Novo chamado de pré-projeto",
    assunto: "Solicitação recebida — AS-202604001",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "novo-chamado",
      titulo: "Sua solicitação foi recebida",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Recebemos sua solicitação de pré-projeto com o protocolo <strong>AS-202604001</strong>.",
        "Nossa equipe irá analisar o chamado e entrará em contato em breve.",
        "Você pode acompanhar o andamento pelo portal a qualquer momento.",
      ],
      botao: { texto: "Acompanhar minha solicitação", url: `${BASE_URL}/portal/consulta` },
    }),
  },
  {
    id: "nova-mensagem",
    evento: "nova-mensagem",
    label: "Nova mensagem na solicitação",
    assunto: "Nova mensagem — AS-202604001",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "nova-mensagem",
      titulo: "Nova mensagem em sua solicitação",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Há uma nova mensagem na sua solicitação <strong>AS-202604001</strong>.",
        "Acesse o portal para visualizar e responder.",
      ],
      botao: { texto: "Ver mensagem", url: `${BASE_URL}/portal/consulta/abc-123-uuid` },
    }),
  },
  {
    id: "agendamento-confirmado",
    evento: "agendamento-confirmado",
    label: "Agendamento confirmado (munícipe)",
    assunto: "Atendimento agendado — AS-202604001",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "agendamento-confirmado",
      titulo: "Atendimento agendado",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Seu atendimento referente ao protocolo <strong>AS-202604001</strong> foi agendado.",
      ],
      lista: [
        { label: "Protocolo", valor: "AS-202604001" },
        { label: "Data e hora", valor: "15/05/2026 às 14h00" },
      ],
      botao: { texto: "Ver detalhes", url: `${BASE_URL}/portal/consulta/abc-123-uuid` },
    }),
  },
  {
    id: "tecnico-atribuido",
    evento: "tecnico-atribuido",
    label: "Técnico atribuído (Arthur Saboya)",
    assunto: "Atendimento atribuído — AS-202604001",
    para: "tecnico.responsavel@prefeitura.sp.gov.br",
    bcc: true,
    html: buildEmailHtml({
      evento: "tecnico-atribuido",
      titulo: "Novo atendimento atribuído a você",
      saudacao: "Olá, Maria Souza.",
      paragrafos: ["Você foi designada como técnica responsável pelo seguinte atendimento:"],
      lista: [
        { label: "Protocolo", valor: "AS-202604001" },
        { label: "Munícipe", valor: "João Silva" },
        { label: "Data e hora", valor: "15/05/2026 às 14h00" },
      ],
    }),
  },
  {
    id: "cancelamento",
    evento: "cancelamento",
    label: "Cancelamento de atendimento",
    assunto: "[Arthur Saboya] Cancelamento de atendimento — AS-202604001",
    para: "saboya_atendimento@PREFEITURA.SP.GOV.BR",
    bcc: true,
    html: buildEmailHtml({
      evento: "cancelamento",
      titulo: "Cancelamento de atendimento",
      saudacao: "O munícipe solicitou o cancelamento do atendimento agendado.",
      paragrafos: [],
      lista: [
        { label: "Protocolo", valor: "AS-202604001" },
        { label: "Munícipe", valor: "João Silva" },
        { label: "E-mail do munícipe", valor: "joao.silva@exemplo.com" },
        { label: "Data/hora agendada", valor: "15/05/2026 às 14h00" },
      ],
    }),
  },
  {
    id: "chamado-encerrado-municipe",
    evento: "chamado-encerrado",
    label: "Chamado encerrado (pelo munícipe)",
    assunto: "Chamado encerrado — AS-202604001",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "chamado-encerrado",
      titulo: "Chamado encerrado",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Seu chamado <strong>AS-202604001</strong> foi encerrado conforme sua confirmação de resolução.",
        "Caso precise de novo atendimento, você pode abrir uma nova solicitação no portal.",
      ],
      botao: { texto: "Ver histórico do chamado", url: `${BASE_URL}/portal/consulta/abc-123-uuid` },
    }),
  },
  {
    id: "chamado-encerrado-equipe",
    evento: "chamado-encerrado",
    label: "Chamado encerrado (pela equipe)",
    assunto: "Chamado encerrado — AS-202604001",
    para: "joao.silva@exemplo.com",
    bcc: true,
    html: buildEmailHtml({
      evento: "chamado-encerrado",
      titulo: "Chamado encerrado",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Seu chamado <strong>AS-202604001</strong> foi encerrado pela equipe da Sala Arthur Saboya.",
        "Se necessário, você pode abrir uma nova solicitação no portal.",
      ],
      botao: { texto: "Ver histórico do chamado", url: `${BASE_URL}/portal/consulta/abc-123-uuid` },
    }),
  },
  {
    id: "redefinicao-senha",
    evento: "redefinicao-senha",
    label: "Redefinição de senha",
    assunto: "Redefinição de senha — Portal de Agendamentos",
    para: "joao.silva@exemplo.com",
    bcc: false,
    html: buildEmailHtml({
      evento: "redefinicao-senha",
      titulo: "Redefinição de senha",
      saudacao: "Olá, João Silva.",
      paragrafos: [
        "Recebemos uma solicitação para redefinir a senha da sua conta.",
        "Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>30 minutos</strong>.",
        "Se você não fez esta solicitação, ignore este e-mail — sua senha permanece inalterada.",
      ],
      botao: {
        texto: "Redefinir minha senha",
        url: `${BASE_URL}/portal/redefinir-senha?token=abc123xyz`,
      },
    }),
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmailPreviewClient() {
  const { data: session } = useSession();
  const [selected, setSelected] = useState<string>("cadastro");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const template = TEMPLATES.find((t) => t.id === selected)!;

  async function handleEnviar() {
    const email = destinatario.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!session?.access_token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setEnviando(true);
    const result = await enviarEmailPreview({
      para: email,
      assunto: template.assunto,
      html: template.html,
      access_token: session.access_token,
    });
    setEnviando(false);

    if (result.ok) {
      toast.success(`E-mail de teste enviado para ${email}.`);
      setDialogOpen(false);
      setDestinatario("");
    } else {
      toast.error(result.error ?? "Não foi possível enviar o e-mail.");
    }
  }

  return (
    <>
      <div className="flex gap-4 min-h-[calc(100dvh-14rem)]">
        {/* Lista lateral */}
        <aside className="w-60 shrink-0">
          <ScrollArea className="h-full rounded-lg border bg-white">
            <nav className="p-2 space-y-0.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    selected === t.id
                      ? "bg-[#0A3299]/8 text-[#0A3299] font-semibold"
                      : "text-[#374151] hover:bg-[#F4F4F5]"
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: CORES[t.evento] }}
                  />
                  <span className="leading-snug">{t.label}</span>
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Painel principal */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Metadados + botão enviar */}
          <div className="rounded-lg border bg-white px-5 py-4 text-sm space-y-1.5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <MetaRow label="De" value={MOCK_FROM} />
                <MetaRow label="Para" value={template.para} />
                <MetaRow label="Assunto" value={template.assunto} />
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[#94A3B8] font-medium">BCC</span>
                  {template.bcc ? (
                    <>
                      <span className="text-[#0F172A]">{MOCK_BCC}</span>
                      <Badge className="ml-1 h-5 bg-green-100 text-green-700 border-green-200 text-[11px]">
                        ativado
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="outline" className="h-5 text-[11px] text-[#94A3B8]">
                      desativado
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Send className="h-4 w-4" />
                Enviar como teste
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 rounded-lg border overflow-hidden bg-white">
            <iframe
              key={selected}
              srcDoc={template.html}
              className="w-full h-full min-h-[520px]"
              sandbox="allow-same-origin"
              title={`Preview: ${template.label}`}
            />
          </div>
        </div>
      </div>

      {/* Dialog de envio */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setDestinatario(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar e-mail de teste</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Será enviado o modelo{" "}
              <span className="font-medium text-foreground">&ldquo;{template.label}&rdquo;</span> com
              assunto <span className="font-medium text-foreground">[TESTE]</span> para o
              endereço abaixo.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="dest-email" className="text-sm font-medium">
                Endereço de e-mail
              </label>
              <Input
                id="dest-email"
                type="email"
                placeholder="voce@exemplo.com"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !enviando && handleEnviar()}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando} className="gap-2">
              <Send className="h-4 w-4" />
              {enviando ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-14 shrink-0 text-[#94A3B8] font-medium">{label}</span>
      <span className="text-[#0F172A] break-all">{value}</span>
    </div>
  );
}

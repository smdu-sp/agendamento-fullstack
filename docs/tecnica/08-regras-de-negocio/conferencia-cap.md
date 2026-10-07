# Conferência CAP

Fontes: [services/agendamentos/server-functions/conferencia-cap.ts](../../../services/agendamentos/server-functions/conferencia-cap.ts), [lib/conferencia-cap-acesso.ts](../../../lib/conferencia-cap-acesso.ts), tela [lista-conferencia-cap.tsx](../../../app/(rotas-auth)/conferencia-cap/_components/lista-conferencia-cap.tsx).

## Objetivo

Triar as solicitações do portal que não puderam ser roteadas automaticamente: processo não localizado no BI ou unidade não mapeada (ver [portal-processos-e-bi.md](portal-processos-e-bi.md)).

## Quem acessa ✅

ADM e DEV, ou PONTO_FOCAL/COORDENADOR lotados em uma divisão cuja coordenadoria tem sigla **`CAP`** (constante `SIGLA_COORDENADORIA_CAP`).

## Fila ✅

São listados os agendamentos com `origemPortalProcesso = true`, `conferenciaCapStatus = AGUARDANDO` e `status = SOLICITADO`, do mais antigo para o mais novo. Esses agendamentos ficam fora da lista geral e do dashboard até serem analisados.

## Ações ✅

| Ação | Entrada | Efeito |
|---|---|---|
| **Encaminhar** | Coordenadoria ativa (obrigatória), divisão ativa da mesma coordenadoria (opcional), número do processo corrigido (opcional) | Grava coordenadoria e divisão, `conferenciaCapStatus = ENCAMINHADO`, resumo "Encaminhado pela CAP à coordenadoria {sigla}." e evento `ENCAMINHADO_CAP`. O status continua `SOLICITADO`; a coordenadoria segue o fluxo normal |
| **Recusar** (processo não localizado) | Mensagem ao munícipe com no mínimo 5 caracteres | `status = CANCELADO`, `conferenciaCapStatus = NAO_ENCONTRADO`; a mensagem é gravada em `observacaoCap` e `motivoCancelamento`, e o munícipe a vê no portal. Evento `CANCELADO` com `origem: CAP` |

As duas ações só funcionam se o agendamento ainda estiver `AGUARDANDO` e `SOLICITADO`. Se outra pessoa já analisou: "Esta solicitação já foi analisada."

/** @format */

import type {
  IMensagemPreProjetoArthurSaboya,
  ISolicitacaoPreProjetoArthurSaboyaDetalhe,
} from "@/types/solicitacao-pre-projeto-arthur-saboya";

/**
 * Lista de mensagens para o chat: em fluxo normal a 1ª mensagem do munícipe já traz o texto da dúvida;
 * se não houver histórico (dados antigos), sintetiza uma bolha a partir do campo `duvida`.
 */
export function mensagensPreProjetoParaChat(
  chamado: ISolicitacaoPreProjetoArthurSaboyaDetalhe,
): IMensagemPreProjetoArthurSaboya[] {
  const lista = chamado.mensagens ?? [];
  if (lista.length > 0) return lista;
  const corpo = chamado.duvida?.trim();
  if (!corpo) return [];
  return [
    {
      id: "__duvida_solicitacao__",
      autor: "MUNICIPE",
      corpo,
      criadoEm: chamado.criadoEm,
      nomeRemetente: chamado.nome,
    },
  ];
}
